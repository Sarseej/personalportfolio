"""
Export trained model weights and sample activations to JSON.

Format (all values are plain JSON lists, human-readable):

{
  "config": {
    "d_model": 128, "n_heads": 4, "n_layers": 2,
    "d_head": 32, "d_vocab": 50, "n_ctx": 128
  },
  "W_E": [[...], ...],       // [d_vocab, d_model]
  "W_U": [[...], ...],       // [d_model, d_vocab]
  "W_pos": [[...], ...],     // [n_ctx, d_model]
  "layers": [
    {
      "W_Q": [[...], ...],   // [n_heads, d_model, d_head]
      "W_K": [[...], ...],   // [n_heads, d_model, d_head]
      "W_V": [[...], ...],   // [n_heads, d_model, d_head]
      "W_O": [[...], ...]    // [n_heads, d_head, d_model]
    },
    ...
  ],
  "sample_activations": {
    "prompt_tokens": [...],  // the input token IDs
    "attention_patterns": {
      "layer_0": [[...], ...],  // [n_heads, seq, seq] per layer
      ...
    },
    "logits": [[...], ...]   // [seq, d_vocab]
  }
}
"""

import os
import sys
import json
import torch

sys.path.insert(0, os.path.dirname(__file__))

from data import generate_batch
from model import build_model


def tensor_to_list(t: torch.Tensor) -> list:
    """Recursively convert a tensor to nested Python lists for JSON."""
    return t.detach().cpu().float().tolist()


def export_weights(model, output_path: str):
    """Export model weights to JSON."""
    print("Exporting weights...")

    weights = {
        "config": {
            "d_model": model.cfg.d_model,
            "n_heads": model.cfg.n_heads,
            "n_layers": model.cfg.n_layers,
            "d_head": model.cfg.d_head,
            "d_vocab": model.cfg.d_vocab,
            "n_ctx": model.cfg.n_ctx,
        },
        "W_E": tensor_to_list(model.W_E),
        "W_U": tensor_to_list(model.W_U),
        "W_pos": tensor_to_list(model.W_pos),
        "layers": [],
    }

    for layer in range(model.cfg.n_layers):
        layer_weights = {
            "W_Q": tensor_to_list(model.W_Q[layer]),
            "W_K": tensor_to_list(model.W_K[layer]),
            "W_V": tensor_to_list(model.W_V[layer]),
            "W_O": tensor_to_list(model.W_O[layer]),
        }
        weights["layers"].append(layer_weights)

    print(f"  W_E shape: {list(model.W_E.shape)}")
    print(f"  W_U shape: {list(model.W_U.shape)}")
    print(f"  W_pos shape: {list(model.W_pos.shape)}")
    for layer in range(model.cfg.n_layers):
        print(f"  Layer {layer} W_Q shape: {list(model.W_Q[layer].shape)}")

    return weights


def export_activations(model, output_path: str, seq_len: int = 50, vocab_size: int = 50):
    """Run model on a sample prompt and export cached attention patterns."""
    print("Computing sample activations...")

    model.eval()
    tokens = generate_batch(1, seq_len, vocab_size, model.cfg.device)

    with torch.no_grad():
        logits, cache = model.run_with_cache(tokens)

    patterns = {}
    for layer in range(model.cfg.n_layers):
        pattern = cache["pattern", layer][0]  # [n_heads, seq, seq]
        patterns[f"layer_{layer}"] = tensor_to_list(pattern)

    activations = {
        "prompt_tokens": tokens[0].tolist(),
        "attention_patterns": patterns,
        "logits": tensor_to_list(logits[0]),
    }

    print(f"  Prompt length: {tokens.shape[1]} tokens")
    print(f"  Attention layers cached: {list(patterns.keys())}")

    return activations


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

    model = build_model(d_vocab=50, device=device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device, weights_only=True))
    model.eval()
    print(f"Loaded trained model from {checkpoint_path}")

    # Export
    output = {
        **export_weights(model, checkpoint_path),
        "sample_activations": export_activations(model, checkpoint_path),
    }

    output_path = os.path.join(checkpoint_dir, "model_weights.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nExported to {output_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
