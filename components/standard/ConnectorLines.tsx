"use client";

import { useEffect, useRef, useState } from "react";

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ConnectorLinesProps {
  connections: { from: string; to: string }[];
  cardRefs: Map<string, HTMLDivElement>;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function ConnectorLines({
  connections,
  cardRefs,
}: ConnectorLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [visible, setVisible] = useState(false);
  const connectionsRef = useRef(connections);
  connectionsRef.current = connections;

  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;

    let frameId: number;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const newLines: Line[] = [];

      for (const conn of connectionsRef.current) {
        const fromEl = cardRefs.get(conn.from);
        const toEl = cardRefs.get(conn.to);
        if (!fromEl || !toEl) continue;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        newLines.push({
          x1: fromRect.left + fromRect.width / 2 - containerRect.left,
          y1: fromRect.bottom - containerRect.top,
          x2: toRect.left + toRect.width / 2 - containerRect.left,
          y2: toRect.top - containerRect.top,
        });
      }

      setLines(newLines);
      setVisible(true);
    };

    const timer = setTimeout(() => {
      frameId = requestAnimationFrame(measure);
    }, 80);

    const ro = new ResizeObserver(() => {
      setVisible(false);
      frameId = requestAnimationFrame(measure);
    });
    ro.observe(container);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
      ro.disconnect();
    };
    // cardRefs is a mutable Map — we measure inside useEffect with a timer,
    // so it's always populated by the time measurement runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {lines.map((line, i) => {
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        return (
          <line
            key={`${Math.round(line.x1)}-${Math.round(line.y1)}-${Math.round(line.x2)}-${Math.round(line.y2)}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--accent)"
            strokeOpacity={visible ? 0.25 : 0}
            strokeWidth={1}
            strokeDasharray={length}
            strokeDashoffset={visible ? 0 : length}
            style={{
              transition: `stroke-dashoffset 600ms ${EASE} ${i * 50}ms, stroke-opacity 400ms ${EASE} ${i * 50}ms`,
            }}
          />
        );
      })}
    </svg>
  );
}
