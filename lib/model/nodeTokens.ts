/**
 * Node-to-token mapping for the 3D attention navigation.
 *
 * Each resume.ts node is assigned a fixed token ID (0–11) within the
 * model's d_vocab=20 range. When a user clicks a node in the 3D scene,
 * that node's token ID is appended to the running sequence and fed
 * through the real trained transformer. The model's attention weights
 * then determine which earlier node "lights up" in response.
 *
 * This mapping is the bridge between the resume content and the
 * model's synthetic vocabulary — the model doesn't know about
 * "skills" or "projects", it only sees token IDs. The meaningful
 * structure emerges from the model's learned attention patterns.
 */

import { nodes, type ResumeNode } from "@/lib/content/resume";

export interface NodeToken {
  nodeId: string;
  token: number;
  position: [number, number, number]; // [x, y, z] in 3D space
}

/**
 * Fixed token assignment. Token IDs must be < d_vocab (20).
 *
 * Category grouping:
 *   Skills (0–4):       Left cluster
 *   Projects (5–8):     Center cluster
 *   Experience (9–11):  Right cluster
 *
 * Within each cluster, nodes are arranged in a loose arc for visual
 * separation while keeping related work spatially close.
 */
export const NODE_TOKENS: NodeToken[] = [
  // ── Skills (left cluster) ──
  { nodeId: "python-pytorch",       token: 0,  position: [-5.5,  1.5,  0.0] },
  { nodeId: "computer-vision",      token: 1,  position: [-6.0, -0.5,  0.3] },
  { nodeId: "mech-interp",          token: 2,  position: [-4.8, -2.0, -0.2] },
  { nodeId: "applied-math",         token: 3,  position: [-3.5, -0.8,  0.1] },
  { nodeId: "frontend-engineering", token: 4,  position: [-4.2,  1.2, -0.3] },

  // ── Projects (center cluster) ──
  { nodeId: "decompiled-mind",  token: 5,  position: [ 0.0,  2.0,  0.0] },
  { nodeId: "lung-nodule",      token: 6,  position: [ 1.2,  0.3,  0.4] },
  { nodeId: "exam-monitoring",  token: 7,  position: [ 0.5, -1.8, -0.2] },
  { nodeId: "rift-nyc",         token: 8,  position: [-1.2, -1.0,  0.1] },

  // ── Experience (right cluster) ──
  { nodeId: "ruskin-archive",  token: 9,  position: [ 5.0,  1.5, -0.2] },
  { nodeId: "senior-tutor",    token: 10, position: [ 5.8, -0.5,  0.3] },
  { nodeId: "cv-intern",       token: 11, position: [ 4.5, -1.8, -0.1] },
];

/** Fast lookup: nodeId → NodeToken */
export const NODE_TOKEN_MAP: Record<string, NodeToken> = Object.fromEntries(
  NODE_TOKENS.map((nt) => [nt.nodeId, nt]),
);

/** Fast lookup: token ID → NodeToken */
export const TOKEN_NODE_MAP: Record<number, NodeToken> = Object.fromEntries(
  NODE_TOKENS.map((nt) => [nt.token, nt]),
);

/**
 * Category color for the 3D scene.
 * Skills = blue-ish, Projects = warm, Experience = green-ish.
 */
export const CATEGORY_COLORS: Record<ResumeNode["category"], string> = {
  skill: "#4a9eff",
  project: "#ff6b4a",
  experience: "#4aff8b",
};

/**
 * Get the resume node's category by its token ID.
 */
export function getTokenCategory(token: number): ResumeNode["category"] | null {
  const entry = TOKEN_NODE_MAP[token];
  if (!entry) return null;
  const node = nodes.find((n) => n.id === entry.nodeId);
  return node?.category ?? null;
}
