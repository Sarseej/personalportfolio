"use client";

import { useModelStore } from "@/lib/store/useModelStore";
import type { ResumeNode } from "@/lib/content/resume";
import { nodeMap } from "@/lib/content/nodeMap";

const categoryLabels: Record<ResumeNode["category"], string> = {
  project: "Project",
  skill: "Skill",
  experience: "Experience",
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

interface ProjectCardProps {
  node: ResumeNode;
  isExpanded: boolean;
  showTeaser: boolean;
  onToggleExpand: () => void;
}

export default function ProjectCard({
  node,
  isExpanded,
  showTeaser,
  onToggleExpand,
}: ProjectCardProps) {
  const ablatedNodeIds = useModelStore((s) => s.ablatedNodeIds);
  const isAblated = ablatedNodeIds.has(node.id);
  const entry = nodeMap[node.id];
  const teaser =
    entry && entry.layer !== null && entry.head !== null
      ? `L${entry.layer}\u00B7H${entry.head}`
      : null;

  return (
    <div
      className="group relative rounded-xl border p-5 outline-none"
      style={{
        height: isExpanded ? "auto" : node.category === "skill" ? 136 : 180,
        borderColor: "var(--border)",
        backgroundColor: isAblated ? "transparent" : "var(--bg)",
        opacity: isAblated ? 0.4 : 1,
        filter: isAblated ? "grayscale(1)" : "none",
        transition: `all 400ms ${EASE}`,
      }}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
      onClick={onToggleExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleExpand();
        }
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
        className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold"
        style={{ color: "var(--fg)" }}
      >
        {node.label}
      </h3>
      <p
        className="mt-2 text-sm leading-relaxed"
        style={{
          color: "var(--fg-muted)",
          display: "-webkit-box",
          WebkitLineClamp: isExpanded ? undefined : 3,
          WebkitBoxOrient: "vertical" as const,
          overflow: isExpanded ? "visible" : "hidden",
        }}
      >
        {node.description}
      </p>

      {!isExpanded && (
        <span
          className="absolute bottom-4 right-5 text-xs font-medium"
          style={{
            color: "var(--accent)",
            opacity: showTeaser ? 1 : 0,
            transition: `opacity 300ms ${EASE}`,
          }}
          aria-hidden="true"
        >
          read more
        </span>
      )}

      {teaser && (
        <span
          className="absolute top-3 right-3 rounded px-1.5 py-0.5 font-mono text-[10px] tracking-tight"
          style={{
            color: "var(--accent)",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            opacity: showTeaser ? 1 : 0,
            transition: `opacity 300ms ${EASE}`,
          }}
          aria-hidden="true"
        >
          {teaser}
        </span>
      )}
    </div>
  );
}
