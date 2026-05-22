"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      // Real Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setReady(true); return; }

      // Demo / localStorage fallback
      try {
        if (localStorage.getItem("bh_auth")) { setReady(true); return; }
      } catch {}

      router.replace("/auth");
    }

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setReady(true);
      else if (event === "SIGNED_OUT") router.replace("/auth");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
