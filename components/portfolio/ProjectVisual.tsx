import type { CSSProperties } from "react";

const descriptions: Record<string, string> = {
  oncola:
    "Messages become structured symptom reports. Risk signals inform review; a clinician approves every drafted SOAP note.",
  lidc: "Different readers can mark the same region differently. The study asks whether model uncertainty helps identify that disagreement.",
  "lung-nodules":
    "Three ResNet-18 branches examine lung nodules, with a dedicated branch for uncertainty estimation.",
  rift: "Physical constraints guide the model. Predictions are checked against mechanical-engineering baselines.",
};

/** Conceptual diagrams describe verified system structure, not measured outputs. */
export default function ProjectVisual({
  project,
  stage,
}: {
  project: string;
  stage: number;
}) {
  return (
    <figure className={`project-visual visual-${project}`} data-step={stage}>
      <svg viewBox="0 0 640 152" aria-hidden="true" key={`${project}-${stage}`}>
        {project === "oncola" && (
          <>
            <path
              className="diagram-wire"
              d="M104 36H139Q153 36 153 50V76H213 M104 76H213 M104 116H139Q153 116 153 102V76 M300 76H340V36H397 M340 76V116H397 M465 36H501V76H540 M465 116H501V76"
            />
            {[28, 68, 108].map((y, i) => (
              <g key={y} className={stage === 0 ? "diagram-emphasis" : ""}>
                <rect x="34" y={y - 10} width="70" height="32" rx="5" />
                <path d={`M46 ${y}h${36 - i * 6} M46 ${y + 9}h45`} />
              </g>
            ))}
            <g className={stage === 1 ? "diagram-emphasis" : ""}>
              <rect x="213" y="44" width="87" height="64" rx="6" />
              {[60, 76, 92].map((y) => (
                <path key={y} d={`M225 ${y}h7 M241 ${y}h44`} />
              ))}
              <rect x="397" y="19" width="68" height="34" rx="4" />
              <rect x="397" y="99" width="68" height="34" rx="4" />
              <path d="M408 40h10l6-12 8 14 6-7h15 M408 120h10l8-10 8 10h19" />
            </g>
            <g
              className={`human-gate ${stage === 2 ? "diagram-emphasis" : ""}`}
            >
              <path d="M568 43l29 12v28q-6 22-29 30-23-8-29-30V55Z" />
              <path d="m555 77 9 9 18-21" />
            </g>
          </>
        )}
        {project === "lidc" && (
          <>
            <path
              className="diagram-wire"
              d="M219 76H275 M360 76H403 M491 76H552"
            />
            <g
              className={`reader-contours ${stage === 0 ? "diagram-emphasis" : ""}`}
            >
              <path d="M61 88C37 29 129 3 168 40S216 100 163 128 66 125 61 88Z" />
              <path d="M73 67C83 13 155 29 174 57S191 114 139 120 56 107 73 67Z" />
              <path d="M57 72C84 43 127 10 155 49S211 100 158 118 27 121 57 72Z" />
            </g>
            <g className={stage === 1 ? "diagram-emphasis" : ""}>
              <circle cx="290" cy="42" r="8" />
              <circle cx="290" cy="76" r="8" />
              <circle cx="290" cy="110" r="8" />
              <path d="m298 42 45 34-45 34 M298 76h45" />
              <circle cx="352" cy="76" r="9" />
            </g>
            <g className={stage === 2 ? "diagram-emphasis" : ""}>
              <rect x="404" y="35" width="86" height="82" rx="5" />
              <path d="M419 55h39 M419 70h56 M419 85h39 M419 100h49" />
              <circle cx="574" cy="76" r="24" />
              <path d="M567 68q0-12 12-8t-2 18v5 M576 93v1" />
            </g>
          </>
        )}
        {project === "lung-nodules" && (
          <>
            <g className={stage === 0 ? "diagram-emphasis" : ""}>
              {[0, 1, 2].map((i) => (
                <rect
                  key={i}
                  x={40 + i * 9}
                  y={40 + i * 8}
                  width="58"
                  height="58"
                  rx="4"
                />
              ))}
              <circle cx="87" cy="84" r="12" />
            </g>
            <path
              className="diagram-wire"
              d="M116 76H180V28H243 M180 76H243 M180 76V124H243 M376 28H442V76H503 M376 76H503 M376 124H442V76"
            />
            {[28, 76, 124].map((y, i) => (
              <g
                key={y}
                className={`${stage === 1 ? "diagram-emphasis" : ""} ${i === 2 ? "uncertainty-branch" : ""}`}
              >
                <rect x="243" y={y - 17} width="133" height="34" rx="4" />
                {[259, 285, 311, 337].map((x) => (
                  <path key={x} d={`M${x} ${y - 6}v12m5-12v12`} />
                ))}
              </g>
            ))}
            <g className={stage === 2 ? "diagram-emphasis" : ""}>
              <rect x="503" y="45" width="94" height="62" rx="6" />
              <path d="M519 65h59 M519 79h37 M519 93h48" />
            </g>
          </>
        )}
        {project === "rift" && (
          <g
            className={`structural-mesh ${stage > 0 ? "diagram-emphasis" : ""}`}
          >
            {Array.from({ length: 7 }, (_, row) => (
              <path
                key={`r${row}`}
                style={{ "--mesh-order": row } as CSSProperties}
                d={Array.from({ length: 23 }, (_, col) => {
                  const x = 42 + col * 25;
                  const deflection =
                    stage === 0 ? 0 : Math.sin((col / 22) * Math.PI) * 14;
                  return `${col ? "L" : "M"}${x} ${25 + row * 15 + deflection}`;
                }).join(" ")}
              />
            ))}
            {Array.from({ length: 23 }, (_, col) => (
              <path
                key={`c${col}`}
                d={`M${42 + col * 25} ${25 + (stage === 0 ? 0 : Math.sin((col / 22) * Math.PI) * 14)}v90`}
              />
            ))}
            <path
              className="structural-support"
              d="m42 115-14 22h28Z m550 0-14 22h28Z"
            />
            {stage === 2 && (
              <path className="baseline-path" d="M42 68Q316 93 592 68" />
            )}
          </g>
        )}
      </svg>
      <figcaption>
        <span>
          {project === "rift"
            ? "Illustrative constraint mesh · not measured stress"
            : "System sketch · not experimental data"}
        </span>
        {descriptions[project]}
      </figcaption>
    </figure>
  );
}
