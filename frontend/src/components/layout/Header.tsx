"use client";

import { Bell, User } from "lucide-react";

export default function Header() {
  return (
    <header className="glass-header fixed top-0 left-0 right-0 z-40 lg:left-[240px] xl:left-[280px]">
      <div className="max-w-4xl mx-auto flex items-center justify-between h-12 px-4">
        {/* Logo */}
        <span className="text-base font-extrabold tracking-tight text-primary font-[family-name:var(--font-manrope)]">
          BetterHalf
        </span>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-low transition-colors duration-200 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-on-surface-variant" strokeWidth={1.5} />
          </button>

          {/* Profile avatar */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-container cursor-pointer"
            aria-label="Profile"
          >
            <User className="w-4 h-4 text-on-primary-container" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
