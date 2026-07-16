"use client";

import { useModelStore } from "@/lib/store/useModelStore";
import { TOKEN_NODE_MAP, CATEGORY_COLORS } from "@/lib/model/nodeTokens";
import { nodes } from "@/lib/content/resume";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function SequenceHUD() {
  const clickedTokens = useModelStore((s) => s.clickedTokens);
  const resetSequence = useModelStore((s) => s.resetSequence);

  if (clickedTokens.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        left: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 100,
      }}
    >
      {/* Token sequence */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexWrap: "wrap",
          maxWidth: "calc(100vw - 100px)",
        }}
      >
        {clickedTokens.map((token, i) => {
          const entry = TOKEN_NODE_MAP[token];
          const resumeNode = entry
            ? nodes.find((n) => n.id === entry.nodeId)
            : null;
          const category = resumeNode?.category ?? "skill";
          const color = CATEGORY_COLORS[category];
          const isLast = i === clickedTokens.length - 1;

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                fontWeight: isLast ? 700 : 400,
                color: isLast ? "#fff" : "#888",
                backgroundColor: isLast ? `${color}30` : "rgba(255,255,255,0.05)",
                border: `1px solid ${isLast ? `${color}60` : "rgba(255,255,255,0.08)"}`,
                transition: `all 300ms ${EASE}`,
              }}
            >
              {token}
            </span>
          );
        })}
      </div>

      {/* Reset button */}
      <button
        onClick={resetSequence}
        style={{
          alignSelf: "flex-start",
          padding: "4px 10px",
          borderRadius: "4px",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          color: "#666",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          transition: `all 200ms ${EASE}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#666";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        }}
      >
        reset sequence
      </button>
    </div>
  );
}
