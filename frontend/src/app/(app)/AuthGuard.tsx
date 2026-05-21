"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const auth = localStorage.getItem("bh_auth");
      if (!auth) {
        router.replace("/auth");
        return;
      }
    } catch {}
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
