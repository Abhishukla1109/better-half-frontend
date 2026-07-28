"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";

type Stage = "loading" | "error";

export default function CheckoutPage() {
  const params        = useSearchParams();
  const { checkout }  = useCart();
  const [stage, setStage] = useState<Stage>("loading");
  const [errMsg, setErrMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const cartId      = params.get("cartId");
    const source      = params.get("source")       ?? "external";
    const utmSource   = params.get("utm_source")   ?? "";
    const utmMedium   = params.get("utm_medium")   ?? "";
    const utmCampaign = params.get("utm_campaign") ?? "";
    const ref         = params.get("ref")          ?? "";
    const dmId        = params.get("dmId")         ?? "";
    const influencerId = params.get("influencerId") ?? "";

    if (!cartId) {
      setErrMsg("No cart found. Please go back and try again.");
      setStage("error");
      return;
    }

    async function run() {
      try {
        // 1. Verify cart is valid on Shopify
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get", cartId }),
        });
        const cart = await res.json();
        if (!cart || !cart.id || (cart.totalQuantity ?? 0) === 0) {
          setErrMsg("This cart is no longer valid or has already been checked out.");
          setStage("error");
          return;
        }

        // 2. Write source + UTMs as cart attributes so our webhook reads them correctly
        const attributes = [
          { key: "source",       value: source },
          { key: "utmSource",    value: utmSource },
          { key: "utmMedium",    value: utmMedium },
          { key: "utmCampaign",  value: utmCampaign },
          { key: "ref",          value: ref },
          { key: "dmId",         value: dmId },
          { key: "influencerId", value: influencerId },
        ].filter(a => a.value);

        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "attributes", cartId, attributes }),
        });

        // 3. Store cartId so CartContext can trigger GoKwik
        localStorage.setItem("bh_cart_id", cartId!);

        // 4. Trigger GoKwik checkout
        checkout();

      } catch {
        setErrMsg("Something went wrong. Please go back and try again.");
        setStage("error");
      }
    }

    run();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (stage === "error") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-4xl">⚠️</span>
        <p className="text-title-sm font-bold text-on-surface">Something went wrong</p>
        <p className="text-body text-on-surface-variant">{errMsg}</p>
        <button
          onClick={() => history.back()}
          className="mt-2 px-6 py-3 rounded-full bg-primary text-white text-body font-semibold"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-5">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-body text-on-surface-variant">Preparing your checkout…</p>
    </div>
  );
}
