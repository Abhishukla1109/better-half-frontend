"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";

type Stage = "loading" | "error";

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-5">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-body text-on-surface-variant">Preparing your checkout…</p>
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const params        = useSearchParams();
  const { checkout }  = useCart();
  const [stage, setStage] = useState<Stage>("loading");
  const [errMsg, setErrMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const cartId = params.get("cartId");

    if (!cartId) {
      setErrMsg("No cart found. Please go back and try again.");
      setStage("error");
      return;
    }

    function run() {
      // Store cartId so CartContext can pick it up immediately
      localStorage.setItem("bh_cart_id", cartId!);
      localStorage.setItem("bh_aff_cart_id", cartId!);

      // checkout() fetches the cart internally (to read Affluence attrs before merging ours)
      // so validation happens there — no separate verify call needed
      checkout((msg) => {
        setErrMsg(msg);
        setStage("error");
      });
    }

    run();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (stage === "error") {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-4xl">⚠️</span>
        <p className="text-title-sm font-bold text-on-surface">Something went wrong</p>
        <p className="text-body text-on-surface-variant">{errMsg}</p>
        <a
          href="https://shop.myaffluence.app"
          className="mt-2 px-6 py-3 rounded-full bg-primary text-white text-body font-semibold"
        >
          Back to Affluence
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-5">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-body text-on-surface-variant">Preparing your checkout…</p>
      <a
        href="https://shop.myaffluence.app"
        className="text-body text-on-surface-variant underline underline-offset-2"
      >
        ← Back to Affluence
      </a>
    </div>
  );
}
