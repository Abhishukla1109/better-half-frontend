"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, User } from "lucide-react";
import CartButton from "@/components/cart/CartButton";

export default function Header() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const router = useRouter();

  const handleLogoClick = useCallback(() => {
    sessionStorage.removeItem("bh_onboarding_state");
    sessionStorage.removeItem("bh_profile");
    sessionStorage.removeItem("bh_protocol_built");
    sessionStorage.removeItem("bh_home_left");
    router.push("/home");
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < 10) {
        // Always show at top
        setVisible(true);
      } else if (delta > 5) {
        // Scrolling down
        setVisible(false);
      } else if (delta < -5) {
        // Scrolling up
        setVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className="glass-header fixed left-0 right-0 z-40 lg:left-[240px] xl:left-[280px] transition-transform duration-300 ease-out"
      style={{ transform: visible ? "translateY(0)" : "translateY(-100%)" }}
      data-header-visible={visible}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between h-12 px-4">
        {/* Logo — acts as home/restart button */}
        <button
          onClick={handleLogoClick}
          className="text-base font-extrabold tracking-tight text-primary font-[family-name:var(--font-manrope)] cursor-pointer"
          aria-label="Go to home"
        >
          BetterHalf
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <CartButton />

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
