import { experience, projects, skillGroups } from "@/lib/content/portfolio";
export default function CVDocument() {
  return (
    <div className="cv-document">
      <header>
        <p className="overline">Curriculum vitae</p>
        <h2>Sarseej Shrestha</h2>
        <p className="cv-role">AI/ML Developer · Computer Science Student</p>
        <p className="cv-summary">
          Applied AI/ML, medical imaging, uncertainty, data systems, and
          interpretable model behavior. Building software with careful
          evaluation and human judgment in the loop.
        </p>
        <div className="cv-links">
          <a href="/sarseej-shrestha-cv.pdf" download>Download CV</a>
          <a href="mailto:sarseej.shrestha@selu.edu">
            sarseej.shrestha@selu.edu
          </a>
          <a href="https://github.com/sarseej-shrestha">
            github.com/sarseej-shrestha ↗
          </a>
        </div>
      </header>
      <section>
        <h3>Education</h3>
        <div className="cv-row">
          <div>
            <h4>B.S. Computer Science</h4>
            <p>Southeastern Louisiana University</p>
          </div>
          <p className="cv-date">Expected May 2027</p>
        </div>
      </section>
      <section>
        <h3>Experience</h3>
        {experience.map((job) => (
          <article key={job.role}>
            <div className="cv-row">
              <h4>{job.role}</h4>
              <p className="cv-date">{job.date}</p>
            </div>
            <p className="cv-organization">{job.organization}</p>
            <p>{job.description}</p>
          </article>
        ))}
      </section>
      <section>
        <h3>Projects</h3>
        {projects.map((project) => (
          <article key={project.id}>
            <div className="cv-row">
              <h4>{project.title}</h4>
              <p className="cv-date">{project.date}</p>
            </div>
            <p>
              {project.summary} {project.evidence}
            </p>
          </article>
        ))}
      </section>
      <section>
        <h3>Technical skills</h3>
        {skillGroups.map((group) => (
          <article key={group.title}>
            <h4>{group.title}</h4>
            <p>{group.items}</p>
          </article>
        ))}
      </section>
      <footer>Sarseej Shrestha · Curriculum vitae</footer>
    </div>
  );
}
