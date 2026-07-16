"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useModelStore } from "@/lib/store/useModelStore";
import { tokenToLetter } from "@/lib/model/tokenDisplay";
import {
  forwardPatched,
  forwardWithPatterns,
  type PatchSpec,
} from "@/lib/model/toyTransformer";
import { generateDemoSequence } from "@/lib/model/demoSequence";
import type { DemoSequence } from "@/lib/model/demoSequence";

interface PatchResult {
  cleanLogit: number;
  corruptedLogit: number;
  patchedLogit: number | null;
  totalEffect: number;
  recovered: number;
  recoveryPct: number;
}

/** Create a corrupted copy: change first occurrence tokens. */
function createCorrupted(seq: DemoSequence): {
  corrupted: number[];
  changedPositions: number[];
} {
  const tokens = [...seq.tokens];
  const changed: number[] = [];
  const firstTok = tokens[seq.patternStart1];
  const replacement = (firstTok + 1) % 20;
  for (let k = 0; k < seq.patternLen; k++) {
    tokens[seq.patternStart1 + k] = replacement;
    changed.push(seq.patternStart1 + k);
  }
  return { corrupted: tokens, changedPositions: changed };
}

function LogitBar({
  label,
  value,
  baseline,
  color,
  maxAbs,
}: {
  label: string;
  value: number;
  baseline: number;
  color: string;
  maxAbs: number;
}) {
  const barWidth = Math.min(100, (Math.abs(value) / maxAbs) * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-20 text-right font-mono text-xs"
        style={{ color: "var(--fg-muted)" }}
      >
        {label}
      </div>
      <div className="flex-1 h-5 rounded" style={{ backgroundColor: "#ffffff08" }}>
        <div
          className="h-full rounded transition-all"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            opacity: 0.6,
          }}
        />
      </div>
      <div className="w-20 text-right font-mono text-xs" style={{ color }}>
        {value > 0 ? "+" : ""}
        {value.toFixed(4)}
      </div>
    </div>
  );
}

export default function PatchingSandbox() {
  const weights = useModelStore((s) => s.weights);
  const loadWeights = useModelStore((s) => s.loadWeights);
  const weightsLoading = useModelStore((s) => s.weightsLoading);

  const [demoSeq, setDemoSeq] = useState<DemoSequence>(() =>
    generateDemoSequence()
  );
  const [corruptedTokens, setCorruptedTokens] = useState<number[]>([]);
  const [changedPositions, setChangedPositions] = useState<number[]>([]);

  const [patchSpec, setPatchSpec] = useState<PatchSpec | null>(null);
  const [result, setResult] = useState<PatchResult | null>(null);
  const [running, setRunning] = useState(false);

  // Generate corrupted on mount / demo change
  useEffect(() => {
    const { corrupted, changedPositions: cp } = createCorrupted(demoSeq);
    setCorruptedTokens(corrupted);
    setChangedPositions(cp);
    setResult(null);
    setPatchSpec(null);
  }, [demoSeq]);

  useEffect(() => {
    loadWeights();
  }, [loadWeights]);

  // Precompute clean/corrupted patterns for display
  const cleanPatterns = useMemo(() => {
    if (!weights) return null;
    const { patterns } = forwardWithPatterns(weights, demoSeq.tokens);
    return patterns;
  }, [weights, demoSeq]);

  const corruptedPatterns = useMemo(() => {
    if (!weights || corruptedTokens.length === 0) return null;
    const { patterns } = forwardWithPatterns(weights, corruptedTokens);
    return patterns;
  }, [weights, corruptedTokens]);

  const runPatch = useCallback(() => {
    if (!weights || !patchSpec) return;
    setRunning(true);

    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      const { cleanLogits, corruptedLogits, patchedLogits } = forwardPatched(
        weights,
        demoSeq.tokens,
        corruptedTokens,
        patchSpec,
      );

      const d_vocab = weights.config.d_vocab;
      const target = demoSeq.tokens[demoSeq.patternStart2]; // token at 2nd occurrence start

      const cleanLogit = cleanLogits[target];
      const corruptedLogit = corruptedLogits[target];
      const patchedLogit = patchedLogits ? patchedLogits[target] : null;

      const totalEffect = cleanLogit - corruptedLogit;
      const recovered =
        patchedLogit !== null ? patchedLogit - corruptedLogit : 0;
      const recoveryPct =
        Math.abs(totalEffect) > 1e-10
          ? (recovered / totalEffect) * 100
          : 0;

      setResult({
        cleanLogit,
        corruptedLogit,
        patchedLogit,
        totalEffect,
        recovered,
        recoveryPct,
      });
      setRunning(false);
    });
  }, [weights, demoSeq, corruptedTokens, patchSpec]);

  const nLayers = weights?.config.n_layers ?? 2;
  const seqLen = demoSeq.tokens.length;

  if (weightsLoading) {
    return (
      <div className="py-16 text-center" style={{ color: "var(--fg-muted)" }}>
        Loading model weights...
      </div>
    );
  }

  if (!weights) {
    return null;
  }

  const { patternStart1: s1, patternStart2: s2, patternLen: plen } = demoSeq;
  const targetTok = demoSeq.tokens[s2];

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="font-[family-name:var(--font-mono)] text-xl font-bold"
            style={{ color: "var(--fg)" }}
          >
            Causal Patching Sandbox
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
            Swap a clean activation into a corrupted run and measure how much
            of the clean prediction is restored
          </p>
        </div>
        <button
          onClick={() => setDemoSeq(generateDemoSequence())}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[#3b82f6] hover:text-white"
          style={{
            borderColor: "var(--border)",
            color: "var(--fg)",
          }}
        >
          New sequence
        </button>
      </div>

      {/* Sequence comparison */}
      <div
        className="mb-4 rounded-lg border p-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="mb-2 text-xs font-mono font-semibold"
          style={{ color: "var(--fg-muted)" }}
        >
          Clean vs. Corrupted
        </div>

        <div className="space-y-1 font-mono text-xs">
          {/* Clean */}
          <div className="flex items-center gap-2">
            <span className="w-16 text-right" style={{ color: "#3b82f6" }}>
              Clean:
            </span>
            <div className="flex flex-wrap gap-px">
              {demoSeq.tokens.map((tok, i) => {
                const inFirst = i >= s1 && i < s1 + plen;
                const inSecond = i >= s2 && i < s2 + plen;
                return (
                  <span
                    key={i}
                    className="inline-block text-center font-bold"
                    style={{
                      width: 16,
                      height: 20,
                      lineHeight: "20px",
                      fontSize: 10,
                      backgroundColor: inFirst
                        ? "#3b82f620"
                        : inSecond
                          ? "#3b82f610"
                          : "transparent",
                      borderBottom: inSecond
                        ? "2px solid #3b82f6"
                        : "2px solid transparent",
                      color: inFirst || inSecond ? "#3b82f6" : "var(--fg-muted)",
                    }}
                    title={`pos ${i}: ${tokenToLetter(tok)} (${tok})`}
                  >
                    {tokenToLetter(tok)}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Corrupted */}
          <div className="flex items-center gap-2">
            <span className="w-16 text-right" style={{ color: "#f59e0b" }}>
              Corrupted:
            </span>
            <div className="flex flex-wrap gap-px">
              {corruptedTokens.map((tok, i) => {
                const changed = changedPositions.includes(i);
                const inSecond = i >= s2 && i < s2 + plen;
                return (
                  <span
                    key={i}
                    className="inline-block text-center font-bold"
                    style={{
                      width: 16,
                      height: 20,
                      lineHeight: "20px",
                      fontSize: 10,
                      backgroundColor: changed
                        ? "#f59e0b20"
                        : inSecond
                          ? "#3b82f610"
                          : "transparent",
                      borderBottom: inSecond
                        ? "2px solid #3b82f6"
                        : "2px solid transparent",
                      color: changed
                        ? "#f59e0b"
                        : inSecond
                          ? "#3b82f6"
                          : "var(--fg-muted)",
                    }}
                    title={
                      changed
                        ? `pos ${i}: CHANGED to ${tokenToLetter(tok)}`
                        : `pos ${i}: ${tokenToLetter(tok)}`
                    }
                  >
                    {tokenToLetter(tok)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-4 font-mono text-xs" style={{ color: "var(--fg-muted)" }}>
          <span>
            <span style={{ color: "#3b82f6" }}>■</span> Pattern 1st occ
          </span>
          <span>
            <span style={{ color: "#3b82f6", opacity: 0.5 }}>■</span> Pattern 2nd
            occ
          </span>
          <span>
            <span style={{ color: "#f59e0b" }}>■</span> Changed
          </span>
          <span>
            Target: <span style={{ color: "var(--fg)" }}>{tokenToLetter(targetTok)}</span> (token{" "}
            {targetTok}) at pos {s2}
          </span>
        </div>
      </div>

      {/* Patch location picker */}
      <div
        className="mb-4 rounded-lg border p-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="mb-3 text-xs font-mono font-semibold"
          style={{ color: "var(--fg-muted)" }}
        >
          Patch location
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Layer selector */}
          <div>
            <div className="mb-1 text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
              Layer (residual after):
            </div>
            <div className="flex gap-1">
              {Array.from({ length: nLayers + 1 }, (_, l) => (
                <button
                  key={l}
                  onClick={() =>
                    setPatchSpec((prev) => ({
                      layer: l,
                      position: prev?.position ?? s1,
                    }))
                  }
                  className="rounded px-2 py-1 text-xs font-mono transition-colors"
                  style={{
                    backgroundColor:
                      patchSpec?.layer === l ? "#3b82f6" : "transparent",
                    color: patchSpec?.layer === l ? "#fff" : "var(--fg-muted)",
                    border: `1px solid ${patchSpec?.layer === l ? "#3b82f6" : "var(--border)"}`,
                  }}
                >
                  {l === nLayers ? `out` : `L${l}`}
                </button>
              ))}
            </div>
          </div>

          {/* Position selector */}
          <div className="flex-1">
            <div className="mb-1 text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
              Position:
            </div>
            <div className="flex flex-wrap gap-1">
              {[s1, s1 + 1, s1 + Math.floor(plen / 2), s2, s2 + 1, 0, Math.floor(seqLen / 2), seqLen - 1]
                .filter((v, i, arr) => arr.indexOf(v) === i && v < seqLen)
                .sort((a, b) => a - b)
                .map((pos) => {
                  const inFirst = pos >= s1 && pos < s1 + plen;
                  const inSecond = pos >= s2 && pos < s2 + plen;
                  let tag = `P${pos}`;
                  if (pos === s1) tag = `P${pos} (1st)`;
                  else if (pos === s2) tag = `P${pos} (2nd)`;
                  else if (pos === 0) tag = `P0 (start)`;
                  else if (pos === seqLen - 1) tag = `P${pos} (end)`;

                  return (
                    <button
                      key={pos}
                      onClick={() =>
                        setPatchSpec((prev) => ({
                          layer: prev?.layer ?? 0,
                          position: pos,
                        }))
                      }
                      className="rounded px-2 py-1 text-xs font-mono transition-colors"
                      style={{
                        backgroundColor:
                          patchSpec?.position === pos
                            ? "#3b82f6"
                            : inFirst
                              ? "#3b82f610"
                              : "transparent",
                        color:
                          patchSpec?.position === pos
                            ? "#fff"
                            : inFirst
                              ? "#3b82f6"
                              : "var(--fg-muted)",
                        border: `1px solid ${
                          patchSpec?.position === pos
                            ? "#3b82f6"
                            : inFirst
                              ? "#3b82f640"
                              : "var(--border)"
                        }`,
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Run button */}
        <div className="mt-3">
          <button
            onClick={runPatch}
            disabled={!patchSpec || running}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: patchSpec ? "#3b82f6" : "var(--border)",
              color: patchSpec ? "#fff" : "var(--fg-muted)",
              opacity: running ? 0.6 : 1,
            }}
          >
            {running ? "Running..." : "Run patch"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="mb-3 text-xs font-mono font-semibold"
            style={{ color: "var(--fg-muted)" }}
          >
            Results — logit for token{" "}
            <span style={{ color: "var(--fg)" }}>
              {tokenToLetter(targetTok)} ({targetTok})
            </span>
          </div>

          <div className="space-y-2">
            <LogitBar
              label="Clean"
              value={result.cleanLogit}
              baseline={0}
              color="#3b82f6"
              maxAbs={0.1}
            />
            <LogitBar
              label="Corrupted"
              value={result.corruptedLogit}
              baseline={0}
              color="#f59e0b"
              maxAbs={0.1}
            />
            {result.patchedLogit !== null && (
              <LogitBar
                label="Patched"
                value={result.patchedLogit}
                baseline={0}
              color="#22c55e"
              maxAbs={0.1}
            />
            )}
          </div>

          {/* Recovery metric */}
          <div className="mt-4 rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
                  Total effect (clean − corrupted)
                </div>
                <div className="font-mono text-lg font-bold" style={{ color: "var(--fg)" }}>
                  {result.totalEffect > 0 ? "+" : ""}
                  {result.totalEffect.toFixed(4)}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
                  Recovered by patch
                </div>
                <div className="font-mono text-lg font-bold" style={{ color: "var(--fg)" }}>
                  {result.recovered > 0 ? "+" : ""}
                  {result.recovered.toFixed(4)}
                </div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
                  Logit-diff recovery
                </div>
                <div
                  className="font-mono text-2xl font-bold"
                  style={{
                    color:
                      Math.abs(result.recoveryPct) > 50
                        ? "#22c55e"
                        : Math.abs(result.recoveryPct) > 10
                          ? "#f59e0b"
                          : "var(--fg-muted)",
                  }}
                >
                  {result.recoveryPct > 0 ? "+" : ""}
                  {result.recoveryPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Interpretation */}
          <div
            className="mt-3 text-xs font-mono leading-relaxed"
            style={{ color: "var(--fg-muted)" }}
          >
            {Math.abs(result.recoveryPct) > 50 ? (
              <span>
                Strong recovery — the patched location contains the causal
                information for this prediction.
              </span>
            ) : Math.abs(result.recoveryPct) > 10 ? (
              <span>
                Partial recovery — some causal information flows through this
                location, but the representation is distributed across multiple
                positions.
              </span>
            ) : (
              <span>
                Minimal recovery — this location is not causally relevant for
                this prediction. Try patching at the first occurrence position
                at layer 0.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
