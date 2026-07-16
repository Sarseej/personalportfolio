"""
Expanded TopK SAE sweep: middle ground between trivial sparsity and dense.
Tests k=64,96 at d_dict=512, and k=32,64 at d_dict=128,256.
For best candidate: full purity analysis including conjunction features.
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
from sae_topk_analysis import (
    TopKSparseAutoencoder,
    collect_activations_and_metadata,
    analyze_model,
)


def train_topk(acts, d_dict, k, n_epochs, batch_size, lr, device, n_val,
               patience_limit=80, print_every=100):
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

        if epoch % print_every == 0 or epoch == 1:
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
                if epoch % print_every == 0:
                    print(f"    Epoch {epoch}: val_mse={vmse:.8f}")
            if patience >= patience_limit:
                print(f"    Early stop at epoch {epoch}")
                break

    model.load_state_dict(best_state)
    model.eval()
    return model, best_val_mse


def analyze_with_conjunctions(model, activations, meta, d_dict, top_n=30):
    """Extended purity analysis that explicitly checks conjunction features."""
    dev = next(model.parameters()).device
    with torch.no_grad():
        all_f = []
        for s in range(0, activations.shape[0], 10000):
            b = activations[s:s + 10000].to(dev)
            _, f = model(b)
            all_f.append(f.cpu())
        all_features = torch.cat(all_f, dim=0)

    n_samples = all_features.shape[0]
    activation_rates = (all_features > 0).float().mean(dim=0)
    n_dead = int((activation_rates < 0.0001).sum().item())
    l0 = (all_features > 0).float().sum(dim=1).mean().item()

    tokens = meta["tokens"]
    in_pat = meta["in_pattern"] > 0.5

    feature_results = []
    for fi in range(d_dict):
        vals = all_features[:, fi]
        rate = activation_rates[fi].item()
        if rate < 0.0005:
            continue

        active_mask = vals > 0
        n_active = active_mask.sum().item()
        if n_active < 100:
            continue

        total_mass = vals[active_mask].sum().item()
        if total_mass < 1e-10:
            continue

        candidates = []

        # Single properties
        for tok in range(20):
            mask = active_mask & (tokens == tok)
            mass = vals[mask].sum().item()
            candidates.append((f"token_{tok}", mass))

        mass_ip = vals[active_mask & in_pat].sum().item()
        mass_oop = vals[active_mask & ~in_pat].sum().item()
        candidates.append(("in_pattern", mass_ip))
        candidates.append(("out_of_pattern", mass_oop))

        # Position buckets
        positions = meta["positions"]
        for bs in range(0, 50, 10):
            mask = active_mask & (positions >= bs) & (positions < bs + 10)
            mass = vals[mask].sum().item()
            candidates.append((f"pos_{bs}-{bs+10}", mass))

        # Conjunctions: token AND in_pattern
        for tok in range(20):
            mask = active_mask & (tokens == tok) & in_pat
            mass = vals[mask].sum().item()
            candidates.append((f"token_{tok}_in_pattern", mass))

            mask_oop = active_mask & (tokens == tok) & ~in_pat
            mass_oop_t = vals[mask_oop].sum().item()
            candidates.append((f"token_{tok}_out_of_pattern", mass_oop_t))

        # Offset buckets
        offsets = meta["offset"]
        for lo, hi, lbl in [(0, 20, "short"), (20, 40, "med"), (40, 100, "long")]:
            mask = active_mask & (offsets >= lo) & (offsets < hi)
            mass = vals[mask].sum().item()
            candidates.append((f"offset_{lbl}", mass))

        best_prop, best_mass = max(candidates, key=lambda x: x[1])
        purity = best_mass / total_mass

        # Also compute second-best for specificity check
        candidates.sort(key=lambda x: x[1], reverse=True)
        second_mass = candidates[1][1] if len(candidates) > 1 else 0
        specificity = best_mass / (best_mass + second_mass) if (best_mass + second_mass) > 0 else 1.0

        feature_results.append({
            "feature": fi,
            "rate": rate,
            "property": best_prop,
            "purity": purity,
            "specificity": specificity,
            "total_mass": total_mass,
            "property_mass": best_mass,
            "second_property": candidates[1][0] if len(candidates) > 1 else "none",
            "second_mass": second_mass,
        })

    feature_results.sort(key=lambda x: x["purity"], reverse=True)

    # Count feature categories
    categories = {}
    for f in feature_results:
        cat = f["property"].split("_")[0] if "_" in f["property"] else f["property"]
        if "in_pattern" in f["property"] or "out_of_pattern" in f["property"]:
            if "token" in f["property"]:
                cat = "conjunction"
            else:
                cat = "pattern_status"
        elif f["property"].startswith("pos_"):
            cat = "position"
        elif f["property"].startswith("token_"):
            cat = "token"
        elif f["property"].startswith("offset_"):
            cat = "offset"
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "l0": l0,
        "n_dead": n_dead,
        "n_active": len(feature_results),
        "features": feature_results[:top_n],
        "categories": categories,
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

    print("\n=== Collecting activations ===")
    activations, meta = collect_activations_and_metadata(
        tl_model, n_sequences=2000, seq_len=50, vocab_size=20,
        batch_size=64, device=device
    )

    # ── Sweep configs ──
    configs = [
        # Step 1: larger k, d_dict=512
        (512, 64),
        (512, 96),
        # Step 2: smaller dictionary
        (256, 32),
        (256, 64),
        (128, 32),
        (128, 64),
    ]

    n_val = 10000
    n_epochs = 400
    batch_size = 256
    lr = 1e-3

    print(f"\n{'='*70}")
    print(f"EXPANDED TopK SWEEP")
    print(f"{'='*70}")

    results = {}
    for d_dict, k in configs:
        label = f"d{d_dict}_k{k}"
        print(f"\n--- {label} ---")
        t0 = time.time()
        model, val_mse = train_topk(
            activations, d_dict, k, n_epochs, batch_size, lr, device, n_val
        )
        elapsed = time.time() - t0

        dev = next(model.parameters()).device
        with torch.no_grad():
            all_f = []
            for s in range(0, activations.shape[0], 10000):
                b = activations[s:s + 10000].to(dev)
                _, f = model(b)
                all_f.append(f.cpu())
            all_features = torch.cat(all_f, dim=0)

        final_l0 = (all_features > 0).float().sum(dim=1).mean().item()
        rates = (all_features > 0).float().mean(dim=0)
        n_dead = int((rates < 0.0001).sum().item())

        density = final_l0 / d_dict * 100
        dead_pct = n_dead / d_dict * 100

        print(f"  MSE={val_mse:.8f}, L0={final_l0:.1f}/{d_dict} ({density:.1f}%), "
              f"dead={n_dead}/{d_dict} ({dead_pct:.0f}%) [{elapsed:.0f}s]")

        results[label] = {
            "model": model, "mse": val_mse, "l0": final_l0,
            "n_dead": n_dead, "d_dict": d_dict, "k": k,
        }

    # ── Summary table ──
    mean_mse = 201.05
    dense_mse = 0.001710

    print(f"\n{'='*80}")
    print(f"COMPARISON TABLE")
    print(f"{'='*80}")
    print(f"{'Config':<16} {'MSE':>12} {'vsDense':>8} {'L0':>7} {'Dens%':>6} {'Dead%':>6}")
    print(f"{'-'*65}")
    print(f"{'Dense L1=3e-3':<16} {dense_mse:>12.6f} {'1.0x':>8} {'223.6':>7} {'43.7':>5}% {'36':>5}%")
    for label, r in sorted(results.items()):
        ratio = r["mse"] / dense_mse
        print(f"{label:<16} {r['mse']:>12.8f} {ratio:>7.1f}x {r['l0']:>7.1f} "
              f"{r['l0']/r['d_dict']*100:>5.1f}% {r['n_dead']/r['d_dict']*100:>5.0f}%")

    # ── Find best "middle ground" config ──
    # Criteria: MSE within 10x of dense, L0 meaningfully < 223
    candidates = []
    for label, r in results.items():
        ratio = r["mse"] / dense_mse
        if ratio <= 10 and r["l0"] < 200:
            candidates.append((label, r, ratio))
    candidates.sort(key=lambda x: x[2])  # best MSE ratio first

    if not candidates:
        # Widen: within 30x of dense
        for label, r in results.items():
            ratio = r["mse"] / dense_mse
            if ratio <= 30 and r["l0"] < 200:
                candidates.append((label, r, ratio))
        candidates.sort(key=lambda x: x[2])

    if not candidates:
        # Further widen: just find closest to 10x
        for label, r in results.items():
            ratio = r["mse"] / dense_mse
            candidates.append((label, r, ratio))
        candidates.sort(key=lambda x: abs(x[2] - 10))

    best_label, best_r, best_ratio = candidates[0]
    print(f"\nBest middle-ground: {best_label} (MSE ratio={best_ratio:.1f}x, L0={best_r['l0']:.1f})")

    # ── Full purity analysis on best ──
    print(f"\n{'='*70}")
    print(f"FULL PURITY ANALYSIS: {best_label}")
    print(f"{'='*70}")

    analysis = analyze_with_conjunctions(
        best_r["model"], activations, meta, best_r["d_dict"]
    )

    print(f"L0: {analysis['l0']:.1f}, Dead: {analysis['n_dead']}/{best_r['d_dict']}")
    print(f"Active features analyzed: {analysis['n_active']}")
    print(f"\nFeature categories: {analysis['categories']}")

    # Count conjunctions specifically
    n_conj = sum(1 for f in analysis["features"]
                 if "token_" in f["property"] and ("in_pattern" in f["property"] or "out_of_pattern" in f["property"]))
    print(f"Conjunction features in top 30: {n_conj}")

    print(f"\nTop 30 features by purity:")
    print(f"{'#':>3} {'Feat':>5} {'Rate':>7} {'Property':<32} {'Purity':>7} {'2nd':<28}")
    print(f"{'-'*85}")
    for i, f in enumerate(analysis["features"]):
        marker = " ***" if ("token_" in f["property"] and "pattern" in f["property"]) else ""
        print(f"{i+1:>3} {f['feature']:>5} {f['rate']:>7.4f} "
              f"{f['property']:<32} {f['purity']:>7.3f} "
              f"{f['second_property']:<28}{marker}")

    # ── Also run analysis on all configs for comparison ──
    print(f"\n{'='*70}")
    print(f"CONJUNCTION FEATURE COUNT (top 30) — ALL CONFIGS")
    print(f"{'='*70}")
    for label, r in sorted(results.items()):
        a = analyze_with_conjunctions(r["model"], activations, meta, r["d_dict"], top_n=30)
        n_conj = sum(1 for f in a["features"]
                     if "token_" in f["property"] and "pattern" in f["property"])
        n_tok = sum(1 for f in a["features"]
                    if f["property"].startswith("token_") and "pattern" not in f["property"])
        n_pos = sum(1 for f in a["features"] if f["property"].startswith("pos_"))
        n_bin = sum(1 for f in a["features"]
                    if f["property"] in ("in_pattern", "out_of_pattern"))
        print(f"  {label:<16}: conj={n_conj}, token={n_tok}, pos={n_pos}, binary={n_bin}")

    # Save
    save_data = {}
    for label, r in results.items():
        save_data[label] = {
            "mse": r["mse"], "l0": r["l0"], "n_dead": r["n_dead"],
            "d_dict": r["d_dict"], "k": r["k"],
        }
    with open(os.path.join(ckpt_dir, "sae_sweep2_results.json"), "w") as f:
        json.dump(save_data, f, indent=2)

    # Save best model
    torch.save(best_r["model"].state_dict(), os.path.join(ckpt_dir, "sae_best.pt"))
    best_export = {
        "d_model": 128, "d_dict": best_r["d_dict"], "k": best_r["k"],
        "encoder_weight": best_r["model"].encoder.weight.data.cpu().numpy().tolist(),
        "encoder_bias": best_r["model"].encoder.bias.data.cpu().numpy().tolist(),
        "decoder_weight": best_r["model"].decoder.weight.data.cpu().numpy().tolist(),
    }
    with open(os.path.join(ckpt_dir, "sae_best.json"), "w") as f:
        json.dump(best_export, f)
    print(f"\nSaved best model to {ckpt_dir}/sae_best.json")


if __name__ == "__main__":
    main()
