/**
 * Token display mapping — cosmetic only.
 *
 * The model operates on integer token IDs 0-19.
 * For human-readable display, we map them to letters A-T.
 * This has zero effect on model computation.
 */

const LETTERS = "ABCDEFGHIJKLMNOPQRST".split("");

/** Convert a token ID (0-19) to a display letter (A-T). */
export function tokenToLetter(id: number): string {
  return LETTERS[id] ?? `?${id}`;
}

/** Convert an array of token IDs to display letters. */
export function tokensToLetters(ids: number[]): string[] {
  return ids.map(tokenToLetter);
}
