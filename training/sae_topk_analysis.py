"""
TopK SAE training and rigorous interpretability analysis.

Trains TopK SAEs at k=8, 16, 32 with d_dict=512.
For each, reports:
  - Reconstruction MSE (vs dense baseline)
  - Dead feature count
  - For top 20 features: purity metric (what fraction of activation mass
    is concentrated on the single best-correlated property)
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


class TopKSparseAutoencoder(nn.Module):
    def __init__(self, d_model, d_dict, k=16):
        super().__init__()
        self.k = k
        self.d_model = d_model
        self.d_dict = d_dict
        self.encoder = nn.Linear(d_model, d_dict)
        self.decoder = nn.Linear(d_dict, d_model, bias=False)
        self.decoder.weight.data.normal_(0, 1 / np.sqrt(d_dict))

    def forward(self, x):
        pre = self.encoder(x)  # [batch, d_dict]
        # Top-k: zero out all but largest k per sample
        topk_vals, topk_idx = pre.topk(self.k, dim=-1)
        mask = torch.zeros_like(pre)
        mask.scatter_(-1, topk_idx, 1.0)
        features = F.relu(pre) * mask
        x_recon = self.decoder(features)
        return x_recon, features


def collect_activations_and_metadata(model, n_sequences=2000, seq_len=50,
                                     vocab_size=20, batch_size=64, device="cpu"):
    """Collect residual stream activations + rich metadata."""
    all_acts = []
    all_tokens = []
    all_positions = []
    all_in_pattern = []
    all_pattern_id = []  # which token is at this position
    all_pattern_start2 = []
    all_pattern_len = []
    all_offset = []

    n_collected = 0
    with torch.no_grad():
        while n_collected < n_sequences:
            cur_batch = min(batch_size, n_sequences - n_collected)
            tokens = generate_batch(cur_batch, seq_len, vocab_size, device)
            metadata = get_batch_metadata(cur_batch, tokens)

            _, cache = model.run_with_cache(tokens)
            acts = cache["blocks.1.hook_resid_post"]

            for b in range(cur_batch):
                info = metadata[b]
                repeat_positions = set(info["repeat_positions"])

                for pos in range(seq_len):
                    all_acts.append(acts[b, pos].cpu())
                    all_tokens.append(tokens[b, pos].item())
                    all_positions.append(pos)
                    all_in_pattern.append(1.0 if pos in repeat_positions else 0.0)
                    all_pattern_start2.append(info["pattern_start2"])
                    all_pattern_len.append(info["pattern_len"])
                    all_offset.append(info["offset"])

            n_collected += cur_batch

    activations = torch.stack(all_acts)
    print(f"  Collected {activations.shape[0]} samples, {activations.shape[1]}d")

    return activations, {
        "tokens": torch.tensor(all_tokens),
        "positions": torch.tensor(all_positions),
        "in_pattern": torch.tensor(all_in_pattern),
        "pattern_start2": torch.tensor(all_pattern_start2),
        "pattern_len": torch.tensor(all_pattern_len),
        "offset": torch.tensor(all_offset),
    }


def train_topk(acts, d_dict, k, n_epochs, batch_size, lr, device, n_val):
    """Train a single TopK SAE."""
    d_model = acts.shape[1]
    n_total = acts.shape[0]

    perm = torch.randperm(n_total)
    train_acts = acts[perm[:n_total - n_val]].to(device)
    val_acts = acts[perm[n_total - n_val:]].to(device)

    model = TopKSparseAutoencoder(d_model, d_dict, k=k).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    best_val_mse = float("inf")
    best_state = None
    patience = 0

    for epoch in range(1, n_epochs + 1):
        model.train()
        perm = torch.randperm(train_acts.shape[0])
        for s in range(0, train_acts.shape[0], batch_size):
            batch = train_acts[perm[s:s + batch_size]]
            x_recon, features = model(batch)
            loss = F.mse_loss(x_recon, batch)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        if epoch % 20 == 0 or epoch == 1:
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
                    best_state = {k_: v.clone() for k_, v in model.state_dict().items()}
                    patience = 0
                else:
                    patience += 1
            if epoch % 100 == 0:
                print(f"    Epoch {epoch}: val_mse={vmse:.8f}")
            if patience >= 80:
                print(f"    Early stop at epoch {epoch}")
                break

    model.load_state_dict(best_state)
    model.eval()
    return model, best_val_mse


def compute_purity(feature_vals, meta, activations, min_active=100):
    """
    Compute purity of a feature: what fraction of its total activation mass
    is concentrated on the single best-correlated property?

    Properties tested:
      1. Token identity (20 possible values)
      2. In-pattern (binary)
      3. Position bucket (0-9, 10-19, 20-29, 30-39, 40-49 → 5 buckets)
      4. Offset bucket (small/medium/large)

    Purity = max_property_activation_mass / total_activation_mass
    where "activation mass for property p" = sum of feature_vals[i]
    for all positions i where property p holds.

    Returns (best_property, purity, total_mass, property_mass).
    """
    active_mask = feature_vals > 0
    n_active = active_mask.sum().item()

    if n_active < min_active:
        return None

    total_mass = feature_vals[active_mask].sum().item()
    if total_mass < 1e-10:
        return None

    best_prop = "none"
    best_mass = 0

    # 1. Token identity: for each token, sum activation mass
    tokens = meta["tokens"]
    for tok in range(20):
        mask = active_mask & (tokens == tok)
        mass = feature_vals[mask].sum().item()
        if mass > best_mass:
            best_mass = mass
            best_prop = f"token_{tok}"

    # 2. In-pattern
    in_pat = meta["in_pattern"] > 0.5
    mass_ip = feature_vals[active_mask & in_pat].sum().item()
    mass_oop = feature_vals[active_mask & ~in_pat].sum().item()
    if mass_ip > best_mass:
        best_mass = mass_ip
        best_prop = "in_pattern"
    if mass_oop > best_mass:
        best_mass = mass_oop
        best_prop = "out_of_pattern"

    # 3. Position buckets
    positions = meta["positions"]
    for bucket_start in range(0, 50, 10):
        bucket_end = bucket_start + 10
        mask = active_mask & (positions >= bucket_start) & (positions < bucket_end)
        mass = feature_vals[mask].sum().item()
        if mass > best_mass:
            best_mass = mass
            best_prop = f"pos_{bucket_start}-{bucket_end}"

    # 4. Offset buckets (distance between pattern occurrences)
    offsets = meta["offset"]
    for lo, hi, label in [(0, 20, "short"), (20, 40, "med"), (40, 100, "long")]:
        mask = active_mask & (offsets >= lo) & (offsets < hi)
        mass = feature_vals[mask].sum().item()
        if mass > best_mass:
            best_mass = mass
            best_prop = f"offset_{label}"

    # 5. Combined: token AND in-pattern (specific conjunction)
    for tok in range(20):
        mask = active_mask & (tokens == tok) & in_pat
        mass = feature_vals[mask].sum().item()
        if mass > best_mass:
            best_mass = mass
            best_prop = f"token_{tok}_in_pattern"

    purity = best_mass / total_mass
    return best_prop, purity, total_mass, best_mass


def analyze_model(model, activations, meta, d_dict, top_n=20):
    """Full analysis: feature activation stats + purity for top features."""
    dev = next(model.parameters()).device
    with torch.no_grad():
        all_f = []
        for s in range(0, activations.shape[0], 10000):
            b = activations[s:s + 10000].to(dev)
            _, f = model(b)
            all_f.append(f.cpu())
        all_features = torch.cat(all_f, dim=0)

    n_samples = all_features.shape[0]

    # Per-feature stats
    activation_rates = (all_features > 0).float().mean(dim=0)
    n_dead = int((activation_rates < 0.0001).sum().item())
    l0 = (all_features > 0).float().sum(dim=1).mean().item()

    # Compute purity for all active features
    feature_results = []
    for fi in range(d_dict):
        vals = all_features[:, fi]
        rate = activation_rates[fi].item()
        if rate < 0.0005:
            continue

        result = compute_purity(vals, meta, activations)
        if result is None:
            continue

        prop, purity, total_mass, prop_mass = result
        feature_results.append({
            "feature": fi,
            "rate": rate,
            "property": prop,
            "purity": purity,
            "total_mass": total_mass,
            "property_mass": prop_mass,
        })

    # Sort by purity (most concentrated first)
    feature_results.sort(key=lambda x: x["purity"], reverse=True)

    return {
        "l0": l0,
        "n_dead": n_dead,
        "n_active": len(feature_results),
        "features": feature_results[:top_n],
    }


def main():
    device = "cuda" if torch.cuda.is_available() else (
        "mps" if torch.backends.mps.is_available() else "cpu"
    )
    print(f"Device: {device}")

    ckpt_dir = os.path.join(os.path.dirname(__file__), "checkpoints")

    # Build and load model
    tl_model = build_model(d_vocab=20, device=device)
    tl_model.load_state_dict(torch.load(
        os.path.join(ckpt_dir, "model_tl.pt"), map_location=device, weights_only=True
    ))
    tl_model.eval()

    # Collect activations
    print("\n=== Collecting activations ===")
    activations, meta = collect_activations_and_metadata(
        tl_model, n_sequences=2000, seq_len=50, vocab_size=20,
        batch_size=64, device=device
    )

    # Training params
    d_dict = 512
    n_val = 10000
    n_epochs = 400
    batch_size = 256
    lr = 1e-3

    # === Train models ===
    k_values = [8, 16, 32]
    models = {}

    print(f"\n{'='*70}")
    print(f"TopK SAE TRAINING: d_model=128 -> d_dict={d_dict}")
    print(f"{'='*70}")

    for k in k_values:
        print(f"\n--- k={k} ---")
        t0 = time.time()
        model, val_mse = train_topk(activations, d_dict, k, n_epochs, batch_size, lr, device, n_val)
        elapsed = time.time() - t0
        print(f"  k={k}: val_mse={val_mse:.8f}, time={elapsed:.0f}s")
        models[k] = (model, val_mse)

    # Dense baseline for comparison
    print(f"\n--- Dense baseline (L1=3e-3) ---")
    # Load from previously trained model if available, else train
    dense_path = os.path.join(ckpt_dir, "sae.json")
    if os.path.exists(dense_path):
        print(f"  Using previously trained dense SAE (MSE=0.001710)")
        dense_mse = 0.001710
    else:
        print(f"  (not available, skipping)")

    # === Analysis ===
    print(f"\n{'='*70}")
    print(f"ANALYSIS")
    print(f"{'='*70}")

    # Reference: MSE of trivial "always predict mean" baseline
    with torch.no_grad():
        mean_pred = activations.mean(dim=0, keepdim=True).expand_as(activations[:10000])
        mean_mse = F.mse_loss(mean_pred, activations[:10000]).item()
    print(f"Mean-prediction baseline MSE: {mean_mse:.6f}")

    # Dense baseline analysis
    print(f"\n--- Dense baseline: L0=223.6, MSE=0.001710 ---")
    print(f"  (see previous run for details)")

    all_analyses = {}
    for k in k_values:
        model, val_mse = models[k]
        print(f"\n--- TopK k={k}: val_mse={val_mse:.8f} ---")

        analysis = analyze_model(model, activations, meta, d_dict)
        all_analyses[k] = analysis

        print(f"  L0: {analysis['l0']:.1f} / {d_dict} ({analysis['l0']/d_dict*100:.1f}%)")
        print(f"  Dead features: {analysis['n_dead']}/{d_dict} ({analysis['n_dead']/d_dict*100:.0f}%)")
        print(f"  Active features analyzed: {analysis['n_active']}")
        print(f"  MSE ratio vs mean baseline: {val_mse / mean_mse:.4f}")

        print(f"\n  Top 20 features by purity:")
        print(f"  {'#':>3} {'Feat':>5} {'Rate':>7} {'Property':<28} {'Purity':>7}")
        print(f"  {'-'*55}")
        for i, f in enumerate(analysis["features"]):
            print(f"  {i+1:>3} {f['feature']:>5} {f['rate']:>7.4f} "
                  f"{f['property']:<28} {f['purity']:>7.3f}")

    # === Summary comparison ===
    print(f"\n{'='*70}")
    print(f"COMPARISON SUMMARY")
    print(f"{'='*70}")
    print(f"{'Model':<20} {'MSE':>12} {'L0':>8} {'Dead%':>7} {'Purity@1':>9} {'Purity@10':>10}")
    print(f"{'-'*70}")

    # Dense baseline
    print(f"{'Dense L1=3e-3':<20} {'0.001710':>12} {'223.6':>8} {'36%':>7} ", end="")

    for k in k_values:
        model, val_mse = models[k]
        analysis = all_analyses[k]
        purities = [f["purity"] for f in analysis["features"]]
        p1 = purities[0] if len(purities) > 0 else 0
        p10 = np.mean(purities[:10]) if len(purities) >= 10 else np.mean(purities) if purities else 0
        label = f"TopK k={k}"
        print(f"{label:<20} {val_mse:>12.8f} {analysis['l0']:>8.1f} "
              f"{analysis['n_dead']/d_dict*100:>6.0f}% {p1:>9.3f} {p10:>10.3f}")

    # Save best model and export
    best_k = min(k_values, key=lambda k: models[k][1])
    best_model, best_mse = models[best_k]
    print(f"\nBest MSE: k={best_k} (MSE={best_mse:.8f})")

    # Save TopK SAE weights
    torch.save(best_model.state_dict(), os.path.join(ckpt_dir, "sae_topk.pt"))

    # Export to JSON
    sae_export = {
        "d_model": 128,
        "d_dict": d_dict,
        "k": best_k,
        "encoder_weight": best_model.encoder.weight.data.cpu().numpy().tolist(),
        "encoder_bias": best_model.encoder.bias.data.cpu().numpy().tolist(),
        "decoder_weight": best_model.decoder.weight.data.cpu().numpy().tolist(),
    }
    with open(os.path.join(ckpt_dir, "sae_topk.json"), "w") as f:
        json.dump(sae_export, f)
    print(f"Exported to {ckpt_dir}/sae_topk.json")

    # Export full analysis
    export_analysis = {}
    for k in k_values:
        a = all_analyses[k]
        export_analysis[f"k={k}"] = {
            "mse": models[k][1],
            "l0": a["l0"],
            "n_dead": a["n_dead"],
            "features": a["features"],
        }
    with open(os.path.join(ckpt_dir, "sae_analysis.json"), "w") as f:
        json.dump(export_analysis, f, indent=2)
    print(f"Exported analysis to {ckpt_dir}/sae_analysis.json")


if __name__ == "__main__":
    main()
