import { create } from "zustand";
import type {
  ModelWeights,
  RawWeights,
  AttentionPatterns,
} from "@/lib/model/toyTransformer";
import { loadWeights, forwardWithPatterns } from "@/lib/model/toyTransformer";
import { generateDemoSequence } from "@/lib/model/demoSequence";
import type { DemoSequence } from "@/lib/model/demoSequence";
import { NODE_TOKEN_MAP, TOKEN_NODE_MAP } from "@/lib/model/nodeTokens";
import { nodes } from "@/lib/content/resume";

export type Mode = "standard" | "decompile";

/** Induction heads (Layer 1) — strongest attention circuit in the model. */
const INDUCTION_HEADS = [0, 2, 3]; // L1H0, L1H2, L1H3

export interface AttentionBeam {
  fromToken: number; // the just-clicked node's token
  toToken: number;   // the earlier node with strongest attention
  weight: number;    // summed attention weight across induction heads
  fromPos: [number, number, number];
  toPos: [number, number, number];
}

interface ModelState {
  mode: Mode;
  prompt: string;
  ablatedNodeIds: Set<string>;

  // Model weights (loaded once)
  weights: ModelWeights | null;
  weightsLoading: boolean;

  // Decompile mode state
  demoSequence: DemoSequence;
  patterns: AttentionPatterns | null;

  // 3D navigation state
  clickedTokens: number[];        // running token sequence from clicks
  currentBeam: AttentionBeam | null;
  selectedNodeId: string | null;  // which node's content panel is open

  setMode: (mode: Mode) => void;
  setPrompt: (prompt: string) => void;
  toggleAblation: (nodeId: string) => void;

  // Decompile actions
  loadWeights: () => Promise<void>;
  regenerateDemo: () => void;

  // 3D navigation actions
  clickNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  resetSequence: () => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  mode: "standard",
  prompt: "",
  ablatedNodeIds: new Set<string>(),

  weights: null,
  weightsLoading: false,

  demoSequence: generateDemoSequence(),
  patterns: null,

  clickedTokens: [],
  currentBeam: null,
  selectedNodeId: null,

  setMode: (mode) => set({ mode }),
  setPrompt: (prompt) => set({ prompt }),
  toggleAblation: (nodeId) =>
    set((state) => {
      const next = new Set(state.ablatedNodeIds);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return { ablatedNodeIds: next };
    }),

  loadWeights: async () => {
    if (get().weights || get().weightsLoading) return;
    set({ weightsLoading: true });
    try {
      const res = await fetch("/weights.json");
      const raw: RawWeights = await res.json();
      const w = loadWeights(raw);
      set({ weights: w });
      const seq = get().demoSequence;
      const { patterns } = forwardWithPatterns(w, seq.tokens);
      set({ patterns });
    } catch (e) {
      console.error("Failed to load model weights:", e);
    } finally {
      set({ weightsLoading: false });
    }
  },

  regenerateDemo: () => {
    const seq = generateDemoSequence();
    set({ demoSequence: seq });
    const w = get().weights;
    if (w) {
      const { patterns } = forwardWithPatterns(w, seq.tokens);
      set({ patterns });
    }
  },

  clickNode: (nodeId: string) => {
    const { weights, clickedTokens } = get();
    const tokenEntry = NODE_TOKEN_MAP[nodeId];
    if (!weights || !tokenEntry) return;

    const token = tokenEntry.token;
    const newTokens = [...clickedTokens, token];

    // Run real model inference on the full sequence
    const { patterns } = forwardWithPatterns(weights, newTokens);

    // Extract attention from induction heads at the last position
    const T = newTokens.length;
    const lastPos = T - 1;

    // Sum attention weights across induction heads for each key position
    const summedAttn = new Float64Array(T);
    for (const headIdx of INDUCTION_HEADS) {
      const headAttn = patterns[1][headIdx][lastPos]; // Layer 1
      for (let s = 0; s < T; s++) {
        summedAttn[s] += headAttn[s];
      }
    }

    // Find the strongest earlier position (exclude current position)
    let bestPos = 0;
    let bestWeight = 0;
    for (let s = 0; s < lastPos; s++) {
      if (summedAttn[s] > bestWeight) {
        bestWeight = summedAttn[s];
        bestPos = s;
      }
    }

    // Map token positions back to nodeIds for3D coordinates
    const currentTokenEntry = TOKEN_NODE_MAP[token];
    const sourceTokenEntry = TOKEN_NODE_MAP[newTokens[bestPos]];

    const beam: AttentionBeam | null =
      lastPos > 0 && currentTokenEntry && sourceTokenEntry
        ? {
            fromToken: token,
            toToken: newTokens[bestPos],
            weight: bestWeight,
            fromPos: currentTokenEntry.position,
            toPos: sourceTokenEntry.position,
          }
        : null;

    // Find the node ID for the selected node
    const clickedNode = nodes.find((n) => n.id === nodeId);

    set({
      clickedTokens: newTokens,
      patterns,
      currentBeam: beam,
      selectedNodeId: clickedNode?.id ?? null,
    });
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  resetSequence: () =>
    set({
      clickedTokens: [],
      currentBeam: null,
      selectedNodeId: null,
    }),
}));
