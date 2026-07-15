"""
Export trained model weights to JSON for hand-written TypeScript inference.

The exported weights use standard (un-folded) LayerNorm — no weight folding,
centering, or other transformations.  The TypeScript forward pass implements
textbook transformer math directly against these weights.

JSON shape reference (all values are flat or nested JS-style number arrays):

{
  "config": {
    "d_model": 128, "n_heads": 4, "n_layers": 2,
    "d_head": 32, "d_vocab": 20, "n_ctx": 128
  },
  "W_E":    [d_vocab, d_model]       // token embedding
  "W_pos":  [n_ctx, d_model]         // positional embedding
  "W_U":    [d_model, d_vocab]       // unembedding (no bias)
  "layers": [
    {
      "ln1_w": [d_model],            // LayerNorm gain (pre-attention)
      "ln1_b": [d_model],            // LayerNorm bias (pre-attention)
      "W_Q":   [n_heads, d_model, d_head],
      "b_Q":   [n_heads, d_head],
      "W_K":   [n_heads, d_model, d_head],
      "b_K":   [n_heads, d_head],
      "W_V":   [n_heads, d_model, d_head],
      "b_V":   [n_heads, d_head],
      "W_O":   [n_heads, d_head, d_model],
      "b_O":   [d_model]
    },
    ...
  ],
  "ln_final_w": [d_model],           // final LayerNorm gain
  "ln_final_b": [d_model]            // final LayerNorm bias
}
"""

import os
import sys
import json
import torch

sys.path.insert(0, os.path.dirname(__file__))

from model import build_model


def tensor_to_list(t: torch.Tensor) -> list:
    """Recursively convert a tensor to nested Python lists for JSON."""
    return t.detach().cpu().float().tolist()


def export_weights(model, output_path: str) -> dict:
    """Export all model weights needed for a textbook forward pass."""
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
        "W_pos": tensor_to_list(model.W_pos),
        "W_U": tensor_to_list(model.W_U),
        "layers": [],
    }

    for layer in range(model.cfg.n_layers):
        block = model.blocks[layer]
        layer_weights = {
            # Pre-attention LayerNorm
            "ln1_w": tensor_to_list(block.ln1.w),
            "ln1_b": tensor_to_list(block.ln1.b),
            # Attention weights
            "W_Q": tensor_to_list(block.attn.W_Q),
            "b_Q": tensor_to_list(block.attn.b_Q),
            "W_K": tensor_to_list(block.attn.W_K),
            "b_K": tensor_to_list(block.attn.b_K),
            "W_V": tensor_to_list(block.attn.W_V),
            "b_V": tensor_to_list(block.attn.b_V),
            "W_O": tensor_to_list(block.attn.W_O),
            "b_O": tensor_to_list(block.attn.b_O),
        }
        weights["layers"].append(layer_weights)

    # Final LayerNorm
    weights["ln_final_w"] = tensor_to_list(model.ln_final.w)
    weights["ln_final_b"] = tensor_to_list(model.ln_final.b)

    print(f"  W_E shape:     {list(model.W_E.shape)}")
    print(f"  W_pos shape:   {list(model.W_pos.shape)}")
    print(f"  W_U shape:     {list(model.W_U.shape)}")
    for layer in range(model.cfg.n_layers):
        print(f"  Layer {layer}: ln1 {list(model.blocks[layer].ln1.w.shape)}, "
              f"W_Q {list(model.blocks[layer].attn.W_Q.shape)}, "
              f"b_Q {list(model.blocks[layer].attn.b_Q.shape)}")
    print(f"  ln_final:      {list(model.ln_final.w.shape)}")

    return weights


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

    model = build_model(d_vocab=20, device=device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device, weights_only=True))
    model.eval()
    print(f"Loaded trained model from {checkpoint_path}")

    weights = export_weights(model, checkpoint_path)

    output_path = os.path.join(checkpoint_dir, "weights.json")
    with open(output_path, "w") as f:
        json.dump(weights, f, indent=2)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nExported to {output_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
