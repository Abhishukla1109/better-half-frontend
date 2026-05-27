"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Sparkles, Stethoscope, BarChart3, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const tabs = [
  { href: "/protocol", icon: Home, label: "Home" },
  { href: "/explore", icon: Search, label: "Shop" },
  { href: "/protocol", icon: Sparkles, label: "Ask", isCenter: true },
  { href: "/experts", icon: Stethoscope, label: "Experts" },
  { href: "/insights", icon: BarChart3, label: "Insights" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

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
        {tabs.map((tab) => {
          const isActive = tab.isCenter ? false : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <button
                key="ask"
                className="flex flex-col items-center justify-center gap-0.5 w-16 h-14 cursor-pointer"
                aria-label="Ask AI"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary-container">
                  <Icon className="w-5 h-5 text-on-primary-container" strokeWidth={1.5} />
                </div>
              </button>
            );
          }

          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-primary/70"
              }`}
            >
              <Icon
                className="w-[22px] h-[22px]"
                strokeWidth={isActive ? 2 : 1.5}
                fill={isActive ? "currentColor" : "none"}
              />
              <span className="text-[11px] font-semibold leading-none">
                {tab.label}
              </span>
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
          {tabs.map((tab) => {
            const isActive = tab.isCenter ? false : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            if (tab.isCenter) {
              return (
                <div
                  key="ask-desktop"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-container/15 text-primary-container cursor-default select-none"
                >
                  <Icon className="w-[20px] h-[20px]" strokeWidth={1.5} fill="none" />
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className="ml-auto text-[9px] font-bold text-primary-container/50 uppercase tracking-wider">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                  isActive
                    ? "bg-primary-fixed/20 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                }`}
              >
                <Icon
                  className="w-[20px] h-[20px]"
                  strokeWidth={isActive ? 2 : 1.5}
                  fill={isActive ? "currentColor" : "none"}
                />
                <span className="text-sm font-semibold">{tab.label}</span>
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
