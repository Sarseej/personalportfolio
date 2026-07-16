"use client";

import { useEffect } from "react";
import { useModelStore } from "@/lib/store/useModelStore";
import dynamic from "next/dynamic";

// Dynamic import for the3D scene — avoids SSR issues with WebGL
const AttentionSpace = dynamic(
  () => import("@/components/scene/AttentionSpace"),
  { ssr: false },
);

const ContentPanel = dynamic(
  () => import("@/components/scene/ContentPanel"),
  { ssr: false },
);

const FirstVisitPrompt = dynamic(
  () => import("@/components/scene/FirstVisitPrompt"),
  { ssr: false },
);

const SequenceHUD = dynamic(
  () => import("@/components/scene/SequenceHUD"),
  { ssr: false },
);

export default function Home() {
  const loadWeights = useModelStore((s) => s.loadWeights);
  const weightsLoading = useModelStore((s) => s.weightsLoading);

  // Load model weights on mount
  useEffect(() => {
    loadWeights();
  }, [loadWeights]);

  return (
    <main style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Loading state */}
      {weightsLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#050508",
            zIndex: 200,
            color: "#666",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          Loading model weights...
        </div>
      )}

      {/* 3D scene */}
      <AttentionSpace />

      {/* UI overlays */}
      <FirstVisitPrompt />
      <SequenceHUD />
      <ContentPanel />
    </main>
  );
}
