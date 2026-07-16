"use client";

import { useCallback } from "react";

const NAV_LINKS = [
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
] as const;

export default function StickyNav() {
  const scrollTo = useCallback((href: string) => {
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg) 85%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight sm:text-base"
        style={{ color: "var(--fg)" }}
      >
        The Decompiled Mind
      </span>

      <div className="flex items-center gap-6">
        <div className="hidden items-center gap-5 sm:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--fg-muted)" }}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
