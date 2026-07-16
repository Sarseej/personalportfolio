"""
Cross-check: compare TS attention patterns against Python TransformerLens
on an EXACT sequence, for a specific query position.

Usage: python training/crosscheck_attention.py
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))

import torch
from model import build_model

# Load model
device = "cpu"
checkpoint_path = os.path.join(os.path.dirname(__file__), "checkpoints", "model_tl.pt")
model = build_model(d_vocab=20, device=device)
model.load_state_dict(torch.load(checkpoint_path, map_location=device, weights_only=True))
model.eval()

# Exact sequence: BMQRELDJFSCLBGNNKSTBDERRANEGSJKSIEANKSTBDERRANEGSH
seq_str = "BMQRELDJFSCLBGNNKSTBDERRANEGSJKSIEANKSTBDERRANEGSH"
letter_to_id = {chr(65+i): i for i in range(20)}
tokens = torch.tensor([[letter_to_id[c] for c in seq_str]], device=device)

print(f"Sequence length: {tokens.shape[1]}")
print(f"Tokens: {tokens[0].tolist()}")

# Run with cache
logits, cache = model.run_with_cache(tokens)

# Extract attention patterns: cache["pattern", layer] is [batch, n_heads, seq, seq]
pattern_l1 = cache["pattern", 1][0]  # [n_heads, seq, seq]

q = 40  # query position
T = tokens.shape[1]

print(f"\n=== Query position {q} (token_id={tokens[0,q].item()}) ===")
print(f"Pattern: positions 15-28 & 35-48, len=14, offset=20\n")

# Print per-head distributions
for h in [0, 2, 3]:
    head_pattern = pattern_l1[h]  # [seq, seq]
    attn_dist = head_pattern[q, :q]  # keys 0..39

    print(f"--- L1H{h} (query pos {q}) ---")
    print(f"  SUM of keys 0-{q-1}: {attn_dist.sum().item():.6f}")

    # Print non-negligible entries sorted by weight
    entries = []
    for k in range(q):
        w = attn_dist[k].item()
        if w > 0.001:
            entries.append((k, tokens[0,k].item(), w))
    entries.sort(key=lambda x: -x[2])
    for pos, tok, w in entries:
        in_first = 15 <= pos < 29
        in_second = 35 <= pos < 49
        marker = " [1st occ]" if in_first else (" [2nd occ]" if in_second else "")
        print(f"  key {pos:>2}(id={tok}): {w:.6f}{marker}")
    print()

# Combined weight for pos 40 -> pos 21
combined = sum(pattern_l1[h][q, 21].item() for h in [0, 2, 3])
print(f"=== Combined weight (L1H0+H2+H3) for pos 40 -> pos 21 ===")
for h in [0, 2, 3]:
    print(f"  L1H{h}[40][21]: {pattern_l1[h][q, 21].item():.6f}")
print(f"  SUM:           {combined:.6f}")

# Also dump full CSV for programmatic comparison
print("\n=== CSV format (for diff) ===")
print("pos,token_id,L1H0,L1H2,L1H3")
for k in range(q):
    vals = [pattern_l1[h][q, k].item() for h in [0, 2, 3]]
    print(f"{k},{tokens[0,k].item()},{vals[0]:.10f},{vals[1]:.10f},{vals[2]:.10f}")
