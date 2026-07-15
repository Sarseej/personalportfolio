"""
Induction head validation — the critical correctness check.

Computes per-head induction scores for both the trained model and a
randomly-initialized baseline, then prints a comparison table.

Induction score definition (Olsson et al. 2022):
  For a sequence where a pattern appears at positions [S1..S1+L) and again
  at [S2..S2+L), the induction score for head (l, h) is:

      I = (1/L) * Σ_{k=0}^{L-1} pattern[l,h, S2+k, S1+k+1]

  i.e., for each token in the second occurrence, measure what fraction of
  attention goes to the position immediately after that token's first
  occurrence (the "next token" position from the first copy).
"""

import os
import sys
import torch

sys.path.insert(0, os.path.dirname(__file__))

from data import generate_batch, get_batch_metadata
from model import build_model


def compute_induction_scores(
    model,
    n_test: int = 200,
    seq_len: int = 100,
    vocab_size: int = 50,
) -> torch.Tensor:
    """Compute per-head induction score: average attention to S1+k+1 from S2+k.

    Normalized by total position pairs (not n_test), so the score represents
    the mean per-position attention weight — directly comparable across runs
    and to published literature.

    Returns:
        Tensor of shape [n_layers, n_heads] with induction scores.
    """
    model.eval()
    n_layers = model.cfg.n_layers
    n_heads = model.cfg.n_heads
    scores = torch.zeros(n_layers, n_heads)
    total_pairs = 0

    with torch.no_grad():
        for _ in range(n_test):
            tokens = generate_batch(1, seq_len, vocab_size, model.cfg.device)
            metadata = get_batch_metadata(1, tokens)
            m = metadata[0]

            if m["pattern_len"] < 2:
                continue

            logits, cache = model.run_with_cache(tokens)

            for layer in range(n_layers):
                pattern = cache["pattern", layer][0]  # [n_heads, seq, seq]

                s1 = m["pattern_start1"]
                s2 = m["pattern_start2"]
                plen = m["pattern_len"]

                # For each position in the second occurrence (S2+k),
                # measure attention to S1+k+1 (position after first occurrence)
                for k in range(plen - 1):
                    query_pos = s2 + k
                    target_pos = s1 + k + 1
                    if query_pos < seq_len and target_pos < seq_len:
                        scores[layer] += pattern[:, query_pos, target_pos]
                        total_pairs += 1

    return scores / total_pairs


def print_summary_table(trained_scores, random_scores, threshold: float = 0.05):
    """Print a clear comparison table."""
    n_layers, n_heads = trained_scores.shape

    print("\n" + "=" * 70)
    print("INDUCTION SCORE SUMMARY")
    print("=" * 70)
    print(f"{'Layer':<7} {'Head':<7} {'Trained':>10} {'Random':>10} {'Δ':>10} {'Verdict':>12}")
    print("-" * 70)

    induction_heads = []

    for layer in range(n_layers):
        for head in range(n_heads):
            t = trained_scores[layer, head].item()
            r = random_scores[layer, head].item()
            delta = t - r

            is_induction = (t > 0.05) and (delta > threshold)
            verdict = "← INDUCTION" if is_induction else ""

            if is_induction:
                induction_heads.append((layer, head, t, r, delta))

            print(f"  {layer:<5} {head:<5} {t:>10.4f} {r:>10.4f} {delta:>+10.4f} {verdict:>12}")

        if layer < n_layers - 1:
            print()

    print("-" * 70)

    if induction_heads:
        print(f"\nIdentified {len(induction_heads)} induction head(s):")
        for layer, head, t, r, delta in induction_heads:
            print(f"  Layer {layer}, Head {head}: score={t:.4f} (random={r:.4f}, Δ={delta:+.4f})")
    else:
        print("\nNo induction heads found above threshold.")

    print(f"\nThresholds: trained > 0.05, delta > {threshold}")
    print("=" * 70)

    return induction_heads


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    # Load trained model
    checkpoint_dir = os.path.join(os.path.dirname(__file__), "checkpoints")
    checkpoint_path = os.path.join(checkpoint_dir, "model_tl.pt")

    if not os.path.exists(checkpoint_path):
        print(f"ERROR: No checkpoint found at {checkpoint_path}")
        print("Run train.py first.")
        sys.exit(1)

    trained_model = build_model(d_vocab=20, device=device)
    trained_model.load_state_dict(torch.load(checkpoint_path, map_location=device, weights_only=True))
    trained_model.eval()
    print(f"Loaded trained model from {checkpoint_path}")

    # Create random baseline model (same architecture, no training)
    random_model = build_model(d_vocab=20, device=device)
    random_model.eval()
    print("Created random baseline model (same architecture, untrained)")

    # Compute scores
    print("\nComputing induction scores for trained model...")
    trained_scores = compute_induction_scores(trained_model, n_test=200, seq_len=100, vocab_size=20)
    print("Done.")

    print("Computing induction scores for random baseline...")
    random_scores = compute_induction_scores(random_model, n_test=200, seq_len=100, vocab_size=20)
    print("Done.")

    # Summary table
    induction_heads = print_summary_table(trained_scores, random_scores)


if __name__ == "__main__":
    main()
