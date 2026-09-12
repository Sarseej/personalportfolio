import type { Metadata } from "next";
import "./globals.css";
import "./after-hours.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
