import { nodes } from "@/lib/content/resume";

const experiences = nodes.filter((n) => n.category === "experience");

export default function ExperienceSection() {
  return (
    <section
      id="experience"
      className="mx-auto max-w-4xl py-16 sm:py-24"
    >
      <h2
        className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color: "var(--fg-muted)" }}
      >
        Experience
      </h2>
      <div className="space-y-0">
        {experiences.map((exp, i) => (
          <div key={exp.id} className="flex gap-6">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className="h-3 w-3 rounded-full border-2"
                style={{ borderColor: "var(--accent)" }}
              />
              {i < experiences.length - 1 && (
                <div
                  className="w-px flex-1"
                  style={{ backgroundColor: "var(--border)" }}
                />
              )}
            </div>
            {/* Content */}
            <div className="flex-1 pb-10">
              <h3
                className="font-[family-name:var(--font-display)] text-base font-semibold"
                style={{ color: "var(--fg)" }}
              >
                {exp.label}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--fg-muted)" }}
              >
                {exp.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
