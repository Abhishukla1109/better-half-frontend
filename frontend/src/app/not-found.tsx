// Shows when someone visits a URL that doesn't exist — e.g. /product/fake-slug
// Next.js renders this automatically for any 404.

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh bg-surface flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
        <span className="text-3xl">🔍</span>
      </div>
      <h1 className="text-xl font-extrabold text-on-surface font-[family-name:var(--font-manrope)] mb-2">
        Page not found
      </h1>
      <p className="text-sm text-on-surface-variant/70 leading-relaxed mb-8 max-w-xs">
        This page doesn&apos;t exist or may have moved. Let&apos;s get you back on track.
      </p>
      <Link
        href="/home"
        className="w-full max-w-xs py-3 rounded-2xl bg-primary-container text-white text-sm font-bold text-center block active:scale-[0.98] transition-transform"
      >
        Go home
      </Link>
    </div>
  );
}
