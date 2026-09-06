"use client";

import { useEffect, useState } from "react";
import { THEMES, getTheme, setTheme, type ThemeId } from "@/lib/theme";

/** 4 temalı seçici. Seçim localStorage'a yazılır (her kullanıcı/cihaz kendi teması). */
export default function ThemeSwitcher() {
  const [theme, setLocal] = useState<ThemeId>("light");

  useEffect(() => {
    setLocal(getTheme());
  }, []);

  function pick(t: ThemeId) {
    setTheme(t);
    setLocal(t);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => pick(t.id)}
          className={`btn-press flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition ${
            theme === t.id ? "border-emerald-400 ring-2 ring-emerald-200" : "border-gray-200"
          }`}
        >
          <span
            className="w-5 h-5 rounded-full border border-black/20 flex-shrink-0"
            style={{ background: t.swatch }}
          ></span>
          <span className="text-xs font-bold text-gray-700">{t.name}</span>
          {theme === t.id && <span className="ml-auto text-emerald-500 text-sm">✓</span>}
        </button>
      ))}
    </div>
  );
}
