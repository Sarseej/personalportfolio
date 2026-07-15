"""
Synthetic induction task data generation.

The task: sequences where a random contiguous subsequence appears twice at
random positions with a variable offset. The model must learn token-identity-
based matching ("where did I see this token before?") rather than a fixed-
offset shortcut ("always attend back N positions").
"""

import torch


def generate_batch(
    batch_size: int,
    seq_len: int = 100,
    vocab_size: int = 50,
    device: torch.device | str = "cpu",
) -> torch.Tensor:
    """Generate a batch of induction task sequences with variable repeat offset.

    Each sequence has a random contiguous pattern (10-20 tokens) embedded
    at two random non-overlapping positions. Everything else is fresh random
    tokens. The offset between the two occurrences varies per sequence.

    Returns:
        Tensor of shape [batch_size, seq_len] with values in [0, vocab_size).
    """
    device = torch.device(device)

    sequences = []
    for _ in range(batch_size):
        seq = _generate_single(seq_len, vocab_size, device)
        sequences.append(seq)

    return torch.stack(sequences)


def _generate_single(
    seq_len: int,
    vocab_size: int,
    device: torch.device,
) -> torch.Tensor:
    """Generate a single sequence with a randomly placed repeated pattern."""
    # Start with all random tokens
    seq = torch.randint(0, vocab_size, (seq_len,), device=device)

    # Pick a random pattern length (at least 8, at most 25, but no more
    # than seq_len // 3 to ensure room for two non-overlapping copies)
    max_pattern = min(25, seq_len // 3)
    min_pattern = min(8, max_pattern)
    pattern_len = torch.randint(min_pattern, max_pattern + 1, (1,)).item()

    # Pick first occurrence start: must leave room for pattern + gap + pattern
    max_start1 = seq_len - 2 * pattern_len
    if max_start1 <= 0:
        # Fallback for very short sequences
        start1 = 0
        start2 = pattern_len
    else:
        start1 = torch.randint(0, max_start1 + 1, (1,)).item()
        # Pick second occurrence start: after first occurrence ends, with
        # at least 1 token gap, and room for pattern
        min_start2 = start1 + pattern_len + 1
        max_start2 = seq_len - pattern_len
        if min_start2 > max_start2:
            # Shrink pattern to fit
            pattern_len = (max_start2 - start1) // 2
            if pattern_len < 2:
                pattern_len = 2
            min_start2 = start1 + pattern_len + 1
            max_start2 = seq_len - pattern_len
        start2 = torch.randint(min_start2, max_start2 + 1, (1,)).item()

    # Extract the pattern from the first occurrence and copy to second
    pattern = seq[start1 : start1 + pattern_len].clone()
    seq[start2 : start2 + pattern_len] = pattern

    return seq


def get_batch_metadata(batch_size: int, tokens: torch.Tensor) -> list[dict]:
    """For validation: recover the repeat structure from a generated batch.

    This scans each sequence to find the repeated pattern positions.
    Returns a list of dicts with keys:
        'pattern_start1': start of first occurrence
        'pattern_start2': start of second occurrence
        'pattern_len': length of pattern
        'offset': distance between occurrences (start2 - start1)
        'repeat_positions': list of positions in the second occurrence
    """
    metadata = []
    for b in range(batch_size):
        seq = tokens[b].tolist()
        info = _find_repeat_structure(seq)
        metadata.append(info)
    return metadata


def _find_repeat_structure(seq: list[int]) -> dict:
    """Find the longest repeated contiguous pattern in a sequence."""
    n = len(seq)
    best = None

    # Try all possible pattern lengths (longest first for efficiency)
    for pat_len in range(n // 2, 1, -1):
        # Try all possible start positions for the first occurrence
        for s1 in range(n - 2 * pat_len + 1):
            pattern = seq[s1 : s1 + pat_len]
            # Search for a second occurrence after s1 + pat_len
            for s2 in range(s1 + pat_len, n - pat_len + 1):
                if seq[s2 : s2 + pat_len] == pattern:
                    if best is None or pat_len > best["pattern_len"]:
                        best = {
                            "pattern_start1": s1,
                            "pattern_start2": s2,
                            "pattern_len": pat_len,
                            "offset": s2 - s1,
                            "repeat_positions": list(range(s2, s2 + pat_len)),
                        }
        if best is not None and best["pattern_len"] >= pat_len:
            # Found a pattern of this length, no need to check shorter
            break

    if best is None:
        # No repeated pattern found (shouldn't happen with our generator)
        best = {
            "pattern_start1": 0,
            "pattern_start2": 0,
            "pattern_len": 0,
            "offset": 0,
            "repeat_positions": [],
        }

    return best


if __name__ == "__main__":
    batch = generate_batch(4, seq_len=100, vocab_size=50)
    print(f"Batch shape: {batch.shape}")

    metadata = get_batch_metadata(4, batch)
    for i, m in enumerate(metadata):
        print(
            f"  Seq {i}: pattern_len={m['pattern_len']}, "
            f"offset={m['offset']}, "
            f"first@{m['pattern_start1']}, second@{m['pattern_start2']}"
        )
