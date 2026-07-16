"""
SAE with top-k activation — forces exactly k features active.
This guarantees sparsity instead of relying on L1.
Compare with L1 baseline.
"""

import os, sys, json, time
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from sae import collect_activations
from model import build_model


class TopKSparseAutoencoder(nn.Module):
    def __init__(self, d_model, d_dict, k=20):
        super().__init__()
        self.k = k
        self.encoder = nn.Linear(d_model, d_dict)
        self.decoder = nn.Linear(d_dict, d_model, bias=False)
        self.decoder.weight.data.normal_(0, 1 / np.sqrt(d_dict))

    def forward(self, x):
        pre = self.encoder(x)
        # Top-k: zero out all but largest k per sample
        topk_vals, topk_idx = pre.topk(self.k, dim=-1)
        mask = torch.zeros_like(pre)
        mask.scatter_(-1, topk_idx, 1.0)
        features = F.relu(pre) * mask
        x_recon = self.decoder(features)
        return x_recon, features


def train_topk(acts, d_dict, k, n_epochs, batch_size, lr, device, n_val):
    d_model = acts.shape[1]
    perm = torch.randperm(acts.shape[0])
    train_acts = acts[perm[:acts.shape[0] - n_val]].to(device)
    val_acts = acts[perm[acts.shape[0] - n_val:]].to(device)

    model = TopKSparseAutoencoder(d_model, d_dict, k=k).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    best_val_mse = float("inf")

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

        model.eval()
        with torch.no_grad():
            vmse, nl = 0, 0
            for s in range(0, val_acts.shape[0], batch_size):
                b = val_acts[s:s + batch_size]
                xr, f = model(b)
                vmse += F.mse_loss(xr, b).item()
                nl += 1
            vmse /= nl
            if vmse < best_val_mse:
                best_val_mse = vmse

    # Dead features
    model.eval()
    with torch.no_grad():
        all_f = []
        for s in range(0, acts.shape[0], 10000):
            b = acts[s:s + 10000].to(device)
            _, f = model(b)
            all_f.append(f.cpu())
        all_f = torch.cat(all_f, dim=0)
        l0 = (all_f > 0).float().sum(dim=1).mean().item()
        rates = (all_f > 0).float().mean(dim=0)
        n_dead = (rates < 0.0001).sum().item()

    return {"k": k, "val_mse": best_val_mse, "val_l0": l0, "n_dead": n_dead,
            "model": model, "all_features": all_f}


def train_l1(acts, d_dict, l1, n_epochs, batch_size, lr, device, n_val):
    d_model = acts.shape[1]
    perm = torch.randperm(acts.shape[0])
    train_acts = acts[perm[:acts.shape[0] - n_val]].to(device)
    val_acts = acts[perm[acts.shape[0] - n_val:]].to(device)

    enc = nn.Linear(d_model, d_dict)
    dec = nn.Linear(d_dict, d_model, bias=False)
    dec.weight.data.normal_(0, 1 / np.sqrt(d_dict))
    model = nn.Sequential()
    model.add_module("enc", enc)
    model.add_module("dec", dec)
    model = model.to(device)
    params = list(enc.parameters()) + list(dec.parameters())
    optimizer = torch.optim.Adam(params, lr=lr)
    best_val_mse = float("inf")

    for epoch in range(1, n_epochs + 1):
        enc.train(); dec.train()
        perm = torch.randperm(train_acts.shape[0])
        for s in range(0, train_acts.shape[0], batch_size):
            batch = train_acts[perm[s:s + batch_size]]
            feat = F.relu(enc(batch))
            xr = dec(feat)
            loss = F.mse_loss(xr, batch) + l1 * feat.abs().mean()
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        enc.eval(); dec.eval()
        with torch.no_grad():
            vmse, nl = 0, 0
            for s in range(0, val_acts.shape[0], batch_size):
                b = val_acts[s:s + batch_size]
                feat = F.relu(enc(b))
                xr = dec(feat)
                vmse += F.mse_loss(xr, b).item()
                nl += 1
            vmse /= nl
            if vmse < best_val_mse:
                best_val_mse = vmse

    with torch.no_grad():
        all_f = []
        for s in range(0, acts.shape[0], 10000):
            b = acts[s:s + 10000].to(device)
            feat = F.relu(enc(b))
            all_f.append(feat.cpu())
        all_f = torch.cat(all_f, dim=0)
        l0 = (all_f > 0).float().sum(dim=1).mean().item()
        n_dead = ((all_f > 0).float().sum(dim=0) < 1).sum().item()

    return {"l1": l1, "val_mse": best_val_mse, "val_l0": l0, "n_dead": n_dead,
            "model": None, "all_features": all_f}


def interpretability_check(all_features, activations, top_n=20):
    """Check which features correlate with token identity and in_pattern."""
    n_samples = min(50000, activations.shape[0])

    # Simple threshold-based interpretability
    feats_binary = (all_features[:n_samples] > 0).float()
    n_active = feats_binary.sum(dim=0)
    # Only check features that fire at least 50 times
    mask = n_active > 50
    active_idx = mask.nonzero(as_tuple=True)[0]

    results = []
    for fi in active_idx:
        fi = fi.item()
        rate = n_active[fi].item() / n_samples

        # Top activating samples
        feat_vals = all_features[:n_samples, fi]
        top_vals, top_idx = feat_vals.topk(100)
        top_acts = activations[top_idx]

        # Check token identity correlation
        token_scores = []
        for tok in range(20):
            tok_mask = (top_acts == tok).any(dim=1).float()
            token_scores.append(tok_mask.mean().item())
        best_tok = int(np.argmax(token_scores))

        # Check in-pattern correlation
        top_positions = top_idx.numpy()
        in_pattern_count = 0
        for pos in top_positions:
            if activations[pos, 0].item() == 1:  # special token 1 = in_pattern
                in_pattern_count += 1
        in_pattern_rate = in_pattern_count / len(top_positions)

        results.append({
            "feature": fi,
            "rate": rate,
            "best_token": best_tok,
            "token_score": token_scores[best_tok],
            "in_pattern": in_pattern_rate,
        })

    results.sort(key=lambda x: max(x["token_score"], x["in_pattern"]), reverse=True)
    return results[:top_n]


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

    activations, _ = collect_activations(
        tl_model, n_sequences=2000, seq_len=50, vocab_size=20, batch_size=64, device=device
    )
    print(f"Activations: {activations.shape}")

    d_dict = 2048
    n_val = 10000
    n_epochs = 200
    batch_size = 256
    lr = 1e-3

    print(f"\n{'='*60}")
    print(f"TOP-K SAE: d_model=128 -> d_dict={d_dict}")
    print(f"{'='*60}")

    topk_results = []
    for k in [10, 20, 40, 80]:
        t0 = time.time()
        r = train_topk(activations, d_dict, k, n_epochs, batch_size, lr, device, n_val)
        elapsed = time.time() - t0
        print(f"  k={k:>3}: MSE={r['val_mse']:.6f}, L0={r['val_l0']:.1f}, "
              f"dead={r['n_dead']}/{d_dict} ({r['n_dead']/d_dict*100:.0f}%) [{elapsed:.0f}s]")
        topk_results.append(r)

    # Also L1 baseline with larger dict
    print(f"\nL1 BASELINE (d_dict={d_dict}):")
    for l1 in [1e-3, 1e-2, 3e-2]:
        t0 = time.time()
        r = train_l1(activations, d_dict, l1, n_epochs, batch_size, lr, device, n_val)
        elapsed = time.time() - t0
        print(f"  L1={l1:.1e}: MSE={r['val_mse']:.6f}, L0={r['val_l0']:.1f}, "
              f"dead={r['n_dead']}/{d_dict} [{elapsed:.0f}s]")

    # Interpretability on best top-k model (k=20)
    best_topk = min(topk_results, key=lambda r: abs(r["val_l0"] - 30))
    print(f"\nInterpretability on top-k model (k={best_topk['k']}):")
    interp = interpretability_check(best_topk["all_features"], activations)
    for i, f in enumerate(interp[:20]):
        kind = "in_pattern" if f["in_pattern"] > f["token_score"] else f"token_{f['best_token']}"
        score = max(f["in_pattern"], f["token_score"])
        print(f"  {i+1:>2}. Feature {f['feature']:>4}: {kind:<15} "
              f"strength={score:.3f} rate={f['rate']:.4f}")

    # Save best top-k model
    torch.save(best_topk["model"].state_dict(), os.path.join(ckpt_dir, "sae_topk.pt"))
    print(f"\nSaved top-k model (k={best_topk['k']})")


if __name__ == "__main__":
    main()
