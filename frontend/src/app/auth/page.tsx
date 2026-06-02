"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Step = "email" | "code";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [digits, setDigits]   = useState(["", "", "", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]     = useState("");
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkProfileAndRedirect(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) checkProfileAndRedirect(session.user.id);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  async function checkProfileAndRedirect(userId: string) {
    const { data } = await supabase.from("profiles").select("data").eq("id", userId).single();
    localStorage.setItem("bh_auth", JSON.stringify({ loggedIn: true }));
    if (data?.data && Object.keys(data.data).length > 0) {
      localStorage.setItem("bh_profile", JSON.stringify(data.data));
    }
    router.replace("/home");
  }

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep("code");
      setDigits(["", "", "", "", "", "", "", ""]);
      setCountdown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    }
  };

  const handleVerify = async (token: string) => {
    if (token.length < 8 || verifying) return;
    setVerifying(true);
    setError("");

    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });

    if (err) {
      setVerifying(false);
      setError("That code didn't work. Check it and try again.");
      setDigits(["", "", "", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
    // On success the onAuthStateChange listener fires SIGNED_IN → redirect
  };

  const handleDigitChange = (index: number, value: string) => {
    // Support pasting a full 6-digit code into any box
    if (value.length > 1) {
      const clean = value.replace(/\D/g, "").slice(0, 8);
      const next = [...digits];
      clean.split("").forEach((d, i) => { if (i < 8) next[i] = d; });
      setDigits(next);
      const focusAt = Math.min(clean.length, 7);
      inputRefs.current[focusAt]?.focus();
      if (clean.length === 8) handleVerify(clean);
      return;
    }

    const digit = value.replace(/\D/g, "");
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
    if (digit && index === 7 && next.every(d => d)) {
      handleVerify(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <main className="w-full min-h-dvh flex flex-col items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container/15 mb-8 mx-auto">
          <Sparkles className="w-6 h-6 text-primary-container" strokeWidth={1.5} />
        </div>

        {step === "email" ? (
          <>
            <h1 className="text-[28px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] text-center leading-tight mb-2">
              Welcome to BetterHalf
            </h1>
            <p className="text-sm text-on-surface-variant/70 text-center leading-relaxed mb-10">
              Your personal health protocol, built by AI — free and instant.
            </p>

            <div className="mb-4">
              <p className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                Email address
              </p>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => { if (e.key === "Enter" && email.trim()) handleSendCode(); }}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3.5 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/35 outline-none focus:border-primary-container/50 transition-colors"
                autoFocus
              />
              {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
            </div>

            <button
              onClick={handleSendCode}
              disabled={!email.trim() || loading}
              className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{loading ? "Sending…" : "Send code"}</span>
              <span className="text-lg leading-none">→</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setStep("email"); setError(""); setDigits(["","","","","","","",""]); }}
              className="flex items-center gap-1 text-[13px] text-on-surface-variant/60 hover:text-primary-container mb-6 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              Use a different email
            </button>

            <h1 className="text-[28px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] text-center leading-tight mb-2">
              Enter your code
            </h1>
            <p className="text-sm text-on-surface-variant/70 text-center leading-relaxed mb-8">
              We sent an 8-digit code to{" "}
              <span className="font-semibold text-on-surface">{email}</span>
            </p>

            {/* 6-digit input boxes */}
            <div className="flex gap-2 justify-center mb-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  disabled={verifying}
                  className="w-11 h-14 text-center text-[22px] font-extrabold text-on-surface rounded-xl outline-none transition-all duration-150 bg-surface-container-lowest font-[family-name:var(--font-manrope)] border-2"
                  style={{
                    borderColor: d
                      ? "var(--color-primary-container)"
                      : "var(--color-outline-variant)",
                    boxShadow: d ? "0 0 0 3px var(--color-primary-fixed)" : "none",
                  }}
                />
              ))}
            </div>

            {error && <p className="text-[12px] text-red-500 text-center mt-3 mb-1">{error}</p>}

            <button
              onClick={() => handleVerify(digits.join(""))}
              disabled={digits.join("").length < 8 || verifying}
              className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-5 mb-4"
            >
              <span>{verifying ? "Verifying…" : "Confirm code"}</span>
              <span className="text-lg leading-none">→</span>
            </button>

            {/* Resend */}
            {countdown > 0 ? (
              <p className="text-center text-[12px] text-on-surface-variant/40">
                Resend code in {countdown}s
              </p>
            ) : (
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full text-center text-[12px] text-on-surface-variant/50 hover:text-primary-container py-2 cursor-pointer transition-colors disabled:opacity-40"
              >
                {loading ? "Sending…" : "Resend code"}
              </button>
            )}
          </>
        )}

        <p className="text-[10px] text-on-surface-variant/35 text-center mt-8">
          Free forever · No spam · Your data stays private
        </p>

      </div>
    </main>
  );
}
