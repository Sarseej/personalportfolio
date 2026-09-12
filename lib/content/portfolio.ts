export const projects = [
  {
    id: "oncola",
    title: "OncoLA",
    category: "Patient care / Applied AI",
    date: "July – August 2026",
    summary:
      "Turning a patient’s everyday text message into information a care team can use.",
    tags: ["Next.js", "TypeScript", "Clinical workflows"],
    highlight: "Clinicians keep the final say.",
    evidence:
      "Semifinalist, Ochsner Health / ASCO Healthcare Hackathon. Draft SOAP notes require clinician approval.",
    notes: [
      "Patients and caregivers report chemotherapy symptoms through SMS. A Groq-hosted open-weight gpt-oss-120b model structures free-form English, French, and Spanish messages.",
      "The daily symptom-risk classifier achieved 0.78 recall and 0.68 precision on held-out data. These measurements describe that classifier, not clinical effectiveness. A separate forecaster estimates seven-day hospitalization risk; caregiver burden is tracked separately.",
      "Built with Next.js, TypeScript, Prisma, and SQLite. Verified through 143 automated tests, a concurrency load test, and FHIR-lite export validation against an HL7 reference validator.",
    ],
  },
  {
    id: "lidc",
    title: "LIDC Reader Disagreement",
    category: "Medical imaging / Research study",
    date: "August 2026",
    summary:
      "When radiologists disagree, can a model’s uncertainty help identify the difficult cases?",
    tags: ["Preregistered protocol", "CT imaging", "Uncertainty"],
    highlight: "The question comes before the result.",
    evidence:
      "Predeclared analyses, blinded review, and patient-level split validation keep the investigation accountable.",
    notes: [
      "The study investigates whether CT-model uncertainty predicts disagreement among LIDC-IDRI radiologists on noduleness. It is a research question, not a demonstrated finding.",
      "A capacity-constrained max-flow algorithm reconciles overlapping annotations into candidate lesions. A blinded-review interface supports assessment without exposing the signals being investigated.",
      "A 90-test synthetic suite validates patient-level split logic. The preregistered protocol and predeclared analyses preserve research integrity; interpretation must account for annotation reconciliation and the limits of this dataset.",
    ],
  },
  {
    id: "lung-nodules",
    title: "Lung Nodule Classification",
    category: "Medical imaging / Model development",
    date: "February – July 2026",
    summary:
      "A three-branch model that makes room for uncertainty alongside a lung-nodule classification.",
    tags: ["ResNet-18", "LUNA16", "DICOM"],
    highlight: "From CT series to model-ready inputs.",
    evidence:
      "A dedicated uncertainty-estimation branch complements a three-branch ResNet-18 architecture.",
    notes: [
      "Uses public LUNA16 CT data. The preprocessing pipeline converts DICOM series and LUNA16 coordinates and diameters into model-ready inputs.",
      "No performance or clinical-validation claim is presented here. Evaluation details will accompany the complete case study.",
    ],
  },
  {
    id: "rift",
    title: "RIFT-NYC",
    category: "Supporting work / Scientific computing",
    date: "July 2025 – February 2026",
    summary:
      "Bringing physical constraints into models of pipe stress and mechanical systems.",
    tags: ["Physics-informed modeling", "PDEs", "TensorBoard"],
    highlight: "Checked against engineering baselines.",
    evidence:
      "PDE-based and variational methods, developed through cross-functional collaboration.",
    notes: [
      "Contributed modular backend architecture, data-generation and preprocessing pipelines, and TensorBoard experiment tracking. Model outputs were validated against mechanical-engineering baselines.",
    ],
  },
] as const;

export const experience = [
  {
    role: "Software Developer",
    organization: "Southeastern Louisiana University · English Department",
    date: "June 2026 – Present",
    description:
      "Modernizing the Early Ruskin Manuscripts archive: TEI-XML publishing in PHP/MySQL, a Dockerized TLS-secured multi-node Elasticsearch cluster, and historical visualizations with Leaflet.js and TimelineJS.",
  },
  {
    role: "Mathematics Tutor / Senior Mathematics Tutor",
    organization: "Southeastern Louisiana University",
    date: "September 2023 – May 2026",
    description:
      "Taught Statistics, Calculus I–III, Linear Algebra, Differential Equations, and Numerical Methods. Advanced to Senior Tutor, mentored incoming tutors, and developed study guides used across course sections.",
  },
  {
    role: "AI/ML Intern",
    organization: "Nawaratna Life School",
    date: "June – August 2025",
    description:
      "Built a retrieval-augmented chatbot with FAISS and Flask, and a teacher-facing AI-writing triage classifier. Benchmarked precision and recall, with privacy safeguards and human review.",
  },
  {
    role: "SQL & Data Systems Intern",
    organization: "Nawaratna EBS",
    date: "August 2020 – May 2022",
    description:
      "Moved paper records into a relational SQL database. Built SQL reports and Python dashboards, used OpenCV for document processing, and analyzed remote-learning survey feedback.",
  },
] as const;

export const projectStories = {
  oncola: {
    problem:
      "Chemotherapy patients and caregivers need a simple way to report symptoms between visits. Care teams need usable information without surrendering clinical judgment.",
    role: "Full-stack application development: symptom-reporting workflows, structured data, risk modeling, and validation.",
    approach:
      "Keep reporting conversational, separate different kinds of risk, and put a clinician approval step between a generated draft and its use.",
    result:
      "A patient-monitoring application recognized as a hackathon semifinalist, with multilingual SMS intake and clinician-approved SOAP-note drafts.",
    limitation:
      "Held-out classifier metrics do not establish clinical effectiveness. Generated notes require clinician approval; the daily classifier and seven-day forecaster are separate models.",
    technologies: [
      "Next.js",
      "TypeScript",
      "Prisma",
      "SQLite",
      "Groq",
      "gpt-oss-120b",
    ],
    stages: [
      {
        title: "Report",
        text: "Patients and caregivers send free-form symptom reports through SMS in English, French, or Spanish.",
      },
      {
        title: "Structure",
        text: "The language model turns messages into structured symptom information and drafts a SOAP note. Caregiver burden is tracked separately.",
      },
      {
        title: "Review",
        text: "The draft requires clinician approval. This human checkpoint is part of the application’s safety design.",
      },
    ],
  },
  lidc: {
    problem:
      "Radiologists can disagree about whether an annotated CT finding is a nodule. The study asks whether model uncertainty helps identify those difficult cases.",
    role: "Research protocol and supporting engineering: annotation reconciliation, a blinded-review interface, and validation of patient-level split logic.",
    approach:
      "Preregister the protocol and predeclare analyses, reconcile overlapping annotations, then assess the research question without changing the analysis around the outcome.",
    result:
      "A preregistered study framework with a capacity-constrained max-flow reconciliation algorithm and a 90-test synthetic split-validation suite.",
    limitation:
      "The uncertainty–disagreement relationship is a question under investigation, not a demonstrated finding. Annotation reconciliation and dataset-specific limits affect interpretation.",
    technologies: [
      "LIDC-IDRI",
      "CT imaging",
      "Max-flow",
      "Blinded review",
      "Patient-level validation",
    ],
    stages: [
      {
        title: "Annotations",
        text: "LIDC-IDRI reader annotations can overlap and differ in judgments about noduleness.",
      },
      {
        title: "Reconcile",
        text: "A capacity-constrained max-flow algorithm reconciles overlapping annotations into candidate lesions.",
      },
      {
        title: "Evaluate",
        text: "Blinded review and predeclared analyses preserve the distinction between a hypothesis and evidence supporting it.",
      },
    ],
  },
  "lung-nodules": {
    problem:
      "A lung-nodule classification needs a consistent path from CT data to model input, with uncertainty considered alongside the predicted class.",
    role: "Model and preprocessing development for a three-branch ResNet-18 using public LUNA16 CT data.",
    approach:
      "Convert DICOM series and nodule coordinates/diameters into model-ready inputs, then use a dedicated branch for uncertainty estimation.",
    result:
      "A three-branch classification architecture and a preprocessing pipeline connecting public CT data to model-ready inputs.",
    limitation:
      "No accuracy, clinical validation, or deployment outcome is claimed. Detailed evaluation remains a next step for the case study.",
    technologies: ["ResNet-18", "LUNA16", "DICOM", "Uncertainty estimation"],
    stages: [
      {
        title: "CT data",
        text: "Public LUNA16 data supplies the CT series and nodule coordinates and diameters.",
      },
      {
        title: "Prepare",
        text: "The preprocessing pipeline converts the DICOM series and annotation coordinates into model-ready inputs.",
      },
      {
        title: "Classify",
        text: "Three ResNet-18 branches include a dedicated uncertainty-estimation branch. This diagram describes the architecture, not an inference result.",
      },
    ],
  },
  rift: {
    problem:
      "Models of pipe stress and mechanical systems need to remain connected to physical constraints and engineering baselines.",
    role: "Contributed modular backend architecture, data-generation and preprocessing pipelines, and experiment tracking through cross-functional collaboration.",
    approach:
      "Use PDE-based and variational methods, track experiments, and compare model outputs with mechanical-engineering baselines.",
    result:
      "A physics-informed application with modular data pipelines and outputs validated against mechanical-engineering baselines.",
    limitation:
      "No quantitative performance improvement or production deployment claim is available. The engineering baselines provide context for validation, not a claim of universal accuracy.",
    technologies: [
      "Physics-informed modeling",
      "PDEs",
      "Variational methods",
      "TensorBoard",
    ],
    stages: [
      {
        title: "Physics",
        text: "PDE-based and variational methods encode the mechanical problem being modeled.",
      },
      {
        title: "Experiment",
        text: "Data-generation and preprocessing pipelines support modular experiments tracked with TensorBoard.",
      },
      {
        title: "Validate",
        text: "Model outputs are checked against mechanical-engineering baselines in collaboration across disciplines.",
      },
    ],
  },
} as const;

export const career = [
  {
    id: "data",
    kind: "Experience",
    date: "Aug 2020 – May 2022",
    title: "SQL & data systems",
    organization: "Nawaratna EBS",
    detail:
      "Migrated paper records into SQL, built reporting and Python dashboards, and used OpenCV for document processing.",
    connection:
      "A foundation in making information usable through structured data and dependable tools.",
  },
  {
    id: "foundations",
    kind: "Experience",
    date: "Sep 2023 – May 2026",
    title: "Mathematics Tutor → Senior Mathematics Tutor",
    organization: "Southeastern Louisiana University",
    detail:
      "Tutored Statistics, Calculus I–III, Linear Algebra, Differential Equations, and Numerical Methods, translating difficult concepts into understandable steps. Advanced to Senior Mathematics Tutor, mentored incoming tutors, and developed study guides used across course sections.",
    connection:
      "Analytical thinking, leadership and clear technical communication carry forward into model evaluation, research and reliable software.",
  },
  {
    id: "applied",
    kind: "Experience",
    date: "Jun – Aug 2025",
    title: "Applied AI",
    organization: "Nawaratna Life School · AI/ML Intern",
    detail:
      "Built a retrieval-augmented chatbot and an AI-writing triage classifier with privacy safeguards and human review. Benchmarked precision and recall.",
    connection:
      "Model behavior matters alongside the workflow and the people interpreting its output.",
  },
  {
    id: "rift",
    kind: "Project",
    date: "Jul 2025 – Feb 2026",
    title: "RIFT-NYC",
    organization: "Physics-informed modeling",
    detail:
      "PDE-based and variational methods, modular pipelines, and comparisons with mechanical-engineering baselines.",
    connection:
      "Moves from application behavior to the constraints that make a model useful.",
  },
  {
    id: "lung",
    kind: "Project",
    date: "Feb – Jul 2026",
    title: "Lung Nodule Classification",
    organization: "Medical machine learning",
    detail:
      "Three-branch ResNet-18 and CT preprocessing, with a dedicated uncertainty-estimation branch.",
    connection: "Brings model uncertainty into a medical-imaging problem.",
  },
  {
    id: "archive",
    kind: "Experience",
    date: "Jun 2026 – Present",
    title: "Software Developer",
    organization: "SELU · English Department",
    detail:
      "Developing the Early Ruskin Manuscripts archive: TEI-XML publishing, PHP/MySQL, Dockerized TLS-secured Elasticsearch, and historical visualizations.",
    connection:
      "Reliable research also depends on strong publishing, search, and data infrastructure.",
  },
  {
    id: "oncola",
    kind: "Project",
    date: "Jul – Aug 2026",
    title: "OncoLA",
    organization: "Patient-monitoring application",
    detail:
      "Multilingual symptom intake and clinician-approved note drafts. Semifinalist in the Ochsner Health / ASCO Healthcare Hackathon.",
    connection:
      "Applies model evaluation and explicit human review to a care-team workflow.",
  },
  {
    id: "lidc",
    kind: "Project",
    date: "Aug 2026",
    title: "LIDC Reader Disagreement",
    organization: "Preregistered research study",
    detail:
      "Investigates uncertainty and reader disagreement using predeclared analyses, annotation reconciliation, and blinded review.",
    connection:
      "Studies the limits of agreement instead of assuming every answer is certain.",
  },
  {
    id: "education",
    kind: "Education",
    date: "May 2027 · expected",
    title: "B.S. Computer Science",
    organization: "Southeastern Louisiana University",
    detail:
      "Computer Science student focused on applied AI/ML, data systems, and trustworthy model behavior.",
    connection:
      "The current direction: build intelligent systems and study what makes them trustworthy.",
  },
] as const;

export const skillGroups = [
  {
    title: "Application & data systems",
    items: "Next.js, TypeScript, React, Prisma, SQLite, SQL, PHP, MySQL, APIs",
  },
  {
    title: "Machine learning & scientific computing",
    items:
      "Python, ResNet-18, uncertainty estimation, RAG, FAISS, Flask, OpenCV, TensorBoard, PDE-based and variational methods",
  },
  {
    title: "Infrastructure & research tools",
    items:
      "Docker, Elasticsearch, TLS, automated testing, TEI-XML, Leaflet.js, TimelineJS",
  },
] as const;
