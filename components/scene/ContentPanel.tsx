"use client";

import { useModelStore } from "@/lib/store/useModelStore";
import { nodes } from "@/lib/content/resume";
import { NODE_TOKEN_MAP, CATEGORY_COLORS } from "@/lib/model/nodeTokens";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function ContentPanel() {
  const selectedNodeId = useModelStore((s) => s.selectedNodeId);
  const selectNode = useModelStore((s) => s.selectNode);
  const clickedTokens = useModelStore((s) => s.clickedTokens);
  const currentBeam = useModelStore((s) => s.currentBeam);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const tokenEntry = NODE_TOKEN_MAP[node.id];
  const color = CATEGORY_COLORS[node.category];

  // Find the source node name for the beam
  let beamSourceName: string | null = null;
  if (currentBeam) {
    const sourceEntry = NODE_TOKEN_MAP[currentBeam.toToken];
    if (sourceEntry) {
      const sourceNode = nodes.find((n) => n.id === sourceEntry.nodeId);
      beamSourceName = sourceNode?.label ?? null;
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "24px",
        maxWidth: "400px",
        width: "calc(100vw - 48px)",
        backgroundColor: "rgba(10, 10, 15, 0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "20px",
        color: "#e0e0e0",
        fontFamily: "var(--font-body)",
        zIndex: 100,
        transition: `all 400ms ${EASE}`,
      }}
    >
      {/* Close button */}
      <button
        onClick={() => selectNode(null)}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          color: "#666",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: 1,
          padding: "4px",
        }}
        aria-label="Close panel"
      >
        ×
      </button>

      {/* Category badge */}
      <div
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: color,
          backgroundColor: `${color}15`,
          border: `1px solid ${color}30`,
          marginBottom: "8px",
        }}
      >
        {node.category} · token {tokenEntry?.token}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 600,
          margin: "0 0 8px 0",
          color: "#ffffff",
          fontFamily: "var(--font-display)",
        }}
      >
        {node.label}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: "13px",
          lineHeight: 1.6,
          margin: "0 0 12px 0",
          color: "#999",
        }}
      >
        {node.description}
      </p>

      {/* Attention info */}
      {clickedTokens.length > 1 && currentBeam && (
        <div
          style={{
            fontSize: "11px",
            color: "#666",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "10px",
            marginTop: "4px",
          }}
        >
          <span style={{ color: "#4a9eff" }}>Attention beam</span>
          {" → "}
          {beamSourceName ?? "start"}
          {" · weight "}
          <span style={{ color: "#ffffff", fontFamily: "var(--font-mono)" }}>
            {currentBeam.weight.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
}
