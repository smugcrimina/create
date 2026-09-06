export type ThemeId = "light" | "dark" | "navy" | "forest";

export const THEMES: { id: ThemeId; name: string; swatch: string }[] = [
  { id: "light", name: "Aydınlık", swatch: "#f1f5f9" },
  { id: "dark", name: "Koyu", swatch: "#1e293b" },
  { id: "navy", name: "Gece Mavisi", swatch: "#122745" },
  { id: "forest", name: "Orman", swatch: "#123026" },
];

const VALID: ThemeId[] = ["light", "dark", "navy", "forest"];

export function getTheme(): ThemeId {
  if (typeof window === "undefined") return "light";
  try {
    const t = localStorage.getItem("ist_theme") as ThemeId | null;
    if (t && VALID.includes(t)) return t;
  } catch {}
  return "light";
}

/** data-theme özniteliğini ve koyu tema sınıfını <html> üzerinde uygular. */
export function applyTheme(t: ThemeId): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-theme", t);
  el.classList.toggle("theme-dark", t !== "light");
}

export function setTheme(t: ThemeId): void {
  try { localStorage.setItem("ist_theme", t); } catch {}
  applyTheme(t);
}
