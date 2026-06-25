"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function isBrowsePath(pathname: string) {
  return ["/home", "/explore", "/product/"].some(
    (p) => pathname === p || pathname.startsWith(p)
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      if (isBrowsePath(window.location.pathname)) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;

      try { if (localStorage.getItem("bh_auth")) return; } catch {}

      router.replace("/auth");
    }

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) return;
      if (event === "SIGNED_OUT" && !isBrowsePath(window.location.pathname)) router.replace("/auth");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return <>{children}</>;
}
