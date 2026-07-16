import { nodes } from "@/lib/content/resume";

const skills = nodes.filter((n) => n.category === "skill");

export default function SkillsSection() {
  return (
    <section
      id="skills"
      className="mx-auto max-w-4xl py-16 sm:py-24"
    >
      <h2
        className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--fg-muted)" }}
      >
        Skills
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="rounded-xl border p-6"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg)",
            }}
          >
            <h3
              className="font-[family-name:var(--font-display)] text-base font-semibold"
              style={{ color: "var(--fg)" }}
            >
              {skill.label}
            </h3>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--fg-muted)" }}
            >
              {skill.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
