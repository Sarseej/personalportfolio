"use client";

/**
 * Static findings panel summarising the SAE investigation.
 * No live computation — presents completed experiment results.
 */

const DENSE_MSE = 0.00171;

interface DataPoint {
  label: string;
  l0: number;
  mseRatio: number;
  deadPct: number;
  dDict: number;
  k: number;
}

const DATA: DataPoint[] = [
  { label: "Dense (L1)", l0: 223.6, mseRatio: 1.0, deadPct: 36, dDict: 512, k: 0 },
  { label: "k=8", l0: 8.0, mseRatio: 547, deadPct: 58, dDict: 512, k: 8 },
  { label: "k=16", l0: 16.0, mseRatio: 206, deadPct: 57, dDict: 512, k: 16 },
  { label: "k=32", l0: 32.0, mseRatio: 61.6, deadPct: 52, dDict: 512, k: 32 },
  { label: "k=64", l0: 64.0, mseRatio: 10.0, deadPct: 45, dDict: 512, k: 64 },
  { label: "k=96", l0: 96.0, mseRatio: 3.2, deadPct: 35, dDict: 512, k: 96 },
  { label: "d256 k=32", l0: 32.0, mseRatio: 67.2, deadPct: 24, dDict: 256, k: 32 },
  { label: "d256 k=64", l0: 64.0, mseRatio: 12.1, deadPct: 15, dDict: 256, k: 64 },
  { label: "d128 k=32", l0: 32.0, mseRatio: 129, deadPct: 4, dDict: 128, k: 32 },
  { label: "d128 k=64", l0: 64.0, mseRatio: 35.3, deadPct: 0, dDict: 128, k: 64 },
];

// Chart dimensions
const CHART_W = 520;
const CHART_H = 200;
const PAD = { top: 20, right: 20, bottom: 36, left: 50 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

// X: L0 linear 0–250, Y: MSE ratio log scale 1–1000
function xScale(l0: number): number {
  return PAD.left + (l0 / 250) * INNER_W;
}
function yScale(ratio: number): number {
  const logMin = Math.log10(1);
  const logMax = Math.log10(1000);
  const logVal = Math.log10(Math.max(1, ratio));
  return PAD.top + INNER_H - ((logVal - logMin) / (logMax - logMin)) * INNER_H;
}

function ScatterChart() {
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ maxWidth: CHART_W }}
    >
      {/* Grid lines */}
      {[1, 10, 100, 1000].map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={CHART_W - PAD.right}
          y1={yScale(v)}
          y2={yScale(v)}
          stroke="var(--border)"
          strokeDasharray="2,4"
          opacity={0.5}
        />
      ))}
      {[0, 50, 100, 150, 200, 250].map((v) => (
        <line
          key={v}
          x1={xScale(v)}
          x2={xScale(v)}
          y1={PAD.top}
          y2={CHART_H - PAD.bottom}
          stroke="var(--border)"
          strokeDasharray="2,4"
          opacity={0.5}
        />
      ))}

      {/* Axes */}
      <line
        x1={PAD.left}
        x2={CHART_W - PAD.right}
        y1={CHART_H - PAD.bottom}
        y2={CHART_H - PAD.bottom}
        stroke="var(--border)"
      />
      <line
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={CHART_H - PAD.bottom}
        stroke="var(--border)"
      />

      {/* Y labels */}
      {[1, 10, 100, 1000].map((v) => (
        <text
          key={v}
          x={PAD.left - 6}
          y={yScale(v) + 3}
          textAnchor="end"
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill="var(--fg-muted)"
        >
          {v}×
        </text>
      ))}

      {/* X labels */}
      {[0, 50, 100, 150, 200, 250].map((v) => (
        <text
          key={v}
          x={xScale(v)}
          y={CHART_H - PAD.bottom + 14}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-mono)"
          fill="var(--fg-muted)"
        >
          {v}
        </text>
      ))}

      {/* Axis titles */}
      <text
        x={CHART_W / 2}
        y={CHART_H - 2}
        textAnchor="middle"
        fontSize={9}
        fontFamily="var(--font-mono)"
        fill="var(--fg-muted)"
      >
        Active features per sample (L0)
      </text>
      <text
        x={8}
        y={CHART_H / 2}
        textAnchor="middle"
        fontSize={9}
        fontFamily="var(--font-mono)"
        fill="var(--fg-muted)"
        transform={`rotate(-90, 8, ${CHART_H / 2})`}
      >
        MSE vs dense
      </text>

      {/* "Dense baseline" reference line */}
      <line
        x1={xScale(0)}
        x2={xScale(250)}
        y1={yScale(1)}
        y2={yScale(1)}
        stroke="#3b82f6"
        strokeWidth={1}
        strokeDasharray="4,3"
        opacity={0.4}
      />

      {/* Data points */}
      {DATA.map((d) => {
        const isDense = d.k === 0;
        const r = isDense ? 5 : Math.max(3, Math.min(5, 5 - d.deadPct / 30));
        return (
          <g key={d.label}>
            <circle
              cx={xScale(d.l0)}
              cy={yScale(d.mseRatio)}
              r={r}
              fill={isDense ? "#3b82f6" : "#f59e0b"}
              opacity={isDense ? 0.9 : 0.7}
              stroke={isDense ? "#3b82f6" : "#f59e0b"}
              strokeWidth={1}
            />
            <text
              x={xScale(d.l0)}
              y={yScale(d.mseRatio) - r - 3}
              textAnchor="middle"
              fontSize={7}
              fontFamily="var(--font-mono)"
              fill="var(--fg-muted)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SAEFindings() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div
        className="rounded-lg border p-6"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="mb-5">
          <h2
            className="font-[family-name:var(--font-mono)] text-xl font-bold"
            style={{ color: "var(--fg)" }}
          >
            Sparse Autoencoder Investigation
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
            Can we decompose this model&apos;s internal representations into
            interpretable features?
          </p>
        </div>

        {/* Summary */}
        <div
          className="mb-5 rounded-md border p-4 text-sm leading-relaxed"
          style={{
            borderColor: "var(--border)",
            color: "var(--fg)",
            backgroundColor: "#ffffff03",
          }}
        >
          We trained Sparse Autoencoders (SAEs) on the residual stream of
          this 2-layer, 4-head transformer — a standard technique for
          finding human-interpretable features inside neural networks. We
          tested 9 configurations across two axes: dictionary size (128, 256,
          512) and sparsity level (k=8 to k=96 active features per token).
          At high density (223 features active, 44% of the dictionary), the
          SAE does find real, specific features: conjunctions of token
          identity and pattern context (e.g., &quot;token 13 when it&apos;s
          inside the repeated pattern&quot;). But once we enforce meaningful
          sparsity — any k below ~100 — these conjunction features vanish
          entirely. What remains are trivial position buckets (&quot;position
          40–49&quot;) and binary flags (&quot;in pattern vs. not&quot;). The
          interesting information in this model is distributed across many
          dimensions, not localized into a few that an SAE can cleanly
          isolate. This is a genuine limitation of the approach at this
          model scale, not a hyperparameter issue.
        </div>

        {/* Chart + legend side by side */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-shrink-0">
            <div
              className="mb-2 text-xs font-mono font-semibold"
              style={{ color: "var(--fg-muted)" }}
            >
              Reconstruction quality vs. sparsity
            </div>
            <ScatterChart />
          </div>

          <div className="flex-1 space-y-3">
            <div
              className="text-xs font-mono"
              style={{ color: "var(--fg-muted)" }}
            >
              <span className="font-semibold" style={{ color: "var(--fg)" }}>
                Reading the chart:
              </span>{" "}
              Each dot is one SAE configuration. Y-axis is reconstruction
              error relative to the dense model (lower = better). X-axis is
              how many features fire per token (left = sparser). The blue
              dashed line marks the dense baseline.
            </div>

            <div
              className="text-xs font-mono"
              style={{ color: "var(--fg-muted)" }}
            >
              <span className="font-semibold" style={{ color: "var(--fg)" }}>
                Key finding:
              </span>{" "}
              Every sparse configuration (gold dots) sits well above the
              dense baseline (blue). Getting within 3× of dense requires
              L0 ≈ 96 — only 2.3× sparser than the dense model&apos;s 223.
              True sparsity (L0 &lt; 64) costs 10–550× in reconstruction
              quality.
            </div>

            <div
              className="rounded border p-2 text-xs font-mono"
              style={{
                borderColor: "var(--border)",
                color: "var(--fg-muted)",
              }}
            >
              <span style={{ color: "#3b82f6" }}>●</span> Dense baseline
              &nbsp;&nbsp;
              <span style={{ color: "#f59e0b" }}>●</span> TopK sparse
              configurations
            </div>
          </div>
        </div>

        {/* What we found instead */}
        <div
          className="rounded-md border-l-4 p-4 text-sm"
          style={{
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b08",
            color: "var(--fg)",
          }}
        >
          <div
            className="mb-2 font-[family-name:var(--font-mono)] text-xs font-bold"
            style={{ color: "#f59e0b" }}
          >
            What the SAE found instead
          </div>
          <p className="leading-relaxed" style={{ color: "var(--fg)" }}>
            At full density (223 active features), the SAE discovers genuine
            conjunction features — e.g., &quot;token 13 inside the repeated
            pattern&quot; with 73% purity. These are the interesting
            features: they encode{" "}
            <em>which token × what context</em>, the core computation this
            model performs. But across all 9 sparse configurations (k=8–96,
            d=128–512), not a single conjunction feature survives. Sparsity
            pressure kills them first because this conjunction information
            is distributed across many dimensions of the residual stream,
            not concentrated in a few. What the sparse SAE keeps instead
            are position buckets (10-position ranges) and binary
            in/out-of-pattern flags — real but trivial features that a
            simple threshold could capture.
          </p>
        </div>
      </div>
    </section>
  );
}
