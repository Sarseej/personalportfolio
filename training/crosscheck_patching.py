"""
Deliverables for Milestone 5 Step 6: causal patching results.

Tests:
1. Patch all first-occurrence positions at L0 (full clean restoration) — induction-relevant
2. Patch single position P15 at L0 — partial restoration
3. Patch at L1 (last layer) — no recomputation possible
4. Patch at clearly irrelevant position (L0, final tokens) — should be ~0%
"""

import os, sys, json, torch

sys.path.insert(0, os.path.dirname(__file__))
from model import build_model
from data import generate_batch, get_batch_metadata


def patched_forward_python(model, clean_tokens, corrupted_tokens, patch_layer, patch_positions):
    """
    Patch residual at (patch_layer, patch_positions) — swap in clean values
    at ALL listed positions, then re-run from patch_layer+1 onward.
    """
    T = corrupted_tokens.shape[1]
    n_layers = model.cfg.n_layers

    with torch.no_grad():
        _, clean_cache = model.run_with_cache(clean_tokens)
        _, corr_cache = model.run_with_cache(corrupted_tokens)

        clean_logits = model(clean_tokens)[0, -1]
        corr_logits = model(corrupted_tokens)[0, -1]

        if patch_layer >= n_layers:
            resid_key = "blocks.-1.hook_resid_post"
        else:
            resid_key = f"blocks.{patch_layer}.hook_resid_post"

        clean_resid = clean_cache[resid_key][0]
        corr_resid = corr_cache[resid_key][0]

        patched_resid = corr_resid.clone()
        for pos in patch_positions:
            patched_resid[pos] = clean_resid[pos]

        x = patched_resid.unsqueeze(0)

        for layer_idx in range(patch_layer + 1, n_layers):
            block = model.blocks[layer_idx]
            normed = block.ln1(x)
            attn_out = block.attn(normed, normed, normed)[0]
            x = x + attn_out

        patched_ln = model.ln_final(x)
        patched_logits = model.unembed(patched_ln)[0, -1]

        return clean_logits, corr_logits, patched_logits


def main():
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Device: {device}")

    ckpt_dir = os.path.join(os.path.dirname(__file__), "checkpoints")
    model = build_model(d_vocab=20, device=device)
    model.load_state_dict(torch.load(
        os.path.join(ckpt_dir, "model_tl.pt"), map_location=device, weights_only=True
    ))
    model.eval()

    torch.manual_seed(42)
    tokens = generate_batch(1, seq_len=50, vocab_size=20, device=device)
    metadata = get_batch_metadata(1, tokens)
    meta = metadata[0]

    s1, s2, plen = meta["pattern_start1"], meta["pattern_start2"], meta["pattern_len"]
    target_tok = tokens[0, s2].item()

    corrupted_tokens = tokens.clone()
    new_tok = (tokens[0, s1].item() + 1) % 20
    for k in range(plen):
        corrupted_tokens[0, s1 + k] = new_tok

    print(f"Pattern: len={plen}, 1st@{s1}, 2nd@{s2}, target_token={target_tok}\n")

    first_occ_positions = list(range(s1, s1 + plen))
    second_occ_positions = list(range(s2, s2 + plen))
    irrelevant_positions = [48, 49]  # final two positions (no pattern there)

    tests = [
        ("A. L0, ALL 1st-occ positions (14 positions)",
         0, first_occ_positions,
         "Induction-relevant: restore full clean first occurrence at L0 input to L1"),

        ("B. L0, single P15 (1st occ+1)",
         0, [s1 + 1],
         "Partial: restore one position at L0 input to L1"),

        ("C. L0, ALL 2nd-occ positions (14 positions)",
         0, second_occ_positions,
         "Wrong location: restore second occurrence at L0 (irrelevant to prediction at P49)"),

        ("D. L0, positions 48-49 (end of sequence)",
         0, irrelevant_positions,
         "Wrong location: restore tokens far from any pattern"),

        ("E. L1, ALL 1st-occ positions",
         1, first_occ_positions,
         "No recomputation: patch after last layer, no attention reruns"),

        ("F. L1, single P14 (1st occ)",
         1, [s1],
         "No recomputation: patch after last layer"),
    ]

    print(f"{'='*75}")
    print(f"{'Test':<50} {'Recovery':>10} {'Patched':>10}")
    print(f"{'='*75}")

    results = {}
    for label, layer, positions, desc in tests:
        clean_l, corr_l, patched_l = patched_forward_python(
            model, tokens, corrupted_tokens, layer, positions
        )
        cl = clean_l[target_tok].item()
        co = corr_l[target_tok].item()
        pa = patched_l[target_tok].item()
        total_effect = cl - co
        recovered = pa - co
        recovery_pct = (recovered / total_effect * 100) if abs(total_effect) > 1e-6 else 0

        print(f"{label}")
        print(f"    {desc}")
        print(f"    Clean={cl:.6f}  Corrupted={co:.6f}  Patched={pa:.6f}")
        print(f"    Total effect={total_effect:.6f}  Recovered={recovered:.6f}  Recovery={recovery_pct:.1f}%")
        print()

        results[label] = {
            "clean_logit": cl, "corrupted_logit": co, "patched_logit": pa,
            "total_effect": total_effect, "recovered": recovered,
            "recovery_pct": recovery_pct, "description": desc,
        }

    # Export for TS comparison
    export = {
        "clean_tokens": tokens[0].tolist(),
        "corrupted_tokens": corrupted_tokens[0].tolist(),
        "s1": s1, "s2": s2, "plen": plen, "target_token": target_tok,
        "tests": {k: v for k, v in results.items()},
    }
    with open(os.path.join(ckpt_dir, "patch_test_vectors.json"), "w") as f:
        json.dump(export, f, indent=2)

    print(f"{'='*75}")
    print("SUMMARY")
    print(f"{'='*75}")
    a = results["A. L0, ALL 1st-occ positions (14 positions)"]["recovery_pct"]
    d = results["D. L0, positions 48-49 (end of sequence)"]["recovery_pct"]
    e = results["E. L1, ALL 1st-occ positions"]["recovery_pct"]
    print(f"  A (L0, full 1st occ):  {a:>6.1f}% recovery  ← induction-relevant")
    print(f"  D (L0, end-of-seq):    {d:>6.1f}% recovery  ← irrelevant control")
    print(f"  E (L1, full 1st occ):  {e:>6.1f}% recovery  ← no recomputation")
    print()
    if a > d + 1 and a > e + 1:
        print("✓ Pattern matches expectations:")
        print("  High recovery at induction-relevant location, low elsewhere.")
    else:
        print("⚠ Recovery pattern does not clearly match expectations.")


if __name__ == "__main__":
    main()
