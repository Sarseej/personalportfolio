import { create } from "zustand";

export type Mode = "standard" | "decompile";

interface ModelState {
  mode: Mode;
  prompt: string;
  ablatedNodeIds: Set<string>;
  setMode: (mode: Mode) => void;
  setPrompt: (prompt: string) => void;
  toggleAblation: (nodeId: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  mode: "standard",
  prompt: "",
  ablatedNodeIds: new Set<string>(),
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
}));
