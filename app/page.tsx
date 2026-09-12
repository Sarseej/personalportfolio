import CVDocument from "@/components/portfolio/CVDocument";
import Atelier from "@/components/portfolio/Atelier";
import { projects, career } from "@/lib/content/portfolio";

export default function Home() {
  return (
    <>
      <Atelier />
      <noscript>
        <style>{`.station-controls, .entrance-actions button { display: none; }`}</style>
        <section className="static-library" id="projects">
          <h2>Projects</h2>
          <p>
            The workspace is available as a static view. Read the work below or
            use the CV and contact links above.
          </p>
          {projects.map((project) => (
            <article key={project.id}>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <p>{project.evidence}</p>
              <details>
                <summary>Project notes</summary>
                {project.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </details>
            </article>
          ))}
        </section>
        <section className="static-library" id="career">
          <h2>Career</h2>
          {career.map((item) => (
            <article key={item.id}>
              <h3>{item.title}</h3>
              <p>
                {item.date} · {item.organization}
              </p>
              <p>{item.detail}</p>
            </article>
          ))}
        </section>
        <section className="static-library" id="cv">
          <CVDocument />
        </section>
      </noscript>
    </>
  );
}
