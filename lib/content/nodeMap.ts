export interface NodeMapEntry {
  layer: number;
  head: number;
}

export const nodeMap: Record<string, NodeMapEntry> = {
  "python-pytorch": { layer: 0, head: 0 },
  "computer-vision": { layer: 0, head: 1 },
  "mech-interp": { layer: 0, head: 2 },
  "applied-math": { layer: 0, head: 3 },
  "frontend-engineering": { layer: 1, head: 0 },
  "decompiled-mind": { layer: 1, head: 1 },
  "lung-nodule": { layer: 1, head: 2 },
  "exam-monitoring": { layer: 1, head: 3 },
  "rift-nyc": { layer: 0, head: 0 },
  "ruskin-archive": { layer: 0, head: 1 },
  "senior-tutor": { layer: 0, head: 2 },
  "cv-intern": { layer: 0, head: 3 },
};
