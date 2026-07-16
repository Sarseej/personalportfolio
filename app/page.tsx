"use client";

import { useState, useCallback } from "react";
import { useModelStore } from "@/lib/store/useModelStore";
import StickyNav from "@/components/standard/StickyNav";
import Hero from "@/components/standard/Hero";
import SkillsSection from "@/components/standard/SkillsSection";
import ProjectsSection from "@/components/standard/ProjectsSection";
import ExperienceSection from "@/components/standard/ExperienceSection";
import GuidedTour from "@/components/standard/GuidedTour";
import AttentionMatrix from "@/components/decompile/AttentionMatrix";
import PatchingSandbox from "@/components/decompile/PatchingSandbox";
import SAEFindings from "@/components/decompile/SAEFindings";

const SECTION_IDS = ["skills", "projects", "experience"] as const;

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function Home() {
  const mode = useModelStore((s) => s.mode);

  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(-1);

  const startTour = useCallback(() => {
    setTourStep(0);
    setTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    setTourActive(false);
    setTourStep(-1);
  }, []);

  const highlightedSection =
    tourActive && tourStep >= 0 && tourStep < SECTION_IDS.length
      ? SECTION_IDS[tourStep]
      : null;

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg)", color: "var(--fg)" }}
    >
      <StickyNav />

      {mode === "standard" ? (
        <div className="px-4">
          <Hero onStartTour={startTour} tourActive={tourActive} />

          <div>
            <div
              className="mx-auto max-w-4xl transition-all"
              style={{
                transform:
                  highlightedSection && highlightedSection !== "skills"
                    ? "scale(0.98)"
                    : "scale(1)",
                opacity:
                  highlightedSection && highlightedSection !== "skills"
                    ? 0.4
                    : 1,
                transitionDuration: "500ms",
                transitionTimingFunction: EASE,
              }}
            >
              <SkillsSection />
            </div>

            <div
              className="mx-auto max-w-4xl transition-all"
              style={{
                transform:
                  highlightedSection && highlightedSection !== "projects"
                    ? "scale(0.98)"
                    : highlightedSection === "projects"
                      ? "scale(1.01)"
                      : "scale(1)",
                opacity:
                  highlightedSection && highlightedSection !== "projects"
                    ? 0.4
                    : highlightedSection === "projects"
                      ? 1
                      : 1,
                boxShadow:
                  highlightedSection === "projects"
                    ? "0 0 40px rgba(43, 76, 126, 0.15)"
                    : "none",
                borderRadius: "12px",
                transitionDuration: "500ms",
                transitionTimingFunction: EASE,
              }}
            >
              <ProjectsSection />
            </div>

            <div
              className="mx-auto max-w-4xl transition-all"
              style={{
                transform:
                  highlightedSection && highlightedSection !== "experience"
                    ? "scale(0.98)"
                    : "scale(1)",
                opacity:
                  highlightedSection && highlightedSection !== "experience"
                    ? 0.4
                    : 1,
                transitionDuration: "500ms",
                transitionTimingFunction: EASE,
              }}
            >
              <ExperienceSection />
            </div>
          </div>

          <GuidedTour active={tourActive} step={tourStep} onEnd={endTour} onStepChange={setTourStep} />
        </div>
      ) : (
        <>
          <AttentionMatrix />
          <PatchingSandbox />
          <SAEFindings />
        </>
      )}
    </main>
  );
}
