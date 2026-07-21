"use client";

// "use client" tells Next.js this component runs in the browser, not the server.
// We need this because Mixpanel is browser-only.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initMixpanel, track } from "@/lib/mixpanel";
import { captureUTMs } from "@/lib/utm";

export default function MixpanelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Runs once when the app first loads — starts Mixpanel
  useEffect(() => {
    initMixpanel();
    captureUTMs();
  }, []);

  // Runs every time the URL changes — tracks which pages users visit
  useEffect(() => {
    const pageNames: Record<string, string> = {
      "/":          "Landing",
      "/home":      "Home",
      "/explore":   "Explore",
      "/protocol":  "Protocol",
      "/insights":  "Insights",
      "/ai":        "AI Companion",
      "/profile":   "Profile",
      "/auth":      "Auth",
    };

    const name = pathname.startsWith("/product/")
      ? "PDP"
      : (pageNames[pathname] ?? pathname);

    track("Page Viewed", { page: name, path: pathname });
  }, [pathname]);

  // This component doesn't render anything visible — it just wraps children
  return <>{children}</>;
}
