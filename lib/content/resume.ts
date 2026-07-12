export interface ResumeNode {
  id: string;
  label: string;
  description: string;
  category: "project" | "skill" | "experience";
}

export const resume = {
  name: "[Your Name]",
  bio: "Computer Science + Data Science student focused on Mechanistic Interpretability — building tools that make neural networks transparent.",
} as const;

export const nodes: ResumeNode[] = [
  {
    id: "mech-interp",
    label: "Mechanistic Interpretability",
    description:
      "Research into reverse-engineering neural network circuits to understand internal representations and feature superposition.",
    category: "project",
  },
  {
    id: "transformer-toy",
    label: "Toy Transformer Lab",
    description:
      "Interactive sandbox for training and probing small transformers with real-time attention visualization and ablation studies.",
    category: "project",
  },
  {
    id: "pytorch",
    label: "PyTorch",
    description:
      "Deep experience building custom training loops, autograd hooks, and model surgery for interpretability experiments.",
    category: "skill",
  },
  {
    id: "data-pipeline",
    label: "Data Engineering",
    description:
      "Building reproducible data pipelines for large-scale dataset curation, cleaning, and versioning with DVC and Arrow.",
    category: "skill",
  },
  {
    id: "research-intern",
    label: "Research Intern — [Lab Name]",
    description:
      "Investigated feature circuits in medium-scale language models, produced internal report on induction heads.",
    category: "experience",
  },
  {
    id: "fullstack",
    label: "Full-Stack Development",
    description:
      "React/Next.js frontends, FastAPI backends, PostgreSQL databases — shipping end-to-end products from prototype to prod.",
    category: "skill",
  },
];
