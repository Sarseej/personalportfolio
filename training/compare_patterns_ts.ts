/**
 * Compare attention patterns: Python vs TypeScript.
 *
 * Loads Python reference patterns from python_patterns.json,
 * runs the same sequence through the TS forward pass, and compares.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { forwardWithPatterns, loadWeights, type RawWeights } from "../lib/model/toyTransformer";

interface PythonOutput {
  tokens: number[];
  patterns: {
    [layer: string]: number[][][]; // [n_heads][T][T]
  };
}

function main() {
  const trainDir = join(__dirname, "checkpoints");
  const modelDir = join(__dirname, "..", "training", "checkpoints");

  // Load TS weights
  const rawWeights: RawWeights = JSON.parse(
    readFileSync(join(modelDir, "weights.json"), "utf-8")
  );
  const weights = loadWeights(rawWeights);

  // Load Python reference
  const pythonOut: PythonOutput = JSON.parse(
    readFileSync(join(trainDir, "python_patterns.json"), "utf-8")
  );

  const tokens = pythonOut.tokens;
  console.log(`Sequence length: ${tokens.length}`);
  console.log(`Config: ${weights.config.n_layers}L x ${weights.config.n_heads}H`);

  // Run TS forward pass
  const { patterns: tsPatterns } = forwardWithPatterns(weights, tokens);

  // Compare
  let globalMaxDiff = 0;
  let globalSumDiff = 0;
  let globalCount = 0;

  for (let l = 0; l < weights.config.n_layers; l++) {
    const layerKey = `layer_${l}`;
    const pyLayer = pythonOut.patterns[layerKey];
    const tsLayer = tsPatterns[l];

    for (let h = 0; h < weights.config.n_heads; h++) {
      const pyHead = pyLayer[h];
      const tsHead = tsLayer[h];
      const T = tokens.length;

      let maxDiff = 0;
      let sumDiff = 0;
      let count = 0;

      for (let t = 0; t < T; t++) {
        for (let s = 0; s <= t; s++) {
          const pyVal = pyHead[t][s];
          const tsVal = tsHead[t][s];
          const diff = Math.abs(pyVal - tsVal);
          if (diff > maxDiff) maxDiff = diff;
          sumDiff += diff;
          count++;
        }
      }

      globalMaxDiff = Math.max(globalMaxDiff, maxDiff);
      globalSumDiff += sumDiff;
      globalCount += count;

      const meanDiff = sumDiff / count;
      const status = maxDiff < 1e-4 ? "PASS" : maxDiff < 1e-2 ? "WARN" : "FAIL";
      console.log(
        `${status} L${l}H${h}: max=${maxDiff.toExponential(2)}, mean=${meanDiff.toExponential(2)}`
      );
    }
  }

  const globalMeanDiff = globalSumDiff / globalCount;
  console.log(`\nMax absolute attention diff:  ${globalMaxDiff.toExponential(4)}`);
  console.log(`Mean absolute attention diff: ${globalMeanDiff.toExponential(4)}`);
  console.log(`Elements compared: ${globalCount}`);

  if (globalMaxDiff < 1e-3) {
    console.log("\nPARITY ACHIEVED — attention patterns match to floating-point precision.");
  } else if (globalMaxDiff < 1e-1) {
    console.log("\nSMALL DISCREPANCY — investigate.");
  } else {
    console.log("\nSTRUCTURAL MISMATCH — must investigate.");
  }
}

main();
