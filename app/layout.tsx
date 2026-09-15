import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./after-hours.css";
import "./living-workstation.css";
import "./latent-studio.css";
import "./studio-typography.css";
import "./signal-field.css";
import "./blue-meadow.css";

const display = localFont({ src: "./fonts/instrument-serif.woff2", variable: "--font-display", display: "swap", weight: "400", preload: false, fallback: ["serif"] });
const body = localFont({ src: "./fonts/manrope.woff2", variable: "--font-body", display: "swap", weight: "200 800", fallback: ["system-ui"] });
const mono = localFont({ src: "./fonts/ibm-plex-mono.woff2", variable: "--font-mono", display: "swap", weight: "400", preload: false, fallback: ["monospace"] });
const accent = localFont({ src: "./fonts/newsreader-light-italic.woff2", variable: "--font-accent", display: "swap", weight: "300", style: "italic", preload: false, fallback: ["serif"] });

export const metadata: Metadata = {
  title: "Sarseej Shrestha — AI/ML Developer",
  description:
    "Explore the computational workspace of Sarseej Shrestha: AI/ML developer, systems builder, and Computer Science student at Southeastern Louisiana University.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${accent.variable}`}>
      <body>{children}</body>
    </html>
  );
}
