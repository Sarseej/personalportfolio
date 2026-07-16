"""
SAE training and analysis for the toy transformer.
Collects activations, trains SAE, analyzes features, exports for browser.
"""

import os
import sys
import json
import time
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from model import build_model
from data import generate_batch, get_batch_metadata


class SparseAutoencoder(nn.Module):
    def __init__(self, d_model, d_dict):
        super().__init__()
        self.encoder = nn.Linear(d_model, d_dict)
        self.decoder = nn.Linear(d_dict, d_model, bias=False)
        self.decoder.weight.data.normal_(0, 1 / np.sqrt(d_dict))

    def forward(self, x):
        features = F.relu(self.encoder(x))
        x_recon = self.decoder(features)
        return x_recon, features


def collect_activations(model, n_sequences=2000, seq_len=50, vocab_size=20,
                        batch_size=64, device="cpu"):
    """Collect residual stream activations + metadata for SAE training.

    Returns activations [N, d_model] and metadata dict with:
        in_pattern: [N] float — 1.0 if position is in 2nd pattern occurrence
        positions: [N] int — sequence position
        pattern_starts: [N] int — start of 2nd pattern occurrence
        token_ids: [N] int — original token ID at each position
    """
    all_acts = []
    all_in_pattern = []
    all_positions = []
    all_pattern_starts = []
    all_token_ids = []

    n_collected = 0
    with torch.no_grad():
        while n_collected < n_sequences:
            cur_batch = min(batch_size, n_sequences - n_collected)
            tokens = generate_batch(cur_batch, seq_len, vocab_size, device)
            metadata = get_batch_metadata(cur_batch, tokens)

            _, cache = model.run_with_cache(tokens)
            acts = cache["blocks.1.hook_resid_post"]

            for b in range(cur_batch):
                seq_len_b = tokens.shape[1]
                info = metadata[b]
                repeat_positions = set(info["repeat_positions"])
                pat_start = info["pattern_start2"]

                for pos in range(seq_len_b):
                    all_acts.append(acts[b, pos].cpu())
                    all_in_pattern.append(1.0 if pos in repeat_positions else 0.0)
                    all_positions.append(pos)
                    all_pattern_starts.append(pat_start)
                    all_token_ids.append(tokens[b, pos].item())

            n_collected += cur_batch
            if n_collected % 200 < batch_size:
                print(f"  [{n_collected}/{n_sequences} seqs] "
                      f"{len(all_acts)} samples collected...")

    activations = torch.stack(all_acts)
    print(f"  Done: {activations.shape[0]} samples in {activations.shape[1]}d")

    return activations, {
        "in_pattern": torch.tensor(all_in_pattern),
        "positions": torch.tensor(all_positions),
        "pattern_starts": torch.tensor(all_pattern_starts),
        "token_ids": torch.tensor(all_token_ids),
    }


def analyze_feature(feature_idx, feature_vals, meta, top_k=200):
    """Analyze a single SAE feature."""
    n = feature_vals.shape[0]
    active_mask = feature_vals > 0
    rate = active_mask.float().mean().item()

    if rate < 0.0005 or active_mask.sum() < 50:
        return None

    # Top activating positions
    _, top_idx = feature_vals.topk(min(top_k, active_mask.sum().item()))
    top_idx = top_idx.numpy()

    bg_in_pattern = meta["in_pattern"].mean().item()
    fg_in_pattern = meta["in_pattern"][top_idx].mean().item()
    in_pattern_lift = fg_in_pattern - bg_in_pattern

    # Token identity
    top_tokens = meta["token_ids"][top_idx]
    bg_token_rate = 1.0 / 20  # uniform
    token_counts = torch.bincount(top_tokens, minlength=20).float()
    best_tok = token_counts.argmax().item()
    fg_token_rate = token_counts[best_tok].item() / len(top_idx)

    # Position
    fg_pos_mean = meta["positions"][top_idx].float().mean().item()
    bg_pos_mean = meta["positions"].float().mean().item()

    # Near pattern start
    top_pat_start = meta["pattern_starts"][top_idx].numpy()
    near_start = float(np.mean(np.abs(top_pat_start.astype(int) -
                                       meta["positions"][top_idx].numpy()) < 5))

    return {
        "feature": feature_idx,
        "rate": rate,
        "in_pattern_fg": fg_in_pattern,
        "in_pattern_bg": bg_in_pattern,
        "in_pattern_lift": in_pattern_lift,
        "best_token": best_tok,
        "token_fg_rate": fg_token_rate,
        "token_bg_rate": bg_token_rate,
        "token_lift": fg_token_rate - bg_token_rate,
        "position_mean": fg_pos_mean,
        "position_bg": bg_pos_mean,
        "near_start": near_start,
    }


def main():
    device = "cuda" if torch.cuda.is_available() else (
        "mps" if torch.backends.mps.is_available() else "cpu"
    )
    print(f"Device: {device}")

    ckpt_dir = os.path.join(os.path.dirname(__file__), "checkpoints")

    tl_model = build_model(d_vocab=20, device=device)
    tl_model.load_state_dict(torch.load(
        os.path.join(ckpt_dir, "model_tl.pt"), map_location=device, weights_only=True
    ))
    tl_model.eval()

    # Collect activations
    print("\n=== Collecting activations ===")
    activations, meta = collect_activations(
        tl_model, n_sequences=2000, seq_len=50, vocab_size=20,
        batch_size=64, device=device
    )

    # Train SAE
    d_model = 128
    d_dict = 512
    l1_coeff = 3e-3
    n_val = 10000
    n_epochs = 300
    batch_size = 256
    lr = 1e-3

    n_total = activations.shape[0]
    perm = torch.randperm(n_total)
    train_acts = activations[perm[:n_total - n_val]].to(device)
    val_acts = activations[perm[n_total - n_val:]].to(device)

    model = SparseAutoencoder(d_model, d_dict).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    print(f"\n=== Training SAE: {d_model} -> {d_dict} ({d_dict/d_model:.1f}x) ===")
    print(f"  L1={l1_coeff}, epochs={n_epochs}, batch={batch_size}, lr={lr}")

    best_val_mse = float("inf")
    best_state = None
    patience = 0

    for epoch in range(1, n_epochs + 1):
        model.train()
        perm = torch.randperm(train_acts.shape[0])
        for s in range(0, train_acts.shape[0], batch_size):
            batch = train_acts[perm[s:s + batch_size]]
            x_recon, features = model(batch)
            loss = F.mse_loss(x_recon, batch) + l1_coeff * features.abs().mean()
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        if epoch % 10 == 0 or epoch == 1:
            model.eval()
            with torch.no_grad():
                vmse_sum, nl = 0, 0
                for s in range(0, val_acts.shape[0], batch_size):
                    b = val_acts[s:s + batch_size]
                    xr, _ = model(b)
                    vmse_sum += F.mse_loss(xr, b).item()
                    nl += 1
                vmse = vmse_sum / nl
                if vmse < best_val_mse:
                    best_val_mse = vmse
                    best_state = {k: v.clone() for k, v in model.state_dict().items()}
                    patience = 0
                else:
                    patience += 1
            if epoch % 100 == 0:
                print(f"  Epoch {epoch}: val_mse={vmse:.6f}")
            if patience >= 60:
                print(f"  Early stop at epoch {epoch}")
                break

    model.load_state_dict(best_state)
    model.eval()

    # Final stats
    with torch.no_grad():
        all_f = []
        for s in range(0, activations.shape[0], 10000):
            b = activations[s:s + 10000].to(device)
            _, f = model(b)
            all_f.append(f.cpu())
        all_features = torch.cat(all_f, dim=0)

    final_l0 = (all_features > 0).float().sum(dim=1).mean().item()
    rates = (all_features > 0).float().mean(dim=0)
    n_dead = int((rates < 0.0001).sum().item())

    print(f"\nFinal: MSE={best_val_mse:.6f}, L0={final_l0:.1f}/{d_dict}, "
          f"dead={n_dead}/{d_dict} ({n_dead/d_dict*100:.0f}%)")

    # Interpretability
    print(f"\n=== Interpretability ===")
    interp = []
    for fi in range(d_dict):
        result = analyze_feature(fi, all_features[:, fi], meta)
        if result is not None:
            interp.append(result)

    interp.sort(key=lambda x: abs(x["in_pattern_lift"]) + abs(x["token_lift"]),
                reverse=True)

    in_pat = [r for r in interp if r["in_pattern_lift"] > 0.05]
    print(f"  Active features: {len(interp)}")
    print(f"  In-pattern preferring (lift>0.05): {len(in_pat)}")

    print(f"\n  Top 20 features by combined lift:")
    print(f"  {'#':>3} {'Feat':>5} {'Rate':>6} {'InPat':>6} {'Tok':>4} {'TokLift':>8} {'PatLift':>8}")
    for i, f in enumerate(interp[:20]):
        kind = f"P{f['best_token']}" if f["token_lift"] > 0.1 else f"tok_{f['best_token']}"
        print(f"  {i+1:>3} {f['feature']:>5} {f['rate']:>6.3f} "
              f"{f['in_pattern_fg']:>6.3f} {kind:>4} "
              f"{f['token_lift']:>+8.3f} {f['in_pattern_lift']:>+8.3f}")

    # Export SAE weights
    print(f"\n=== Exporting ===")
    sae_export = {
        "d_model": d_model,
        "d_dict": d_dict,
        "encoder_weight": model.encoder.weight.data.cpu().numpy().tolist(),
        "encoder_bias": model.encoder.bias.data.cpu().numpy().tolist(),
        "decoder_weight": model.decoder.weight.data.cpu().numpy().tolist(),
    }
    with open(os.path.join(ckpt_dir, "sae.json"), "w") as f:
        json.dump(sae_export, f)
    sz = os.path.getsize(os.path.join(ckpt_dir, "sae.json"))
    print(f"  sae.json: {sz/1e6:.1f} MB")

    # Export top feature summaries for UI
    top20 = interp[:20]
    ui_features = []
    for f in top20:
        label = "in_pattern" if f["in_pattern_lift"] > f["token_lift"] else f"token_{f['best_token']}"
        ui_features.append({
            "id": f["feature"],
            "label": label,
            "lift": round(f["in_pattern_lift"] if "in_pattern" in label else f["token_lift"], 4),
            "rate": round(f["rate"], 4),
        })
    with open(os.path.join(ckpt_dir, "sae_features.json"), "w") as f:
        json.dump(ui_features, f, indent=2)

    print(f"\n{'='*60}")
    print(f"SAE COMPLETE")
    print(f"  {d_model} -> {d_dict} ({d_dict/d_model:.1f}x)")
    print(f"  MSE: {best_val_mse:.6f}")
    print(f"  L0: {final_l0:.1f}/{d_dict}")
    print(f"  Dead: {n_dead}/{d_dict}")
    print(f"  Interpretable: {len(interp)} features")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
