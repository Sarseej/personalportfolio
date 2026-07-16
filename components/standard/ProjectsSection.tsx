"use client";

import { useState, useCallback } from "react";
import { nodes } from "@/lib/content/resume";

const projects = nodes.filter((n) => n.category === "project");

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function ProjectsSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <section
      id="projects"
      className="mx-auto max-w-4xl py-16 sm:py-24"
    >
      <h2
        className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--fg-muted)" }}
      >
        Projects
      </h2>
      <div className="space-y-5">
        {projects.map((project) => {
          const isOpen = expandedId === project.id;
          return (
            <div
              key={project.id}
              className="rounded-xl border p-6"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--bg)",
              }}
            >
              <h3
                className="font-[family-name:var(--font-display)] text-lg font-semibold"
                style={{ color: "var(--fg)" }}
              >
                {project.label}
              </h3>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{
                  color: "var(--fg-muted)",
                  display: "-webkit-box",
                  WebkitLineClamp: isOpen ? undefined : 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: isOpen ? "visible" : "hidden",
                }}
              >
                {project.description}
              </p>
              <button
                onClick={() => toggle(project.id)}
                className="mt-3 text-sm font-medium transition-colors"
                style={{
                  color: "var(--accent)",
                  transitionTimingFunction: EASE,
                }}
              >
                {isOpen ? "Show less" : "Read more"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
