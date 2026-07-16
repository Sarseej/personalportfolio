import { resume } from "@/lib/content/resume";

export default function Hero() {
  return (
    <section className="mx-auto max-w-xl py-10 text-center">
      <h1
        className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl"
        style={{ color: "var(--fg)" }}
      >
        {resume.name}
      </h1>
      <p
        className="mt-3 text-base leading-relaxed"
        style={{ color: "var(--fg-muted)" }}
      >
        {resume.bio}
      </p>
    </section>
  );
}
