"""
Generate test vectors for TypeScript parity check.

Runs the Python model on fixed token sequences, saves inputs + expected
logits to JSON for the TS parity test.
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

    # Fixed test sequences (deterministic seeds)
    test_cases = []
    seeds = [0, 42, 123, 999, 7777]
    lengths = [1, 5, 15, 30]

    for seed in seeds:
        for length in lengths:
            torch.manual_seed(seed)
            tokens = torch.randint(0, 20, (1, length))

            with torch.no_grad():
                logits = model(tokens)

            test_cases.append({
                "seed": seed,
                "length": length,
                "tokens": tokens[0].tolist(),
                "logits": logits[0].tolist(),
            })

    output_path = os.path.join(os.path.dirname(__file__), "checkpoints", "test_vectors.json")
    with open(output_path, "w") as f:
        json.dump(test_cases, f)

    print(f"Generated {len(test_cases)} test cases -> {output_path}")
    for tc in test_cases:
        print(f"  seed={tc['seed']}, len={tc['length']}, "
              f"tokens[:5]={tc['tokens'][:5]}..., "
              f"logits[:3]={tc['logits'][0][:3]}")


if __name__ == "__main__":
    main()
