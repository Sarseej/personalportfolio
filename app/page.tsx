"use client";

import { useModelStore } from "@/lib/store/useModelStore";
import ModeToggle from "@/components/mode-toggle";
import Hero from "@/components/standard/Hero";
import NodeGraph from "@/components/standard/NodeGraph";

export default function Home() {
  const mode = useModelStore((s) => s.mode);
  const prompt = useModelStore((s) => s.prompt);
  const setPrompt = useModelStore((s) => s.setPrompt);

  return (
    <main
      className="min-h-screen px-4"
      style={{ backgroundColor: "var(--bg)", color: "var(--fg)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between py-6">
        <span
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight"
          style={{ color: "var(--fg)" }}
        >
          The Decompiled Mind
        </span>
        <ModeToggle />
      </div>

      {/* Prompt input */}
      <div className="mx-auto max-w-2xl pb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about a skill, project, or experience..."
          className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
          style={{
            borderColor: "var(--border)",
            color: "var(--fg)",
            // @ts-expect-error CSS custom property
            "--tw-ring-color": "var(--accent)",
          }}
        />
      </div>

      {/* Content */}
      {mode === "standard" ? (
        <>
          <Hero />
          <NodeGraph />
        </>
      ) : (
        <div className="mx-auto max-w-2xl py-32 text-center">
          <h2
            className="font-[family-name:var(--font-mono)] text-2xl font-bold"
            style={{ color: "var(--fg)" }}
          >
            Decompile Mode
          </h2>
          <p
            className="mt-4 text-lg"
            style={{ color: "var(--fg-muted)" }}
          >
            Coming soon — interactive model visualization and ablation
            experiments.
          </p>
        </div>
      )}
    </main>
  );
}
