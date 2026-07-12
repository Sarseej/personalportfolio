"use client";

import { useModelStore } from "@/lib/store/useModelStore";

export default function AblationSwitch({ nodeId }: { nodeId: string }) {
  const ablatedNodeIds = useModelStore((s) => s.ablatedNodeIds);
  const toggleAblation = useModelStore((s) => s.toggleAblation);
  const isAblated = ablatedNodeIds.has(nodeId);

  return (
    <button
      onClick={() => toggleAblation(nodeId)}
      className="mt-3 rounded-md border px-3 py-1 text-xs font-medium transition-colors"
      style={{
        borderColor: "var(--border)",
        color: isAblated ? "var(--accent)" : "var(--fg-muted)",
        backgroundColor: isAblated ? "var(--border)" : "transparent",
      }}
      title={isAblated ? "Restore node" : "Ablate node"}
    >
      {isAblated ? "Restored" : "Ablate"}
    </button>
  );
}
