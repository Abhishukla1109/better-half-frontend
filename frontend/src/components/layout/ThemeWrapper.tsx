"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type MemberType = "male" | "female" | "child";

function readActiveTheme(pathname: string): MemberType {
  if (typeof window === "undefined") return "male";
  try {
    // Active profile takes priority over bh_theme override
    const activeId = localStorage.getItem("bh_active_profile");
    const raw = localStorage.getItem("bh_profiles");
    if (raw && activeId) {
      const members = JSON.parse(raw) as Array<{ id: string; type: MemberType }>;
      const active = members.find((m) => m.id === activeId);
      if (active) {
        // Child orange theme only applies on /kids — everywhere else use the first adult's theme
        if (active.type === "child" && !pathname.startsWith("/kids")) {
          const adult = members.find((m) => m.type !== "child");
          return adult?.type ?? "male";
        }
        return active.type;
      }
    }

    // Explicit real-time override (set during profile switch / onboarding)
    const explicit = localStorage.getItem("bh_theme") as MemberType | null;
    if (explicit === "female" || explicit === "child") return explicit;
    if (explicit === "male") return "male";

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
  const pathname = usePathname();
  // Read synchronously on first client render so the correct theme is set before paint
  const [theme, setTheme] = useState<MemberType>(() => {
    if (typeof window === "undefined") return "male";
    return readActiveTheme(window.location.pathname);
  });

  // Re-read on every route change (covers onboarding → protocol navigation)
  useEffect(() => {
    setTheme(readActiveTheme(pathname));
  }, [pathname]);

  useEffect(() => {
    setTheme(readActiveTheme(pathname));

    // Same-tab explicit theme updates (dispatched from onboarding)
    function onThemeChange() { setTheme(readActiveTheme(pathname)); }
    // Cross-tab storage events
    function onStorage(e: StorageEvent) {
      if (e.key === "bh_theme" || e.key === "bh_active_profile" || e.key === "bh_profiles") {
        setTheme(readActiveTheme(pathname));
      }
    }

    window.addEventListener("bh-theme-change", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("bh-theme-change", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [pathname]);

  return (
    <div data-theme={theme} className="contents">
      {children}
    </div>
  );
}
