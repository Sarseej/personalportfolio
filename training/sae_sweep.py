"""
SAE training with L1 coefficient sweep to find the right sparsity tradeoff.
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

from sae import SparseAutoencoder, collect_activations
from model import build_model


def train_single(
    activations, d_dict, l1_coeff, n_epochs, batch_size, lr, device, n_val
):
    """Train one SAE and return final metrics."""
    d_model = activations.shape[1]
    n_total = activations.shape[0]

    perm = torch.randperm(n_total)
    train_acts = activations[perm[:n_total - n_val]].to(device)
    val_acts = activations[perm[n_total - n_val:]].to(device)

    model = SparseAutoencoder(d_model, d_dict).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)

    best_val_mse = float("inf")

    for epoch in range(1, n_epochs + 1):
        model.train()
        perm = torch.randperm(train_acts.shape[0])
        for start in range(0, train_acts.shape[0], batch_size):
            batch = train_acts[perm[start:start + batch_size]]
            x_recon, features = model(batch)
            mse = F.mse_loss(x_recon, batch)
            l1 = features.abs().mean()
            loss = mse + l1_coeff * l1
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        model.eval()
        with torch.no_grad():
            val_mse = 0.0
            val_l0 = 0.0
            n_batches = 0
            for start in range(0, val_acts.shape[0], batch_size):
                batch = val_acts[start:start + batch_size]
                x_recon, features = model(batch)
                val_mse += F.mse_loss(x_recon, batch).item()
                val_l0 += (features > 0).float().mean().item()
                n_batches += 1
            val_mse /= n_batches
            val_l0 /= n_batches

        if val_mse < best_val_mse:
            best_val_mse = val_mse

    # Compute dead features on full dataset
    model.eval()
    with torch.no_grad():
        all_feats = []
        for start in range(0, activations.shape[0], 10000):
            batch = activations[start:start + 10000].to(device)
            _, features = model(batch)
            all_feats.append(features.cpu())
        all_feats = torch.cat(all_feats, dim=0)
        activation_rates = (all_feats > 0).float().mean(dim=0)
        n_dead = (activation_rates < 0.0001).sum().item()
        final_l0 = (all_feats > 0).float().sum(dim=1).mean().item()
        final_l1 = all_feats.abs().mean().item()

    return {
        "l1_coeff": l1_coeff,
        "val_mse": best_val_mse,
        "val_l0": final_l0,
        "val_l1": final_l1,
        "n_dead": n_dead,
        "dead_fraction": n_dead / d_dict,
        "model": model,
        "all_features": all_feats,
    }


def main():
    device = "cuda" if torch.cuda.is_available() else (
        "mps" if torch.backends.mps.is_available() else "cpu"
    )
    print(f"Device: {device}")

    # Load model and collect activations
    checkpoint_dir = os.path.join(os.path.dirname(__file__), "checkpoints")
    model = build_model(d_vocab=20, device=device)
    model.load_state_dict(torch.load(
        os.path.join(checkpoint_dir, "model_tl.pt"),
        map_location=device, weights_only=True
    ))
    model.eval()

    activations, meta = collect_activations(
        model, n_sequences=2000, seq_len=50, vocab_size=20, batch_size=64, device=device
    )

    # Normalize activations (standard practice for SAE training)
    act_mean = activations.mean(dim=0)
    act_std = activations.std(dim=0) + 1e-6
    activations_normed = (activations - act_mean) / act_std

    d_dict = 512
    n_val = 10000
    n_epochs = 150
    batch_size = 256
    lr = 1e-3

    # L1 sweep
    l1_values = [1e-5, 3e-5, 1e-4, 3e-4, 1e-3, 3e-3]
    results = []

    print(f"\n{'='*70}")
    print(f"L1 SWEEP: d_model=128 -> d_dict={d_dict}, {len(l1_values)} settings")
    print(f"{'='*70}")
    print(f"{'L1':>10} {'Val MSE':>10} {'Val L0':>8} {'L0/d_dict':>10} {'Dead':>6} {'Dead%':>7}")
    print(f"{'-'*70}")

    for l1 in l1_values:
        t0 = time.time()
        r = train_single(activations_normed, d_dict, l1, n_epochs, batch_size, lr, device, n_val)
        elapsed = time.time() - t0
        print(f"{l1:>10.1e} {r['val_mse']:>10.6f} {r['val_l0']:>8.1f} "
              f"{r['val_l0']/d_dict*100:>9.1f}% {r['n_dead']:>6} "
              f"{r['dead_fraction']*100:>6.1f}%  [{elapsed:.0f}s]")
        results.append(r)

    # Find best tradeoff: reasonable L0 (10-100 features) with low MSE
    print(f"\n{'='*70}")
    print("TRADEOFF ANALYSIS")
    print(f"{'='*70}")

    best = None
    for r in results:
        # Score: penalize both too-sparse and too-dense, plus MSE
        l0_ratio = r["val_l0"] / d_dict
        if l0_ratio < 0.01 or l0_ratio > 0.5:
            continue
        score = r["val_mse"] + 0.001 * abs(l0_ratio - 0.1)  # target ~10% sparsity
        if best is None or score < best["_score"]:
            best = r
            best["_score"] = score

    if best:
        print(f"\nBest tradeoff: L1={best['l1_coeff']:.1e}, "
              f"MSE={best['val_mse']:.6f}, L0={best['val_l0']:.1f} "
              f"({best['val_l0']/d_dict*100:.1f}%), dead={best['n_dead']}")
    else:
        # If no good tradeoff found, pick the one with L0 closest to 10% of d_dict
        target_l0 = d_dict * 0.05  # 5% = 25.6 features
        best = min(results, key=lambda r: abs(r["val_l0"] - target_l0))
        print(f"\nBest available: L1={best['l1_coeff']:.1e}, "
              f"MSE={best['val_mse']:.6f}, L0={best['val_l0']:.1f} "
              f"({best['val_l0']/d_dict*100:.1f}%), dead={best['n_dead']}")

    # Save the best model
    best_model = best["model"]
    torch.save(best_model.state_dict(), os.path.join(checkpoint_dir, "sae_model.pt"))
    print(f"\nSaved best SAE model to {checkpoint_dir}/sae_model.pt")

    # Also save normalization stats
    torch.save({"mean": act_mean, "std": act_std}, os.path.join(checkpoint_dir, "sae_norm.pt"))

    # Save sweep results (without model objects)
    sweep_results = [{k: v for k, v in r.items() if k not in ("model", "all_features")} for r in results]
    with open(os.path.join(checkpoint_dir, "sae_sweep.json"), "w") as f:
        json.dump(sweep_results, f, indent=2)


if __name__ == "__main__":
    main()
