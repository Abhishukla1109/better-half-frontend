"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Step = "email" | "sent";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Handle magic link redirect (Supabase puts session in URL hash on return)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
          checkProfileAndRedirect(session.user.id);
        }
      }
    );

    // Also catch an already-active session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkProfileAndRedirect(session.user.id);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkProfileAndRedirect(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("data")
      .eq("id", userId)
      .single();

    localStorage.setItem("bh_auth", JSON.stringify({ loggedIn: true }));

    if (data?.data && Object.keys(data.data).length > 0) {
      localStorage.setItem("bh_profile", JSON.stringify(data.data));
      router.replace("/home");
    } else {
      router.replace("/home");
    }
  }

  const handleSendLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep("sent");
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
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) handleSendLink(); }}
                className="w-full border border-outline-variant/30 rounded-xl px-4 py-3.5 bg-surface-container-lowest text-sm text-on-surface placeholder:text-on-surface-variant/35 outline-none focus:border-primary-container/50 transition-colors"
                autoFocus
              />
              {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}
            </div>

            <button
              onClick={handleSendLink}
              disabled={!email.trim() || loading}
              className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-primary-container text-white font-bold text-sm hover:bg-primary transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{loading ? "Sending…" : "Send sign-in link"}</span>
              <span className="text-lg leading-none">→</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setStep("email"); setError(""); }}
              className="flex items-center gap-1 text-[13px] text-on-surface-variant/60 hover:text-primary-container mb-6 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              Use a different email
            </button>

            {/* Envelope illustration */}
            <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-primary-container/10 mx-auto mb-8">
              <svg className="w-9 h-9 text-primary-container" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>

            <h1 className="text-[28px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] text-center leading-tight mb-3">
              Check your inbox
            </h1>
            <p className="text-sm text-on-surface-variant/70 text-center leading-relaxed mb-8">
              We sent a sign-in link to{" "}
              <span className="font-semibold text-on-surface">{email}</span>.
              Click it and you&apos;re in.
            </p>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 space-y-2">
              <p className="text-[12px] text-on-surface-variant/60 leading-relaxed">
                <span className="font-semibold text-on-surface-variant">Not seeing it?</span> Check your spam folder. The link expires in 60 minutes.
              </p>
            </div>

            <button
              onClick={handleSendLink}
              disabled={loading}
              className="w-full text-center text-[12px] text-on-surface-variant/50 hover:text-primary-container mt-5 py-2 cursor-pointer transition-colors disabled:opacity-40"
            >
              {loading ? "Sending…" : "Resend link"}
            </button>
          </>
        )}

        <p className="text-[10px] text-on-surface-variant/35 text-center mt-8">
          Free forever · No spam · Your data stays private
        </p>

      </div>
    </main>
  );
}
