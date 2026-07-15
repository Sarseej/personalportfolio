/**
 * Numerical parity test: Python model vs hand-written TypeScript.
 *
 * Loads weights.json + test_vectors.json, runs the TS forward pass,
 * and compares logits element-wise against Python outputs.
 *
 * Usage: npx tsx training/parity_test.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { forward, loadWeights, type RawWeights } from "../lib/model/toyTransformer";

interface TestCase {
  seed: number;
  length: number;
  tokens: number[];
  logits: number[][];
}

function main() {
  const baseDir = join(__dirname, "checkpoints");

  // Load weights
  const rawWeights: RawWeights = JSON.parse(
    readFileSync(join(baseDir, "weights.json"), "utf-8")
  );
  const weights = loadWeights(rawWeights);

  console.log(`Config: ${weights.config.d_model}d, ${weights.config.n_heads}H, ${weights.config.n_layers}L`);
  console.log(`Vocab: ${weights.config.d_vocab}, d_head: ${weights.config.d_head}\n`);

  // Load test vectors
  const testCases: TestCase[] = JSON.parse(
    readFileSync(join(baseDir, "test_vectors.json"), "utf-8")
  );

  let globalMaxDiff = 0;
  let globalSumDiff = 0;
  let globalCount = 0;
  let allPass = true;

  for (const tc of testCases) {
    const pyLogits = Float64Array.from(tc.logits.flat());
    const tsLogits = forward(weights, tc.tokens);

    if (pyLogits.length !== tsLogits.length) {
      console.log(
        `FAIL seed=${tc.seed} len=${tc.length}: ` +
        `shape mismatch ${pyLogits.length} vs ${tsLogits.length}`
      );
      allPass = false;
      continue;
    }

    // Compute per-element absolute difference
    let maxDiff = 0;
    let sumDiff = 0;
    let maxDiffIdx = 0;
    for (let i = 0; i < pyLogits.length; i++) {
      const diff = Math.abs(pyLogits[i] - tsLogits[i]);
      if (diff > maxDiff) {
        maxDiff = diff;
        maxDiffIdx = i;
      }
      sumDiff += diff;
    }
    const meanDiff = sumDiff / pyLogits.length;

    globalMaxDiff = Math.max(globalMaxDiff, maxDiff);
    globalSumDiff += sumDiff;
    globalCount += pyLogits.length;

    const status = maxDiff < 1e-3 ? "PASS" : maxDiff < 1e-1 ? "WARN" : "FAIL";
    if (status !== "PASS") allPass = false;

    const maxDiffPy = pyLogits[maxDiffIdx];
    const maxDiffTs = tsLogits[maxDiffIdx];
    const pos = { row: Math.floor(maxDiffIdx / weights.config.d_vocab), col: maxDiffIdx % weights.config.d_vocab };

    console.log(
      `${status} seed=${String(tc.seed).padStart(4)} len=${String(tc.length).padStart(2)}: ` +
      `max_diff=${maxDiff.toExponential(3)} (at [${pos.row},${pos.col}]: ` +
      `py=${maxDiffPy.toFixed(6)}, ts=${maxDiffTs.toFixed(6)}), ` +
      `mean_diff=${meanDiff.toExponential(3)}`
    );
  }

  const globalMeanDiff = globalSumDiff / globalCount;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  Max absolute logit diff:  ${globalMaxDiff.toExponential(4)}`);
  console.log(`  Mean absolute logit diff: ${globalMeanDiff.toExponential(4)}`);
  console.log(`  Total elements compared:  ${globalCount}`);
  console.log();

  if (globalMaxDiff < 1e-3) {
    console.log("VERDICT: PARITY ACHIEVED (< 1e-3 max diff, floating-point noise)");
  } else if (globalMaxDiff < 1e-1) {
    console.log("VERDICT: SMALL DISCREPANCY (1e-3 to 1e-1) — investigate");
  } else {
    console.log("VERDICT: STRUCTURAL MISMATCH (> 1e-1) — must investigate");
  }
}

main();
