"use client";

import { useState, useEffect, useMemo } from "react";
import { useModelStore } from "@/lib/store/useModelStore";
import { tokenToLetter } from "@/lib/model/tokenDisplay";
import type { AttentionPatterns } from "@/lib/model/toyTransformer";

/** Map attention weight (0-1) to a blue intensity color. */
function attnColor(w: number, masked: boolean): string {
  if (masked) return "transparent";
  // Single-hue blue scale: 0 = bg, 1 = full blue
  const r = Math.round(59 * w);
  const g = Math.round(130 * w);
  const b = Math.round(246 * w);
  return `rgb(${r}, ${g}, ${b})`;
}

function HeadSelector({
  nLayers,
  nHeads,
  selected,
  onSelect,
}: {
  nLayers: number;
  nHeads: number;
  selected: { layer: number; head: number };
  onSelect: (layer: number, head: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: nLayers }, (_, l) =>
        Array.from({ length: nHeads }, (_, h) => {
          const active = l === selected.layer && h === selected.head;
          return (
            <button
              key={`${l}-${h}`}
              onClick={() => onSelect(l, h)}
              className="rounded-md px-2 py-1 text-xs font-mono transition-colors"
              style={{
                backgroundColor: active ? "#3b82f6" : "transparent",
                color: active ? "#fff" : "var(--fg-muted)",
                border: `1px solid ${active ? "#3b82f6" : "var(--border)"}`,
              }}
            >
              L{l}H{h}
            </button>
          );
        }),
      )}
    </div>
  );
}

function Heatmap({
  pattern,
  tokens,
}: {
  pattern: number[][]; // [T][T]
  tokens: number[];
}) {
  const T = tokens.length;

  // Find max weight for normalization
  const maxWeight = useMemo(() => {
    let m = 0;
    for (let t = 0; t < T; t++) {
      for (let s = 0; s <= t; s++) {
        if (pattern[t][s] > m) m = pattern[t][s];
      }
    }
    return m || 1;
  }, [pattern, T]);

  const cellSize = Math.min(12, Math.floor(560 / T));

  return (
    <div className="overflow-x-auto">
      {/* Token labels (keys) */}
      <div className="flex items-start">
        {/* Spacer for query labels */}
        <div style={{ width: cellSize * 2 + 4 }} />
        <div className="flex" style={{ gap: 0 }}>
          {tokens.map((tok, i) => (
            <div
              key={`k${i}`}
              className="text-center font-mono font-bold"
              style={{
                width: cellSize,
                fontSize: Math.min(10, cellSize - 2),
                color: "var(--fg-muted)",
                lineHeight: `${cellSize}px`,
              }}
            >
              {tokenToLetter(tok)}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap rows (queries) */}
      {pattern.map((row, t) => (
        <div key={t} className="flex items-start">
          {/* Query label */}
          <div
            className="font-mono font-bold text-right pr-1"
            style={{
              width: cellSize * 2 + 4,
              fontSize: Math.min(10, cellSize - 2),
              color: "var(--fg-muted)",
              lineHeight: `${cellSize}px`,
            }}
          >
            {tokenToLetter(tokens[t])}
          </div>
          {/* Cells */}
          <div className="flex" style={{ gap: 0 }}>
            {row.map((w, s) => {
              const masked = s > t; // causal mask: upper triangle
              return (
                <div
                  key={s}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: masked ? "#ffffff05" : attnColor(w / maxWeight, false),
                    opacity: masked ? 0.15 : 1,
                  }}
                  title={
                    masked
                      ? `masked (causal)`
                      : `q[${t}]→k[${s}]: ${w.toFixed(4)}`
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AttentionMatrix() {
  const weights = useModelStore((s) => s.weights);
  const weightsLoading = useModelStore((s) => s.weightsLoading);
  const loadWeights = useModelStore((s) => s.loadWeights);
  const demoSequence = useModelStore((s) => s.demoSequence);
  const patterns = useModelStore((s) => s.patterns);
  const regenerateDemo = useModelStore((s) => s.regenerateDemo);

  const [selected, setSelected] = useState({ layer: 1, head: 0 });

  useEffect(() => {
    loadWeights();
  }, [loadWeights]);

  const nLayers = weights?.config.n_layers ?? 2;
  const nHeads = weights?.config.n_heads ?? 4;

  // Highlight pattern positions
  const { patternStart1, patternStart2, patternLen, offset } = demoSequence;

  if (weightsLoading) {
    return (
      <div className="py-16 text-center" style={{ color: "var(--fg-muted)" }}>
        Loading model weights...
      </div>
    );
  }

  if (!patterns) {
    return (
      <div className="py-16 text-center" style={{ color: "var(--fg-muted)" }}>
        Initializing inference...
      </div>
    );
  }

  const headPattern = patterns[selected.layer][selected.head];

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="font-[family-name:var(--font-mono)] text-xl font-bold"
            style={{ color: "var(--fg)" }}
          >
            Attention Patterns
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
            Real inference on a variable-offset induction sequence
          </p>
        </div>
        <button
          onClick={regenerateDemo}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[#3b82f6] hover:text-white"
          style={{
            borderColor: "var(--border)",
            color: "var(--fg)",
          }}
        >
          Regenerate sequence
        </button>
      </div>

      {/* Sequence info */}
      <div
        className="mb-4 rounded-lg border p-3 font-mono text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--fg-muted)",
        }}
      >
        <span style={{ color: "var(--fg)" }}>Pattern:</span>{" "}
        positions {patternStart1}–{patternStart1 + patternLen - 1} &amp;{" "}
        {patternStart2}–{patternStart2 + patternLen - 1}{" "}
        <span style={{ color: "#3b82f6" }}>({patternLen} tokens, offset={offset})</span>
        {" | "}
        <span style={{ color: "var(--fg)" }}>Sequence:</span>{" "}
        {demoSequence.tokens.map(tokenToLetter).join("")}
      </div>

      {/* Head selector */}
      <div className="mb-4">
        <HeadSelector
          nLayers={nLayers}
          nHeads={nHeads}
          selected={selected}
          onSelect={(l, h) => setSelected({ layer: l, head: h })}
        />
      </div>

      {/* Heatmap */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mb-2 text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
          Layer {selected.layer}, Head {selected.head} — Query ↓ · Key →
        </div>
        <Heatmap pattern={headPattern} tokens={demoSequence.tokens} />
      </div>

      {/* All 8 heads mini-grid */}
      <div className="mt-6">
        <div
          className="mb-3 text-xs font-mono font-semibold"
          style={{ color: "var(--fg-muted)" }}
        >
          All heads overview
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
          {Array.from({ length: nLayers }, (_, l) =>
            Array.from({ length: nHeads }, (_, h) => (
              <div
                key={`${l}-${h}`}
                className="cursor-pointer rounded border p-2 transition-colors"
                style={{
                  borderColor:
                    l === selected.layer && h === selected.head
                      ? "#3b82f6"
                      : "var(--border)",
                }}
                onClick={() => setSelected({ layer: l, head: h })}
              >
                <div
                  className="mb-1 text-center text-xs font-mono font-bold"
                  style={{
                    color:
                      l === selected.layer && h === selected.head
                        ? "#3b82f6"
                        : "var(--fg-muted)",
                  }}
                >
                  L{l}H{h}
                </div>
                <MiniHeatmap pattern={patterns[l][h]} tokens={demoSequence.tokens} />
              </div>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

/** Tiny heatmap for the overview grid — no labels, just colored cells. */
function MiniHeatmap({
  pattern,
  tokens,
}: {
  pattern: number[][];
  tokens: number[];
}) {
  const T = tokens.length;
  const maxWeight = useMemo(() => {
    let m = 0;
    for (let t = 0; t < T; t++) {
      for (let s = 0; s <= t; s++) {
        if (pattern[t][s] > m) m = pattern[t][s];
      }
    }
    return m || 1;
  }, [pattern, T]);

  const cellSize = Math.min(4, Math.floor(120 / T));

  return (
    <div className="flex flex-col items-center">
      {pattern.map((row, t) => (
        <div key={t} className="flex">
          {row.map((w, s) => {
            const masked = s > t;
            return (
              <div
                key={s}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: masked
                    ? "transparent"
                    : attnColor(w / maxWeight, false),
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
