import { create } from "zustand";
import type {
  ModelWeights,
  RawWeights,
  AttentionPatterns,
} from "@/lib/model/toyTransformer";
import { loadWeights, forwardWithPatterns } from "@/lib/model/toyTransformer";
import { generateDemoSequence } from "@/lib/model/demoSequence";
import type { DemoSequence } from "@/lib/model/demoSequence";

export type Mode = "standard" | "decompile";

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

  setMode: (mode: Mode) => void;
  setPrompt: (prompt: string) => void;
  toggleAblation: (nodeId: string) => void;

  // Decompile actions
  loadWeights: () => Promise<void>;
  regenerateDemo: () => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  mode: "standard",
  prompt: "",
  ablatedNodeIds: new Set<string>(),

  weights: null,
  weightsLoading: false,

  demoSequence: generateDemoSequence(),
  patterns: null,

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
      // Run inference on current demo sequence
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
}));
