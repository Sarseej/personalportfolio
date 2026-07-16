"""
SAE training with proper L1 sweep to achieve meaningful sparsity.
Target: L0 between 10-80 features out of 512 (2-15%).
Uses un-normalized activations (standard for SAEs).
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


def train_single(activations, d_dict, l1_coeff, n_epochs, batch_size, lr, device, n_val):
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

    # Final stats on full dataset
    model.eval()
    with torch.no_grad():
        all_feats = []
        for start in range(0, activations.shape[0], 10000):
            batch = activations[start:start + 10000].to(device)
            _, features = model(batch)
            all_feats.append(features.cpu())
        all_feats = torch.cat(all_feats, dim=0)
        final_l0 = (all_feats > 0).float().sum(dim=1).mean().item()
        n_dead = ((all_feats > 0).float().sum(dim=0) < 1).sum().item()

    return {
        "l1_coeff": l1_coeff, "val_mse": best_val_mse,
        "val_l0": final_l0, "n_dead": n_dead,
        "model": model, "all_features": all_feats,
    }


def main():
    device = "cuda" if torch.cuda.is_available() else (
        "mps" if torch.backends.mps.is_available() else "cpu"
    )
    print(f"Device: {device}")

    checkpoint_dir = os.path.join(os.path.dirname(__file__), "checkpoints")
    model = build_model(d_vocab=20, device=device)
    model.load_state_dict(torch.load(
        os.path.join(checkpoint_dir, "model_tl.pt"),
        map_location=device, weights_only=True
    ))
    model.eval()

    activations, _ = collect_activations(
        model, n_sequences=2000, seq_len=50, vocab_size=20, batch_size=64, device=device
    )

    d_dict = 512
    n_val = 10000
    n_epochs = 200
    batch_size = 256
    lr = 1e-3

    # Wide sweep: un-normalized activations, L1 from very small to very large
    l1_values = [1e-4, 3e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1]
    results = []

    print(f"\nL1 SWEEP (un-normalized): d_model=128 -> d_dict={d_dict}, {n_epochs} epochs")
    print(f"{'L1':>10} {'Val MSE':>10} {'Val L0':>8} {'L0%':>6} {'Dead':>6}")
    print(f"{'-'*50}")

    for l1 in l1_values:
        t0 = time.time()
        r = train_single(activations, d_dict, l1, n_epochs, batch_size, lr, device, n_val)
        elapsed = time.time() - t0
        l0_pct = r["val_l0"] / d_dict * 100
        print(f"{l1:>10.1e} {r['val_mse']:>10.6f} {r['val_l0']:>8.1f} "
              f"{l0_pct:>5.1f}% {r['n_dead']:>6}  [{elapsed:.0f}s]")
        results.append(r)

    # Pick best in the 10-80 active features range
    target_l0 = 40
    best = min(results, key=lambda r: abs(r["val_l0"] - target_l0))
    best_l0_pct = best["val_l0"] / d_dict * 100

    print(f"\nBest: L1={best['l1_coeff']:.1e}, MSE={best['val_mse']:.6f}, "
          f"L0={best['val_l0']:.1f} ({best_l0_pct:.1f}%), dead={best['n_dead']}")

    # Save best
    torch.save(best["model"].state_dict(), os.path.join(checkpoint_dir, "sae_model.pt"))
    print(f"Saved best model to {checkpoint_dir}/sae_model.pt")

    sweep = [{k: v for k, v in r.items() if k not in ("model", "all_features")} for r in results]
    with open(os.path.join(checkpoint_dir, "sae_sweep.json"), "w") as f:
        json.dump(sweep, f, indent=2)


if __name__ == "__main__":
    main()
