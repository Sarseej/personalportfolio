import { resume } from "@/lib/content/resume";

export default function Hero() {
  return (
    <section className="mx-auto max-w-2xl py-16 text-center">
      <h1
        className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight"
        style={{ color: "var(--fg)" }}
      >
        {resume.name}
      </h1>
      <p
        className="mt-4 text-lg leading-relaxed"
        style={{ color: "var(--fg-muted)" }}
      >
        {resume.bio}
      </p>
    </section>
  );
}
