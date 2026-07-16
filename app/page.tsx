"use client";

import { useEffect } from "react";
import { useModelStore } from "@/lib/store/useModelStore";
import dynamic from "next/dynamic";
import ModeToggle from "@/components/mode-toggle";

import StickyNav from "@/components/standard/StickyNav";
import SkillsSection from "@/components/standard/SkillsSection";
import ProjectsSection from "@/components/standard/ProjectsSection";
import ExperienceSection from "@/components/standard/ExperienceSection";

const AttentionField = dynamic(
  () => import("@/components/hero/AttentionField"),
  { ssr: false },
);

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

const AttentionMatrix = dynamic(
  () => import("@/components/decompile/AttentionMatrix"),
  { ssr: false },
);

const PatchingSandbox = dynamic(
  () => import("@/components/decompile/PatchingSandbox"),
  { ssr: false },
);

const SAEFindings = dynamic(
  () => import("@/components/decompile/SAEFindings"),
  { ssr: false },
);

export default function Home() {
  const mode = useModelStore((s) => s.mode);
  const loadWeights = useModelStore((s) => s.loadWeights);
  const weightsLoading = useModelStore((s) => s.weightsLoading);

  useEffect(() => {
    loadWeights();
  }, [loadWeights]);

  return (
    <>
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 1000 }}>
        <ModeToggle />
      </div>

      {mode === "standard" ? (
        <StandardMode weightsLoading={weightsLoading} />
      ) : (
        <DecompileMode />
      )}
    </>
  );
}

function StandardMode({ weightsLoading }: { weightsLoading: boolean }) {
  return (
    <main>
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

      <StickyNav />
      <AttentionField />

      <SkillsSection />
      <ProjectsSection />
      <ExperienceSection />

      <div style={{ textAlign: "center", padding: "4rem 0 2rem" }}>
        <a
          href="#decompile-deep-dive"
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById("decompile-deep-dive")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          style={{
            color: "var(--fg-muted)",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 2,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--fg)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--fg-muted)")
          }
        >
          See exactly how this is generated →
        </a>
      </div>

      <div id="decompile-deep-dive">
        <AttentionMatrix />
        <PatchingSandbox />
        <SAEFindings />
      </div>
    </main>
  );
}

function DecompileMode() {
  return (
    <main style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <AttentionSpace />
      <FirstVisitPrompt />
      <SequenceHUD />
      <ContentPanel />
    </main>
  );
}
