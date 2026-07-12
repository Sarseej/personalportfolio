"use client";

import { useModelStore } from "@/lib/store/useModelStore";

export default function ModeToggle() {
  const mode = useModelStore((s) => s.mode);
  const setMode = useModelStore((s) => s.setMode);

  const handleToggle = () => {
    const next = mode === "standard" ? "decompile" : "standard";
    document.documentElement.setAttribute("data-mode", next);
    setMode(next);
  };

  return (
    <button
      onClick={handleToggle}
      className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)]"
      style={{
        borderColor: "var(--border)",
        color: "var(--fg)",
      }}
    >
      {mode === "standard" ? "Standard" : "Decompile"}
    </button>
  );
}
