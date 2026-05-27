"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type MemberType = "male" | "female" | "child";

function readActiveTheme(): MemberType {
  if (typeof window === "undefined") return "male";
  try {
    // Explicit real-time override written during onboarding
    const explicit = localStorage.getItem("bh_theme") as MemberType | null;
    if (explicit === "female" || explicit === "child") return explicit;
    if (explicit === "male") return "male";

    // Active profile from multi-profile store
    const activeId = localStorage.getItem("bh_active_profile");
    const raw = localStorage.getItem("bh_profiles");
    if (raw && activeId) {
      const members = JSON.parse(raw) as Array<{ id: string; type: MemberType }>;
      const active = members.find((m) => m.id === activeId);
      if (active) return active.type;
    }

    // Legacy single-profile fallback
    const legacy = localStorage.getItem("bh_profile");
    if (legacy) {
      const p = JSON.parse(legacy);
      if (p?.sex === "female") return "female";
      if (p?.memberType === "child") return "child";
    }
  } catch {}
  return "male";
}

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<MemberType>("male");
  const pathname = usePathname();

  // Re-read on every route change (covers onboarding → protocol navigation)
  useEffect(() => {
    setTheme(readActiveTheme());
  }, [pathname]);

  useEffect(() => {
    setTheme(readActiveTheme());

    // Same-tab explicit theme updates (dispatched from onboarding)
    function onThemeChange() { setTheme(readActiveTheme()); }
    // Cross-tab storage events
    function onStorage(e: StorageEvent) {
      if (e.key === "bh_theme" || e.key === "bh_active_profile" || e.key === "bh_profiles") {
        setTheme(readActiveTheme());
      }
    }

    window.addEventListener("bh-theme-change", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bh-theme-change", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <div data-theme={theme} className="contents">
      {children}
    </div>
  );
}
