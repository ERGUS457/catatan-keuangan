"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
      document.documentElement.classList.toggle("light", saved === "light");
    } else {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}

    if (next === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/80 border border-slate-700/80 text-sm ${className}`}
      >
        <span className="opacity-0">🌙</span>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === "dark" ? "Beralih ke Tema Terang" : "Beralih ke Tema Gelap"}
      title={theme === "dark" ? "Beralih ke Tema Terang (Light Mode)" : "Beralih ke Tema Gelap (Dark Mode)"}
      className={`w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 active:scale-95 transition-all text-base cursor-pointer shadow-sm ${className}`}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
