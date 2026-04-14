"use client";

import Link from "next/link";
import { useState } from "react";

export default function AuthPage() {
  const [phone, setPhone] = useState("");

  return (
    <main className="w-full min-h-dvh flex flex-col bg-surface overflow-hidden max-w-[430px] mx-auto lg:my-12 lg:min-h-0 lg:rounded-2xl lg:shadow-xl lg:border lg:border-outline-variant/10">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-6 py-4 bg-surface">
        <Link
          href="/"
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-primary">
            arrow_back
          </span>
        </Link>
        <div className="flex-1" />
      </header>

      {/* Content */}
      <section className="flex-1 px-8 pt-12 pb-8 flex flex-col">
        {/* Hero illustration */}
        <div className="mb-10 w-24 h-24 bg-primary-fixed rounded-3xl flex items-center justify-center relative">
          <span className="material-symbols-outlined text-on-primary-fixed text-4xl">
            shield_person
          </span>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
            <span
              className="material-symbols-outlined text-tertiary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
          </div>
        </div>

        {/* Headlines */}
        <div className="space-y-4 mb-12">
          <h1 className="text-[32px] font-[800] leading-tight tracking-tight text-primary font-[family-name:var(--font-manrope)]">
            Let&apos;s get you started.
          </h1>
          <p className="text-base text-on-surface-variant leading-relaxed max-w-[280px]">
            Enter your phone number to continue.
          </p>
        </div>

        {/* Input group */}
        <div className="space-y-6">
          <div className="group">
            <label
              className="block text-[12px] font-semibold uppercase tracking-widest text-on-surface-variant mb-2 px-1"
              htmlFor="phone"
            >
              Phone Number
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-xl p-1 focus-within:bg-surface-container-lowest transition-all duration-300">
              <div className="flex items-center gap-2 px-4 py-3 border-r border-outline-variant/20">
                <span className="text-on-surface font-semibold text-lg">
                  +91
                </span>
              </div>
              <input
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium px-4 placeholder:text-outline-variant/60 outline-none"
                id="phone"
                placeholder="00000 00000"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="h-0.5 w-0 group-focus-within:w-full bg-primary transition-all duration-500 rounded-full mt-1" />
          </div>

          {/* Primary CTA */}
          <Link
            href="/onboarding/identity"
            className="w-full bg-primary text-on-primary font-semibold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
          >
            <span>Send OTP</span>
            <span className="material-symbols-outlined text-[20px]">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="my-10 flex items-center gap-4">
          <div className="flex-1 h-[1px] bg-outline-variant/20" />
          <span className="text-[12px] font-medium uppercase tracking-widest text-outline-variant">
            or
          </span>
          <div className="flex-1 h-[1px] bg-outline-variant/20" />
        </div>

        {/* Social auth */}
        <button className="w-full bg-surface-container-lowest border border-outline-variant/10 text-on-surface font-semibold py-4 rounded-xl flex items-center justify-center gap-3 shadow-sm hover:bg-surface-container-low transition-all duration-200">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Footer */}
        <div className="mt-auto pt-12 text-center">
          <p className="text-[13px] text-on-surface-variant/70 px-4 leading-relaxed">
            By continuing, you agree to our{" "}
            <a className="text-primary font-semibold hover:underline" href="#">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="text-primary font-semibold hover:underline" href="#">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </section>

      {/* Decorative blurs */}
      <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-primary-fixed/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-tertiary-fixed/10 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />
    </main>
  );
}
