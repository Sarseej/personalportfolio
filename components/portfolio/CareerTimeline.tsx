"use client";
import { useState, type CSSProperties } from "react";
import { career } from "@/lib/content/portfolio";
const lane = (kind: string) =>
  kind === "Experience" ? 10 : kind === "Project" ? 32 : 54;
export default function CareerTimeline() {
  const [selected, setSelected] = useState(0);
  const node = career[selected];
  return (
    <div className="career-workspace">
      <header className="career-intro">
        <div>
          <p className="overline">2020 → 2027</p>
          <h2>A history of building.</h2>
          <p>
            Data systems → mathematical communication → applied AI → scientific
            ML → uncertainty-aware systems.
          </p>
        </div>
        <ul className="timeline-legend" aria-label="Timeline categories">
          {["Experience", "Project", "Education"].map((kind) => (
            <li className={`kind-${kind.toLowerCase()}`} key={kind}>
              <span />
              {kind}
            </li>
          ))}
        </ul>
      </header>
      <div className="career-layout">
        <ol
          className="career-graph history-graph"
          aria-label="Career timeline, ordered by start date"
        >
          {career.map((entry, index) => (
            <li
              key={entry.id}
              className={`kind-${entry.kind.toLowerCase()} ${selected === index ? "is-current" : ""} ${index <= selected ? "is-connected" : ""}`}
              style={
                {
                  "--node-order": index,
                  "--lane": `${lane(entry.kind)}px`,
                } as CSSProperties
              }
            >
              <svg
                className="history-route"
                viewBox="0 0 64 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="history-rails"
                  d="M10 0V100 M32 0V100 M54 0V100"
                />
                <path
                  className="history-thread"
                  pathLength="1"
                  d={
                    index === 0
                      ? "M10 50V100"
                      : `M${lane(career[index - 1].kind)} 0 C${lane(career[index - 1].kind)} 28 ${lane(entry.kind)} 22 ${lane(entry.kind)} 50 ${index === career.length - 1 ? "" : `L${lane(entry.kind)} 100`}`
                  }
                />
              </svg>
              <button
                type="button"
                aria-pressed={selected === index}
                aria-controls="career-detail"
                onClick={() => {
                  setSelected(index);
                  if (matchMedia("(max-width: 700px)").matches)
                    requestAnimationFrame(() =>
                      document
                        .getElementById("career-detail")
                        ?.scrollIntoView({ block: "nearest" }),
                    );
                }}
              >
                <time>{entry.date}</time>
                <span className="timeline-dot" aria-hidden="true">
                  {index <= selected && (
                    <span
                      key={`${selected}-${index}`}
                      className="timeline-pulse"
                      style={{ animationDelay: `${index * 35}ms` }}
                    />
                  )}
                </span>
                <span className="timeline-label">
                  <strong>{entry.title}</strong>
                  <small>
                    {entry.kind} · {entry.organization}
                  </small>
                  {entry.id === "foundations" && (
                    <span className="promotion-milestone">
                      <i aria-hidden="true">↗</i> Promoted to Senior Mathematics
                      Tutor
                    </span>
                  )}
                </span>
                <span className="timeline-chevron" aria-hidden="true">
                  ↗
                </span>
              </button>
            </li>
          ))}
        </ol>
        <aside
          id="career-detail"
          className={`career-detail kind-${node.kind.toLowerCase()}`}
          aria-live="polite"
        >
          <button
            className="timeline-return"
            onClick={() =>
              document
                .querySelector<HTMLButtonElement>(
                  ".career-graph .is-current button",
                )
                ?.focus({ preventScroll: false })
            }
          >
            ↑ Back to timeline
          </button>
          <p className="overline">
            {node.kind} / {node.date}
          </p>
          <h3>{node.title}</h3>
          <p className="career-organization">{node.organization}</p>
          <p key={node.id} className="career-detail-copy">
            {node.detail}
          </p>
          {node.id === "foundations" && (
            <p className="promotion-note">
              One continuous role · September 2023 – May 2026
            </p>
          )}
          <div>
            <h4>The thread forward</h4>
            <p>{node.connection}</p>
          </div>
        </aside>
      </div>
      <p className="timeline-footnote">
        Dates overlap where roles and projects ran alongside one another.
        Spacing shows sequence, not duration. Graduation is expected, not
        completed.
      </p>
    </div>
  );
}
