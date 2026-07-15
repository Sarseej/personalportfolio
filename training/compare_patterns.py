"""
Compare attention patterns between Python (TransformerLens) and TypeScript.

Runs a specific token sequence through both models and compares
attention weights element-wise.
"""

import os
import sys
import json
import torch

sys.path.insert(0, os.path.dirname(__file__))

from model import build_model


def main():
    device = "cpu"
    checkpoint_path = os.path.join(os.path.dirname(__file__), "checkpoints", "model_tl.pt")

    model = build_model(d_vocab=20, device=device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device, weights_only=True))
    model.eval()

    # Fixed test sequence (same as what we'll use in TS)
    # A 50-token sequence with a repeated pattern at positions 10-19 and 35-44
    tokens = [
        14, 7, 3, 18, 11, 1, 9, 16, 5, 12,       # 0-9: random
        2, 8, 19, 6, 15, 4, 17, 10, 13, 0,        # 10-19: first pattern
        11, 3, 7, 18, 14, 9, 1, 16, 5, 12,        # 20-29: random
        8, 19, 6, 15, 4,                            # 30-34: random
        2, 8, 19, 6, 15, 4, 17, 10, 13, 0,        # 35-44: second pattern (same as 10-19)
        11, 3, 7, 18, 14,                           # 45-49: random
    ]

    assert len(tokens) == 50

    token_tensor = torch.tensor([tokens], dtype=torch.long, device=device)

    with torch.no_grad():
        _, cache = model.run_with_cache(token_tensor)

    # Extract attention patterns
    # cache["pattern", layer] has shape [batch, n_heads, seq, seq]
    patterns = {}
    for layer in range(model.cfg.n_layers):
        pat = cache["pattern", layer][0]  # [n_heads, seq, seq]
        patterns[f"layer_{layer}"] = pat.tolist()

    # Save for comparison
    output = {
        "tokens": tokens,
        "patterns": patterns,
    }

    output_path = os.path.join(os.path.dirname(__file__), "checkpoints", "python_patterns.json")
    with open(output_path, "w") as f:
        json.dump(output, f)

    print(f"Saved Python attention patterns to {output_path}")
    print(f"Sequence: {''.join(chr(65 + t) for t in tokens)}")
    print(f"Pattern positions: 10-19 and 35-44 (offset=25)")

    # Print some key attention values for sanity
    for layer in range(model.cfg.n_layers):
        pat = cache["pattern", layer][0]
        print(f"\nLayer {layer}:")
        for head in range(model.cfg.n_heads):
            # Check attention from pattern position 36 to position 11
            # (position 36 is the second token of the second pattern occurrence)
            # It should attend to position 11 (second token of first occurrence)
            # if this is an induction head
            attn_36_11 = pat[head, 36, 11].item()
            attn_36_0 = pat[head, 36, 0].item()
            print(f"  Head {head}: attn[36→11]={attn_36_11:.4f}, attn[36→0]={attn_36_0:.4f}")


if __name__ == "__main__":
    main()
