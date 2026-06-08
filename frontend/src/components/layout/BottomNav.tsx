"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useActiveProfile } from "@/hooks/useActiveProfile";

const TABS: { key: string; label: string; emoji: string; href: string; isCenter?: boolean }[] = [
  { key: "home",     label: "Home",     emoji: "🏠", href: "/protocol"  },
  { key: "shop",     label: "Shop",     emoji: "🛒", href: "/explore"   },
  { key: "ask",      label: "Ask",      emoji: "✨", href: "/protocol", isCenter: true },
  { key: "experts",  label: "Experts",  emoji: "🩺", href: "/experts"   },
  { key: "insights", label: "Insights", emoji: "📊", href: "/insights"  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeMember } = useActiveProfile();
  const isKid = activeMember?.type === "child";

  const homeHref = isKid ? "/kids" : "/protocol";
  const resolvedTabs = TABS.map((t) => t.key === "home" ? { ...t, href: homeHref } : t);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    [
      "bh_auth", "bh_profile", "bh_profiles", "bh_active_profile",
      "bh_onboarding_state", "bh_protocol_visits", "bh_today_answers",
      "bh_theme", "bh_add_mode", "bh_protocol_built",
    ].forEach((k) => localStorage.removeItem(k));
    window.location.replace("/");
  };

  return (
    <>
      {/* Mobile: Bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-surface-container-lowest border-t border-outline-variant/10 flex items-center justify-around px-2 z-50"
        aria-label="Main navigation"
      >
        {resolvedTabs.map((tab) => {
          const href = tab.href;
          const isActive = tab.isCenter ? false : pathname.startsWith(href);

          if (tab.isCenter) {
            return (
              <div
                key={tab.key}
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 cursor-default select-none opacity-35"
              >
                <span className="text-[26px] leading-none">{tab.emoji}</span>
                <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wide leading-none mt-0.5">Soon</span>
              </div>
            );
          }

          return (
            <Link
              key={tab.key}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-14"
            >
              <span
                className={`text-[28px] leading-none transition-all duration-200 ${isActive ? "opacity-100 scale-110" : "opacity-50"}`}
              >
                {tab.emoji}
              </span>
              <span className={`text-[10px] font-bold leading-none transition-colors duration-200 ${isActive ? "text-primary" : "text-on-surface-variant/45"}`}>
                {tab.label}
              </span>
              {/* Active indicator dot */}
              <span className={`w-1 h-1 rounded-full bg-primary transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`} />
            </Link>
          );
        })}
      </nav>

      {/* Desktop: Side navigation */}
      <nav
        className="hidden lg:flex fixed top-0 left-0 h-dvh w-[240px] xl:w-[280px] bg-surface border-r border-outline-variant/10 flex-col py-8 px-4 z-50"
        aria-label="Main navigation"
      >
        {/* Logo + tagline */}
        <div className="px-4 mb-10">
          <span className="text-xl font-extrabold tracking-tight text-primary font-[family-name:var(--font-manrope)]">
            BetterHalf
          </span>
          <p className="text-[11px] text-on-surface-variant/45 mt-0.5 font-medium">Your AI health companion</p>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 flex-1">
          {TABS.map((tab) => {
            const href = tab.key === "home" ? homeHref : tab.href;
            const isActive = tab.isCenter ? false : pathname.startsWith(href);

            if (tab.isCenter) {
              return (
                <div
                  key={tab.key}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant/35 cursor-default select-none"
                >
                  <span className="text-[20px] leading-none opacity-40">{tab.emoji}</span>
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className="ml-auto text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-wider">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={tab.key}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                  isActive ? "bg-primary-fixed/15" : "hover:bg-surface-container-low"
                }`}
              >
                <span className={`text-[20px] leading-none transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-55"}`}>
                  {tab.emoji}
                </span>
                <span className={`text-sm font-semibold transition-colors duration-200 ${isActive ? "text-primary" : "text-on-surface-variant"}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pt-4 border-t border-outline-variant/10 space-y-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-on-surface-variant/60 hover:bg-surface-container-low hover:text-on-surface transition-colors duration-200 cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span className="text-sm font-semibold">Sign out</span>
          </button>
          <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest px-4">
            Powered by Mosaic Wellness
          </p>
        </div>
      </nav>
    </>
  );
}
