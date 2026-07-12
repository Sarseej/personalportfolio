"use client";

import { useModelStore } from "@/lib/store/useModelStore";
import type { ResumeNode } from "@/lib/content/resume";

const categoryLabels: Record<ResumeNode["category"], string> = {
  project: "Project",
  skill: "Skill",
  experience: "Experience",
};

export default function ProjectCard({ node }: { node: ResumeNode }) {
  const ablatedNodeIds = useModelStore((s) => s.ablatedNodeIds);
  const isAblated = ablatedNodeIds.has(node.id);

  return (
    <div
      className="rounded-xl border p-6 transition-all duration-300"
      style={{
        borderColor: "var(--border)",
        backgroundColor: isAblated ? "transparent" : "var(--bg)",
        opacity: isAblated ? 0.4 : 1,
        filter: isAblated ? "grayscale(1)" : "none",
      }}
    >
      <span
        className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider"
        style={{
          color: "var(--accent)",
          border: "1px solid var(--border)",
        }}
      >
        {categoryLabels[node.category]}
      </span>
      <h3
        className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold"
        style={{ color: "var(--fg)" }}
      >
        {node.label}
      </h3>
      <p
        className="mt-2 text-sm leading-relaxed"
        style={{ color: "var(--fg-muted)" }}
      >
        {node.description}
      </p>
    </div>
  );
}
