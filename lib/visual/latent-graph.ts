import { signalNodes } from "./signal-field";
export const themes = signalNodes.filter(n => n.type === "project" || n.type === "contribution").map(n => ({name:n.name}));
export function seed(text: string) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0) / 4294967295;
}
