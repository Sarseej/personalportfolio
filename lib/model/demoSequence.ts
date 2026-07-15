/**
 * Demo sequence generator — port of training/data.py.
 *
 * Generates a single induction-task sequence:
 *   1. Fill with random tokens (vocab 0-19)
 *   2. Pick a random contiguous pattern (8-25 tokens)
 *   3. Place it at two random non-overlapping positions
 *
 * The offset between occurrences varies, so the model cannot use a
 * fixed-position shortcut — it must match by token identity.
 */

export interface DemoSequence {
  tokens: number[];
  /** Start of first pattern occurrence. */
  patternStart1: number;
  /** Start of second pattern occurrence. */
  patternStart2: number;
  /** Length of the repeated pattern. */
  patternLen: number;
  /** Offset between the two occurrences. */
  offset: number;
}

/** Int in [min, max] inclusive. */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const VOCAB_SIZE = 20;
const SEQ_LEN = 50; // shorter for display (not 100 — too wide for heatmap)

/**
 * Generate one random induction-task sequence.
 *
 * Uses a shorter sequence (50 tokens) for visual clarity.
 */
export function generateDemoSequence(): DemoSequence {
  // Start with random tokens
  const tokens: number[] = [];
  for (let i = 0; i < SEQ_LEN; i++) {
    tokens.push(randInt(0, VOCAB_SIZE - 1));
  }

  // Pattern length: 8-25, but must leave room for two copies + gap
  const maxPattern = Math.min(25, Math.floor(SEQ_LEN / 3));
  const minPattern = Math.min(8, maxPattern);
  let patternLen = randInt(minPattern, maxPattern);

  // First occurrence start
  const maxStart1 = SEQ_LEN - 2 * patternLen;
  let start1: number;
  if (maxStart1 <= 0) {
    start1 = 0;
  } else {
    start1 = randInt(0, maxStart1);
  }

  // Second occurrence start: after first + gap
  let minStart2 = start1 + patternLen + 1;
  let maxStart2 = SEQ_LEN - patternLen;

  if (minStart2 > maxStart2) {
    // Shrink pattern to fit
    patternLen = Math.floor((maxStart2 - start1) / 2);
    if (patternLen < 2) patternLen = 2;
    minStart2 = start1 + patternLen + 1;
    maxStart2 = SEQ_LEN - patternLen;
  }

  const start2 = randInt(minStart2, maxStart2);

  // Copy the pattern from first occurrence to second
  for (let i = 0; i < patternLen; i++) {
    tokens[start2 + i] = tokens[start1 + i];
  }

  return {
    tokens,
    patternStart1: start1,
    patternStart2: start2,
    patternLen,
    offset: start2 - start1,
  };
}
