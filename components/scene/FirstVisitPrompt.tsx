"use client";

import { useState, useEffect } from "react";
import { useModelStore } from "@/lib/store/useModelStore";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function FirstVisitPrompt() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const clickedTokens = useModelStore((s) => s.clickedTokens);

  // Fade out after first click
  useEffect(() => {
    if (clickedTokens.length > 0 && visible) {
      setFading(true);
      const timer = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(timer);
    }
  }, [clickedTokens.length, visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 50,
        opacity: fading ? 0 : 1,
        transition: `opacity 600ms ${EASE}`,
      }}
    >
      <p
        style={{
          fontSize: "15px",
          color: "rgba(255,255,255,0.5)",
          fontFamily: "var(--font-body)",
          letterSpacing: "0.02em",
        }}
      >
        Click a node to begin
      </p>
      <p
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.25)",
          marginTop: "6px",
          fontFamily: "var(--font-mono)",
        }}
      >
        orbit · scroll to zoom
      </p>
    </div>
  );
}
