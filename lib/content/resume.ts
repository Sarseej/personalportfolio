export interface ResumeNode {
  id: string;
  label: string;
  description: string;
  category: "project" | "skill" | "experience";
}

export const resume = {
  name: "Sarseej Shrestha",
  bio: "Computer Science student at Southeastern Louisiana University, concentrating in Data Science, with a focus on Mechanistic Interpretability — understanding not just what models predict, but why.",
} as const;

export const nodes: ResumeNode[] = [
  {
    id: "python-pytorch",
    label: "Python / PyTorch",
    description:
      "Deep experience building custom training loops, autograd hooks, and model surgery for interpretability experiments.",
    category: "skill",
  },
  {
    id: "computer-vision",
    label: "Computer Vision",
    description:
      "Building and deploying vision models — object detection (YOLOv3), multi-view CNNs for medical imaging, and real-time inference pipelines.",
    category: "skill",
  },
  {
    id: "mech-interp",
    label: "Mechanistic Interpretability",
    description:
      "Research into reverse-engineering neural network circuits to understand internal representations — induction heads, feature superposition, and causal patching.",
    category: "skill",
  },
  {
    id: "applied-math",
    label: "Applied Math (PDEs, Numerical Methods)",
    description:
      "Foundational work in partial differential equations, variational modeling, and numerical analysis — bridging physics and machine learning.",
    category: "skill",
  },
  {
    id: "frontend-engineering",
    label: "Frontend Engineering (React, Mapping/Geo)",
    description:
      "React/Next.js frontends with interactive data visualization, geographic mapping, and real-time annotation interfaces.",
    category: "skill",
  },
  {
    id: "decompiled-mind",
    label: "The Decompiled Mind",
    description:
      "An interactive interpretability experiment: a small transformer trained from scratch on a synthetic induction task, hand-ported to run live in the browser, with validated attention visualizations and causal patching.",
    category: "project",
  },
  {
    id: "lung-nodule",
    label: "Lung Nodule Detection — LUNA16",
    description:
      "A multi-view CNN (three ResNet-18 branches over axial/coronal/sagittal CT slices, fused for prediction) trained on the public LUNA16 dataset to flag candidate nodules for review — detection only; diagnosis stays with clinicians.",
    category: "project",
  },
  {
    id: "exam-monitoring",
    label: "Automated Exam Monitoring",
    description:
      "A real-time proctoring prototype using YOLOv3 and OpenCV to detect unauthorized objects and multiple people in frame, with inference testing under Linux.",
    category: "project",
  },
  {
    id: "rift-nyc",
    label: "RIFT-NYC",
    description:
      "Bridges mechanical engineering and ML: pipe-stress analysis and PDE/variational modeling applied to a scalable backend architecture, with physics-informed neural network experimentation tracked via TensorBoard.",
    category: "project",
  },
  {
    id: "ruskin-archive",
    label: "Web Developer — Early Ruskin Manuscripts Archive",
    description:
      "Own the frontend for a digital archive of 19th-century John Ruskin manuscripts: interactive zoom/annotation viewer for handwritten primary sources, backend integration (Nginx, Express, PHP, TEI XML), and geographic mapping tying manuscripts to locations. Built documentation enabling non-technical staff to manage the archive independently.",
    category: "experience",
  },
  {
    id: "senior-tutor",
    label: "Senior Mathematics Tutor — SELU",
    description:
      "Promoted from Tutor to Senior Tutor; led sessions in Calculus I-III, Linear Algebra, and Differential Equations; mentored junior tutors; built structured problem-solving frameworks.",
    category: "experience",
  },
  {
    id: "cv-intern",
    label: "Computer Vision & Data Science Intern — Nawaratna EBS",
    description:
      "Built an online exam monitoring prototype (YOLOv3/OpenCV), converted legacy student records to structured databases, created performance dashboards with Pandas/Matplotlib.",
    category: "experience",
  },
];
