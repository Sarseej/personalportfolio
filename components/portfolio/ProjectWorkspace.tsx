"use client";
import { useState } from "react";
import ProjectVisual from "./ProjectVisual";
import { projects, projectStories } from "@/lib/content/portfolio";
import { signalNodes } from "@/lib/visual/signal-field";

export default function ProjectWorkspace({initialProject}:{initialProject?:string}) {
  const [selected, setSelected] = useState(() => Math.max(0, projects.findIndex(p => p.id === initialProject)));
  const [stage, setStage] = useState(0);
  const project = projects[selected];
  const story = projectStories[project.id];
  const repository = signalNodes.find(node=>node.destination===project.id)?.repository;
  return (
    <div className="projects-workspace">
      <nav className="project-rail" aria-label="Project navigator">
        <p className="overline">Engineering notebook</p>
        {projects.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={selected === index}
            onClick={() => {
              setSelected(index);
              setStage(0);
            }}
          >
            <span className="project-ordinal">0{index + 1}</span>
            <span>{item.title}</span>
            <small>{item.category.split(" / ")[0]}</small>
          </button>
        ))}
        <p className="rail-note">
          Four projects.
          <br />
          Different ways to build carefully.
        </p>
      </nav>
      <div className="project-reading" key={project.id}>
        <article>
          <div className="explorer-location" aria-label="Project location">
            <button
              aria-label="Previous project"
              disabled={selected === 0}
              onClick={() => {
                setSelected(selected - 1);
                setStage(0);
              }}
            >
              ←
            </button>
            <button
              aria-label="Next project"
              disabled={selected === projects.length - 1}
              onClick={() => {
                setSelected(selected + 1);
                setStage(0);
              }}
            >
              →
            </button>
            <span>Projects / {project.title}</span>
          </div>
          <p className="overline">
            {project.category} <span> / {project.date}</span>
          </p>
          <h2>{project.title}</h2>
          <p className="project-outcome">{story.result}</p>
          {repository && <a className="project-repository" href={repository} target="_blank" rel="noreferrer">GitHub repository</a>}
          <section
            className="flow-diagram"
            onPointerMove={(event) => {
              if (
                event.pointerType !== "mouse" ||
                matchMedia("(prefers-reduced-motion: reduce)").matches
              )
                return;
              const bounds = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty(
                "--diagram-x",
                `${((event.clientX - bounds.left) / bounds.width - 0.5) * 4}px`,
              );
              event.currentTarget.style.setProperty(
                "--diagram-y",
                `${((event.clientY - bounds.top) / bounds.height - 0.5) * 4}px`,
              );
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.removeProperty("--diagram-x");
              event.currentTarget.style.removeProperty("--diagram-y");
            }}
            aria-label={`${project.title} system walkthrough`}
          >
            <div className="flow-title">
              <span>How the system works</span>
              <small>Select a step</small>
            </div>
            <ProjectVisual project={project.id} stage={stage} />
            <div className="flow-stages">
              {story.stages.map((step, index) => (
                <button
                  type="button"
                  key={step.title}
                  aria-pressed={stage === index}
                  onClick={() => setStage(index)}
                >
                  <span>0{index + 1}</span>
                  {step.title}
                  {index < 2 && <i aria-hidden="true">→</i>}
                </button>
              ))}
            </div>
            <p key={stage} className="flow-explanation" aria-live="polite">
              {story.stages[stage].text}
            </p>
          </section>
          <div className="project-copy-grid">
            <section>
              <h3>The problem</h3>
              <p>{story.problem}</p>
            </section>
            <section>
              <h3>My contribution</h3>
              <p>{story.role}</p>
            </section>
          </div>
          <section className="approach">
            <h3>The approach</h3>
            <p>{story.approach}</p>
          </section>
          <div className="result-note">
            <span>Evidence</span>
            <p>{project.evidence}</p>
          </div>
          <details className="technical-details">
            <summary>
              Technical details & validation <span aria-hidden="true">+</span>
            </summary>
            {project.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </details>
          <section className="project-limitations">
            <h3>Limits & next steps</h3>
            <p>{story.limitation}</p>
          </section>
          <ul className="technology-list" aria-label="Technologies and methods">
            {story.technologies.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </article>
      </div>
      <footer className="explorer-status" aria-live="polite">
        {selected + 1} of {projects.length} · {project.title} ·{" "}
        {story.technologies.slice(0, 3).join(" / ")}
      </footer>
    </div>
  );
}
