"use client";

import { useCallback, useRef, useState } from "react";
import { nodes } from "@/lib/content/resume";
import ProjectCard from "./ProjectCard";
import AblationSwitch from "./AblationSwitch";
import ConnectorLines from "./ConnectorLines";

interface Conn {
  from: string;
  to: string;
}

const SKILL_PROJECT: Conn[] = [
  { from: "python-pytorch", to: "decompiled-mind" },
  { from: "python-pytorch", to: "lung-nodule" },
  { from: "python-pytorch", to: "exam-monitoring" },
  { from: "computer-vision", to: "lung-nodule" },
  { from: "computer-vision", to: "exam-monitoring" },
  { from: "mech-interp", to: "decompiled-mind" },
  { from: "applied-math", to: "decompiled-mind" },
  { from: "applied-math", to: "rift-nyc" },
  { from: "frontend-engineering", to: "decompiled-mind" },
  { from: "frontend-engineering", to: "ruskin-archive" },
];

const PROJECT_EXPERIENCE: Conn[] = [
  { from: "lung-nodule", to: "cv-intern" },
  { from: "exam-monitoring", to: "cv-intern" },
  { from: "rift-nyc", to: "senior-tutor" },
];

export default function NodeGraph() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState(0);

  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const registerRef = useCallback(
    (nodeId: string) => (el: HTMLDivElement | null) => {
      if (el) cardRefsMap.current.set(nodeId, el);
      else cardRefsMap.current.delete(nodeId);
    },
    []
  );

  const toggleExpand = useCallback((nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    setExpandedVersion((v) => v + 1);
  }, []);

  const skills = nodes.filter((n) => n.category === "skill");
  const projects = nodes.filter((n) => n.category === "project");
  const experiences = nodes.filter((n) => n.category === "experience");

  const allConns = [...SKILL_PROJECT, ...PROJECT_EXPERIENCE];

  return (
    <section className="relative mx-auto max-w-3xl py-8">
      <ConnectorLines
        connections={allConns}
        cardRefs={cardRefsMap.current}
        key={expandedVersion}
      />

      {/* Skills cluster */}
      <div className="mb-16">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--fg-muted)" }}
        >
          Core Skills
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {skills.map((node) => {
            const isExpanded = expanded.has(node.id);
            const isThis = hoveredId === node.id;
            const anyActive = hoveredId !== null;
            const showTeaser =
              isThis ||
              (!anyActive &&
                typeof window !== "undefined" &&
                window.matchMedia("(hover: hover)").matches);

            return (
              <div key={node.id}>
                <div
                  ref={registerRef(node.id)}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(node.id)}
                  onBlur={() => setHoveredId(null)}
                >
                  <ProjectCard
                    node={node}
                    isExpanded={isExpanded}
                    showTeaser={showTeaser}
                    onToggleExpand={() => toggleExpand(node.id)}
                  />
                </div>
                <AblationSwitch nodeId={node.id} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Projects spine */}
      <div className="mb-16 space-y-5">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--fg-muted)" }}
        >
          Projects
        </h2>
        {projects.map((node) => {
          const isExpanded = expanded.has(node.id);
          const isThis = hoveredId === node.id;
          const anyActive = hoveredId !== null;
          const showTeaser =
            isThis ||
            (!anyActive &&
              typeof window !== "undefined" &&
              window.matchMedia("(hover: hover)").matches);

          return (
            <div
              key={node.id}
              ref={registerRef(node.id)}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(node.id)}
              onBlur={() => setHoveredId(null)}
            >
              <ProjectCard
                node={node}
                isExpanded={isExpanded}
                showTeaser={showTeaser}
                onToggleExpand={() => toggleExpand(node.id)}
              />
              <AblationSwitch nodeId={node.id} />
            </div>
          );
        })}
      </div>

      {/* Experience anchors */}
      <div className="space-y-5">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--fg-muted)" }}
        >
          Experience
        </h2>
        {experiences.map((node) => {
          const isExpanded = expanded.has(node.id);
          const isThis = hoveredId === node.id;
          const anyActive = hoveredId !== null;
          const showTeaser =
            isThis ||
            (!anyActive &&
              typeof window !== "undefined" &&
              window.matchMedia("(hover: hover)").matches);

          return (
            <div
              key={node.id}
              ref={registerRef(node.id)}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(node.id)}
              onBlur={() => setHoveredId(null)}
            >
              <ProjectCard
                node={node}
                isExpanded={isExpanded}
                showTeaser={showTeaser}
                onToggleExpand={() => toggleExpand(node.id)}
              />
              <AblationSwitch nodeId={node.id} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
