/**
 * Milestone 5 Step 6 deliverables: causal patching results.
 * Verifies TS matches Python (both now use TransformerLens's internal causal mask).
 *
 * Run with: npx tsx lib/model/crosscheck_patching.ts
 */

import * as fs from "fs";
import * as path from "path";
import { forwardPatched, loadWeights } from "./toyTransformer";
import type { PatchSpec } from "./toyTransformer";

const rawWeights = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../public/weights.json"), "utf-8"),
);
const weights = loadWeights(rawWeights);
const vec = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../training/checkpoints/patch_test_vectors.json"),
    "utf-8",
  ),
);

const ct: number[] = vec.clean_tokens;
const crr: number[] = vec.corrupted_tokens;
const s1: number = vec.s1;
const s2: number = vec.s2;
const plen: number = vec.plen;
const targetTok: number = vec.target_token;
const { d_vocab } = weights.config;

console.log(
  `Test vectors: seq_len=${ct.length}, s1=${s1}, s2=${s2}, plen=${plen}, target=${targetTok}\n`,
);

// Clean / corrupted baseline
const baseline = forwardPatched(weights, ct, crr, null);
const cleanLogit = baseline.cleanLogits[targetTok];
const corrLogit = baseline.corruptedLogits[targetTok];
const totalEffect = cleanLogit - corrLogit;

console.log(`Clean logit[target]:      ${cleanLogit.toFixed(6)}`);
console.log(`Corrupted logit[target]:  ${corrLogit.toFixed(6)}`);
console.log(`Total effect:            ${totalEffect.toFixed(6)}\n`);

const firstOcc = Array.from({ length: plen }, (_, i) => s1 + i);
const secondOcc = Array.from({ length: plen }, (_, i) => s2 + i);
const irrelevant = [48, 49];

const tests: { label: string; desc: string; spec: PatchSpec }[] = [
  {
    label: "A. L0, ALL 1st-occ positions",
    desc: "Induction-relevant: full clean first occurrence at L0 → L1",
    spec: { layer: 0, positions: firstOcc },
  },
  {
    label: "B. L0, single P15 (1st occ+1)",
    desc: "Partial: one clean position at L0 → L1",
    spec: { layer: 0, positions: [s1 + 1] },
  },
  {
    label: "C. L0, ALL 2nd-occ positions",
    desc: "Wrong location: restore second occurrence at L0 (irrelevant to P49)",
    spec: { layer: 0, positions: secondOcc },
  },
  {
    label: "D. L0, positions 48-49",
    desc: "Wrong location: end-of-sequence, no pattern content",
    spec: { layer: 0, positions: irrelevant },
  },
  {
    label: "E. L1, ALL 1st-occ positions",
    desc: "No recomputation: patch after last layer, no attention reruns",
    spec: { layer: 1, positions: firstOcc },
  },
  {
    label: "F. L1, single P14",
    desc: "No recomputation: patch after last layer",
    spec: { layer: 1, positions: [s1] },
  },
];

// Also check Python reference if available
const pyTests: Record<string, any> = vec.tests ?? {};

console.log(
  `${"Test".padEnd(48)} ${"TS Recovery".padStart(12)} ${"Py Recovery".padStart(12)} ${"Match?".padStart(8)}`,
);
console.log("-".repeat(84));

let allMatch = true;
for (const t of tests) {
  const result = forwardPatched(weights, ct, crr, t.spec);
  const patLogit = result.patchedLogits![targetTok];
  const recovered = patLogit - corrLogit;
  const recoveryPct =
    Math.abs(totalEffect) > 1e-10 ? (recovered / totalEffect) * 100 : 0;

  // Look up matching Python test by exact key pattern
  const pyKey = Object.keys(pyTests).find((k) => {
    if (t.label.startsWith("A.") && k.startsWith("A.")) return true;
    if (t.label.startsWith("B.") && k.startsWith("B.")) return true;
    if (t.label.startsWith("C.") && k.startsWith("C.")) return true;
    if (t.label.startsWith("D.") && k.startsWith("D.")) return true;
    if (t.label.startsWith("E.") && k.startsWith("E.")) return true;
    if (t.label.startsWith("F.") && k.startsWith("F.")) return true;
    return false;
  });
  const pyPct = pyKey ? pyTests[pyKey].recovery_pct : null;

  const matchStr =
    pyPct !== null
      ? Math.abs(recoveryPct - pyPct) < 0.2
        ? "✓"
        : `✗ (${Math.abs(recoveryPct - pyPct).toFixed(1)}%)`
      : "—";

  if (pyPct !== null && Math.abs(recoveryPct - pyPct) >= 0.2) allMatch = false;

  console.log(
    `${t.label.padEnd(48)} ${(recoveryPct.toFixed(1) + "%").padStart(12)} ${pyPct !== null ? (pyPct.toFixed(1) + "%").padStart(12) : "—".padStart(12)} ${matchStr.padStart(8)}`,
  );
}

console.log("-".repeat(84));
console.log(
  allMatch ? "✓ TS and Python agree on all tests." : "✗ DISCREPANCY DETECTED",
);

console.log(`\n${"=".repeat(70)}`);
console.log("SUMMARY");
console.log(`${"=".repeat(70)}`);

const a = forwardPatched(weights, ct, crr, { layer: 0, positions: firstOcc });
const aRec =
  ((a.patchedLogits![targetTok] - corrLogit) / totalEffect) * 100;

const d = forwardPatched(weights, ct, crr, { layer: 0, positions: irrelevant });
const dRec =
  ((d.patchedLogits![targetTok] - corrLogit) / totalEffect) * 100;

const e = forwardPatched(weights, ct, crr, { layer: 1, positions: firstOcc });
const eRec =
  ((e.patchedLogits![targetTok] - corrLogit) / totalEffect) * 100;

console.log(
  `  A (L0, full 1st occ):  ${aRec.toFixed(1).padStart(5)}% recovery  ← induction-relevant`,
);
console.log(
  `  D (L0, end-of-seq):    ${dRec.toFixed(1).padStart(5)}% recovery  ← irrelevant control`,
);
console.log(
  `  E (L1, full 1st occ):  ${eRec.toFixed(1).padStart(5)}% recovery  ← no recomputation`,
);

if (aRec > 5 && Math.abs(dRec) < 5 && Math.abs(eRec) < 0.1) {
  console.log("\n✓ Pattern matches expectations:");
  console.log("  High recovery at induction-relevant location, low elsewhere.");
} else {
  console.log("\n⚠ Recovery pattern does not clearly match expectations.");
}
