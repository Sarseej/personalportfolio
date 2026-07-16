import { resume } from "@/lib/content/resume";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

interface HeroProps {
  onStartTour: () => void;
  tourActive: boolean;
}

export default function Hero({ onStartTour, tourActive }: HeroProps) {
  return (
    <section className="mx-auto max-w-xl py-16 text-center sm:py-20">
      <h1
        className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl"
        style={{ color: "var(--fg)" }}
      >
        {resume.name}
      </h1>
      <p
        className="mt-4 text-base leading-relaxed"
        style={{ color: "var(--fg-muted)" }}
      >
        {resume.bio}
      </p>
      <button
        onClick={onStartTour}
        disabled={tourActive}
        className="mt-8 rounded-full border px-6 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
        style={{
          borderColor: "var(--border)",
          color: "var(--fg)",
          transitionTimingFunction: EASE,
        }}
      >
        Take a tour
      </button>
    </section>
  );
}
