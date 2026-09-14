export type View = "home" | "projects" | "career" | "cv" | "field";
export type Station = Exclude<View, "home" | "field">;
export const stations: {
  id: Station;
  number: string;
  label: string;
  detail: string;
}[] = [
  { id: "projects", number: "01", label: "Projects", detail: "Main monitor" },
  { id: "career", number: "02", label: "Career", detail: "Secondary monitor" },
  { id: "cv", number: "03", label: "CV", detail: "Paper on the desk" },
];
export function viewFromHash(hash: string): View {
  const value = hash.replace(/^#/, "");
  return value === "field" || value === "projects" || value === "career" || value === "cv"
    ? value
    : "home";
}
export type ScreenBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export type RoomProps = {
  station: View;
  navigationVersion: number;
  hovered: Station | null;
  onSelect: (station: Station) => void;
  onHover: (station: Station | null) => void;
  onSettled: (station: View) => void;
  onScreenBounds: (bounds: ScreenBounds) => void;
  pointer: { current: [number, number] };
  interacting: { current: boolean };
  reveal: boolean;
  mobile: boolean;
  economy: boolean;
  reduced: boolean;
  visible: boolean;
  onReady: () => void;
  onFailure: () => void;
};
