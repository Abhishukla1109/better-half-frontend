'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Cart } from '@/lib/shopify/types';
import { track } from '@/lib/mixpanel';
import { getStoredUTMs } from '@/lib/utm';

const CART_ID_KEY = 'bh_cart_id';

interface AddToCartMeta {
  product_name?: string;
  brand?: string;
  price?: number;
  concern?: string;
  source?: string;
}

interface CartContextValue {
  cart: Cart | null;
  cartReady: boolean;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity?: number, meta?: AddToCartMeta) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  checkout: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

async function cartApi(action: string, params: Record<string, unknown>): Promise<Cart | null> {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Cart ${action} failed (${res.status})`);
  }
  return res.json() as Promise<Cart | null>;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartReady, setCartReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Ref so addItem always sees the latest cart ID even inside loops,
  // without waiting for a React re-render to propagate state.
  const cartIdRef = useRef<string | null>(null);

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_ID_KEY);
    cartIdRef.current = null;
    setCart(null);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    // If returning after GoKwik checkout, clear cart immediately
    if (localStorage.getItem("bh_checkout_started")) {
      localStorage.removeItem("bh_checkout_started");
      clearCart();
      setCartReady(true);
      return;
    }
    const stored = localStorage.getItem(CART_ID_KEY);
    if (!stored) { setCartReady(true); return; }
    cartIdRef.current = stored;
    cartApi('get', { cartId: stored })
      .then(c => {
        if (c && c.totalQuantity > 0) {
          setCart(c);
        } else {
          // Cart null, expired, or emptied by order webhook — clear local state
          localStorage.removeItem(CART_ID_KEY);
          cartIdRef.current = null;
        }
      })
      .catch(() => { localStorage.removeItem(CART_ID_KEY); cartIdRef.current = null; })
      .finally(() => setCartReady(true));
  }, []);

  // Clear cart when GoKwik order is placed successfully.
  // GoKwik fires Order_Placed_GK via window.postMessage (their Web Pixels / custom
  // storefront integration doc). This is the direct, reliable signal — no polling needed.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; customData?: { tag?: string } };
      if (data?.type === "gokwik_events" && data?.customData?.tag === "Order_Placed_GK") {
        clearCart();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clearCart]);

  // Clear cart when user returns via back button after GoKwik checkout.
  // GoKwik creates orders via Admin API directly — it does NOT invalidate the
  // Shopify cart, so asking Shopify is useless. The flag + bfcache restore
  // (persisted=true) is reliable proof the user went through GoKwik and came
  // back — clear unconditionally.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      if (!localStorage.getItem("bh_checkout_started")) return;
      localStorage.removeItem("bh_checkout_started");
      clearCart();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [clearCart]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(async (variantId: string, quantity = 1, meta?: AddToCartMeta) => {
    setIsLoading(true);
    try {
      let updated: Cart | null;
      if (cartIdRef.current) {
        try {
          updated = await cartApi('add', { cartId: cartIdRef.current, variantId, quantity });
        } catch {
          // Cart may have expired — clear stale ID and create a fresh cart
          localStorage.removeItem(CART_ID_KEY);
          cartIdRef.current = null;
          updated = await cartApi('create', { variantId, quantity });
          if (updated) {
            cartIdRef.current = updated.id;
            localStorage.setItem(CART_ID_KEY, updated.id);
          }
        }
      } else {
        updated = await cartApi('create', { variantId, quantity });
        if (updated) {
          cartIdRef.current = updated.id;
          localStorage.setItem(CART_ID_KEY, updated.id);
        }
      }
      if (updated) {
        setCart(updated);
        const hasProtocol = !!localStorage.getItem("bh_protocol_picks");
        track("Add to Cart", {
          variant_id: variantId,
          product_name: meta?.product_name,
          brand: meta?.brand,
          price: meta?.price,
          concern: meta?.concern,
          source: meta?.source ?? "unknown",
          has_protocol: hasProtocol,
        });
        // Dispatch toast event so any listener can show confirmation
        window.dispatchEvent(new CustomEvent("bh-cart-added", {
          detail: { name: meta?.product_name ?? "Item" },
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // no cart dependency — reads cartIdRef synchronously instead

  const updateItem = useCallback(async (lineId: string, quantity: number) => {
    if (!cartIdRef.current) return;
    setIsLoading(true);
    try {
      const updated = await cartApi('update', { cartId: cartIdRef.current, lineId, quantity });
      if (updated) setCart(updated);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (lineId: string) => {
    if (!cartIdRef.current) return;
    setIsLoading(true);
    try {
      const updated = await cartApi('remove', { cartId: cartIdRef.current, lineId });
      if (updated) setCart(updated);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkout = useCallback(async () => {
    // Fix 5: use cartIdRef (updated synchronously by addItem) instead of cart state
    // so Buy Now works on a fresh session where cart state hasn't re-rendered yet
    const currentCartId = cartIdRef.current ?? localStorage.getItem(CART_ID_KEY);
    if (!currentCartId) return;
    if (!cartIdRef.current) cartIdRef.current = currentCartId;
    setIsLoading(true);

    // Always write source + cartId; add UTMs on top if present.
    // cartId lets the order webhook delete this Shopify cart after order creation,
    // so the next BetterHalf load sees a null cart and clears localStorage automatically.
    // Fetch existing cart attributes (may include UTMs Affluence wrote when creating the cart)
    // then merge with ours so nothing gets overwritten
    let existingAttrs: Array<{ key: string; value: string }> = [];
    try {
      const existingCart = await cartApi('get', { cartId: currentCartId });
      existingAttrs = (existingCart as unknown as { attributes?: Array<{ key: string; value: string }> })?.attributes ?? [];
    } catch {
      // non-fatal — proceed without existing attrs
    }

    const utms = getStoredUTMs();
    const affCartId = localStorage.getItem("bh_aff_cart_id");

    // Our attrs override existing ones where keys match; everything else from existing is preserved
    const ourAttrs: Record<string, string> = {
      source:  "betterhalf",
      cartId:  currentCartId,
      ...(affCartId ? { affCartId } : {}),
      ...(utms ? {
        utmSource:   utms.utmSource,
        utmMedium:   utms.utmMedium,
        utmCampaign: utms.utmCampaign,
        ref:         utms.ref,
        dmId:        utms.dmId,
        influencerId: utms.influencerId,
      } : {}),
    };

    const merged = new Map<string, string>();
    for (const a of existingAttrs) merged.set(a.key, a.value);   // existing first
    for (const [k, v] of Object.entries(ourAttrs)) if (v) merged.set(k, v); // ours override

    const allAttrs = Array.from(merged.entries()).map(([key, value]) => ({ key, value }));

    let written = false;
    for (let attempt = 0; attempt < 3 && !written; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 500));
        await cartApi('attributes', { cartId: currentCartId, attributes: allAttrs });
        written = true;
      } catch {
        console.warn(`[checkout] attribute write attempt ${attempt + 1} failed`);
      }
    }

    const hasProtocol = !!localStorage.getItem("bh_protocol_picks");
    track("Checkout Started", {
      item_count: cart?.totalQuantity ?? 0,
      cart_value: parseFloat(cart?.subtotal?.amount ?? "0"),
      has_protocol: hasProtocol,
    });
    const w = window as Window & {
      merchantInfo?: { mid: string; environment: string; type: string; storeId: number; cart?: { id: string } };
      triggerGokwikCustomCheckout?: () => void;
    };

    // GoKwik loads asynchronously — poll until it's ready (up to 15s)
    await new Promise<void>((resolve) => {
      if (w.triggerGokwikCustomCheckout) { resolve(); return; }
      const iv = setInterval(() => {
        if (w.triggerGokwikCustomCheckout) { clearInterval(iv); resolve(); }
      }, 150);
      setTimeout(() => { clearInterval(iv); resolve(); }, 15000);
    });

    if (w.triggerGokwikCustomCheckout && w.merchantInfo) {
      w.merchantInfo.cart = { id: currentCartId };
      localStorage.setItem("bh_checkout_started", "1");
      w.triggerGokwikCustomCheckout();
    } else if (cart?.checkoutUrl) {
      localStorage.setItem("bh_checkout_started", "1");
      window.location.href = cart.checkoutUrl;
    }
    setIsLoading(false);
  }, []); // uses cartIdRef synchronously — no cart state dependency needed

  return (
    <CartContext.Provider value={{
      cart,
      cartReady,
      isOpen,
      isLoading,
      openCart,
      closeCart,
      addItem,
      updateItem,
      removeItem,
      checkout,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
