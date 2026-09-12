import Link from "next/link";
import type { Metadata } from "next";
import CVDocument from "@/components/portfolio/CVDocument";
export const metadata: Metadata = { title: "CV — Sarseej Shrestha" };
export default function Resume() {
  return (
    <main className="standalone-cv">
      <Link className="cv-return" href="/#cv">
        ← Return to workspace
      </Link>
      <h1 className="sr-only">Sarseej Shrestha — CV</h1>
      <CVDocument />
      <p className="print-hint">Use your browser’s Print menu to save a PDF.</p>
    </main>
  );
}
