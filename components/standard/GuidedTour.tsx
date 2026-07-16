"use client";

import { useCallback, useEffect, useRef } from "react";

const SECTIONS = ["skills", "projects", "experience"] as const;

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

interface GuidedTourProps {
  active: boolean;
  step: number;
  onEnd: () => void;
  onStepChange: (step: number) => void;
}

export default function GuidedTour({
  active,
  step,
  onEnd,
  onStepChange,
}: GuidedTourProps) {
  const hasStarted = useRef(false);

  // Auto-start when active becomes true
  useEffect(() => {
    if (active && !hasStarted.current) {
      hasStarted.current = true;
      onStepChange(0);
      const el = document.getElementById(SECTIONS[0]);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!active) {
      hasStarted.current = false;
    }
  }, [active, onStepChange]);

  const nextStep = useCallback(() => {
    if (step < SECTIONS.length - 1) {
      const next = step + 1;
      onStepChange(next);
      const el = document.getElementById(SECTIONS[next]);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      onStepChange(-1);
      onEnd();
    }
  }, [step, onStepChange, onEnd]);

  const skip = useCallback(() => {
    onStepChange(-1);
    onEnd();
  }, [onStepChange, onEnd]);

  if (!active || step < 0) return null;

  const isLast = step === SECTIONS.length - 1;

  return (
    <>
      {/* Dimming overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          backgroundColor: "var(--bg)",
          opacity: 0.2,
          transition: `opacity 500ms ${EASE}`,
        }}
        aria-hidden="true"
      />

      {/* Tour controls */}
      <div
        className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-2.5"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
        }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: "var(--fg-muted)" }}
        >
          Step {step + 1} of {SECTIONS.length}
        </span>
        <button
          onClick={nextStep}
          className="rounded-full px-4 py-1 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--bg)",
            transitionTimingFunction: EASE,
          }}
        >
          {isLast ? "Finish" : "Next"}
        </button>
        <button
          onClick={skip}
          className="text-xs font-medium transition-colors hover:opacity-70"
          style={{ color: "var(--fg-muted)" }}
        >
          Exit tour
        </button>
      </div>
    </>
  );
}
