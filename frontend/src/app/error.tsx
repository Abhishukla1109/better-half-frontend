"use client";

// This page shows automatically when any unhandled error occurs anywhere in the app.
// Next.js catches the crash and renders this instead of a blank white screen.
// "use client" is required by Next.js for error boundaries.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev — in production you'd send to Sentry here
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
        <span className="text-3xl">⚠️</span>
      </div>
      <h1 className="text-[20px] font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2">
        Something went wrong
      </h1>
      <p className="text-[14px] text-on-surface-variant/70 leading-relaxed mb-8 max-w-xs">
        We hit an unexpected error. This has been noted and we&apos;re on it. Try again or go back home.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={reset}
          className="w-full py-3 rounded-2xl bg-primary-container text-white text-[14px] font-bold cursor-pointer active:scale-[0.98] transition-transform"
        >
          Try again
        </button>
        <button
          onClick={() => router.push("/home")}
          className="w-full py-3 rounded-2xl bg-surface-container text-on-surface text-[14px] font-semibold cursor-pointer active:scale-[0.98] transition-transform"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
