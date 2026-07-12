export interface NodeMapEntry {
  layer: number;
  head: number;
}

export const nodeMap: Record<string, NodeMapEntry> = {
  "mech-interp": { layer: 0, head: 0 },
  "transformer-toy": { layer: 0, head: 1 },
  pytorch: { layer: 1, head: 0 },
  "data-pipeline": { layer: 1, head: 1 },
  "research-intern": { layer: 2, head: 0 },
  fullstack: { layer: 2, head: 1 },
};
