"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

const DEMO_EXISTING_PHONE = "9999999999";

const DEMO_EXISTING_PROFILE = {
  name: "Rahul",
  sex: "male",
  age: "25-34",
  concern: "Hair / beard",
  concerns: "Hair / beard,Energy / gut",
  hair_concern_type: "thinning",
  energy_concern_type: "low_energy",
  diet: "non-veg",
};

function signIn(isExistingUser: boolean) {
  localStorage.setItem("bh_auth", JSON.stringify({ loggedIn: true }));
  if (isExistingUser) {
    localStorage.setItem("bh_profile", JSON.stringify(DEMO_EXISTING_PROFILE));
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  // Already logged in — route to the right place
  useEffect(() => {
    try {
      const auth = localStorage.getItem("bh_auth");
      if (auth) {
        const profile = localStorage.getItem("bh_profile");
        const p = profile ? JSON.parse(profile) : null;
        router.replace(p?.diet ? "/protocol" : "/home");
      }
    } catch {}
  }, [router]);

  const handlePhoneContinue = () => {
    const cleaned = phone.replace(/\s/g, "");
    const isExisting = cleaned === DEMO_EXISTING_PHONE;
    signIn(isExisting);
    router.replace(isExisting ? "/protocol" : "/home");
  };

  const handleGoogle = () => {
    signIn(false);
    router.replace("/home");
  };

  return (
    <main className="w-full min-h-dvh flex flex-col items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container/15 mb-8 mx-auto">
          <Sparkles className="w-6 h-6 text-primary-container" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h1 className="text-[28px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] text-center leading-tight mb-2">
          Welcome to BetterHalf
        </h1>
        <p className="text-sm text-on-surface-variant/70 text-center leading-relaxed mb-10">
          Your personal health protocol, built by AI — free and instant.
        </p>

        {/* Phone input */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
            Phone Number
          </p>
          <div className="flex items-center gap-2 border border-outline-variant/30 rounded-xl px-4 py-3.5 bg-surface-container-lowest focus-within:border-primary-container/50 transition-colors">
            <span className="text-sm font-semibold text-on-surface-variant">+91</span>
            <div className="w-px h-4 bg-outline-variant/30" />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="98000 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && phone.trim()) handlePhoneContinue(); }}
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/35 outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* OTP CTA */}
        <button
          onClick={handlePhoneContinue}
          disabled={!phone.trim()}
          className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors duration-200 cursor-pointer mb-6 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Continue</span>
          <span className="text-lg leading-none">→</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-outline-variant/20" />
          <span className="text-xs text-on-surface-variant/40 font-medium">or</span>
          <div className="flex-1 h-px bg-outline-variant/20" />
        </div>

        {/* Google CTA */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-outline-variant/25 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-[10px] text-on-surface-variant/35 text-center mt-6">
          Free forever · No spam · Your data stays private
        </p>

        {/* Demo hint */}
        <div className="mt-8 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/10">
          <p className="text-[11px] text-on-surface-variant/60 text-center leading-relaxed">
            <span className="font-semibold text-primary-container">Demo tip:</span> Enter{" "}
            <span className="font-bold text-on-surface">9999999999</span> to see the existing customer experience — skips onboarding and loads a pre-built profile.
          </p>
        </div>

      </div>
    </main>
  );
}
