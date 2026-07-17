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
    const stored = localStorage.getItem(CART_ID_KEY);
    if (!stored) { setCartReady(true); return; }
    cartIdRef.current = stored;
    cartApi('get', { cartId: stored })
      .then(c => {
        if (c) {
          setCart(c);
        } else {
          // Cart expired on Shopify — clear so next addItem creates a fresh one
          localStorage.removeItem(CART_ID_KEY);
          cartIdRef.current = null;
        }
      })
      .catch(() => { localStorage.removeItem(CART_ID_KEY); cartIdRef.current = null; })
      .finally(() => setCartReady(true));
  }, []);

  // Clear cart when GoKwik order is placed successfully (modal-based flow)
  useEffect(() => {
    const w = window as Window & {
      gokwikSdk?: { on: (event: string, cb: (data?: Record<string, unknown>) => void) => void };
    };

    const registerGkListener = () => {
      w.gokwikSdk?.on('modal_closed', (data) => {
        if (data && (data.order_id ?? data.orderId ?? data.gk_order_id)) {
          clearCart();
        }
      });
    };

    if (w.gokwikSdk) {
      registerGkListener();
    } else {
      window.addEventListener('gokwikLoaded', registerGkListener, { once: true });
      return () => window.removeEventListener('gokwikLoaded', registerGkListener);
    }
  }, [clearCart]);

  // Re-validate cart when user navigates back (browser back-forward cache restore).
  // GoKwik redirects to Shopify after order, so the app unloads. When the user
  // comes back via back button, the page is restored from bfcache with stale cart
  // state. Re-fetching from Shopify returns null for completed carts → clears it.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return; // normal load, already handled by mount effect
      const id = cartIdRef.current;
      if (!id) return;
      cartApi('get', { cartId: id }).then(c => {
        if (!c) clearCart();
        else setCart(c);
      }).catch(() => clearCart());
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
      }
      setIsOpen(true);
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
    if (!cart || !cartIdRef.current) return;
    setIsLoading(true);
    try {
      const utms = getStoredUTMs();
      if (utms) {
        await cartApi('attributes', {
          cartId: cartIdRef.current,
          attributes: [
            { key: "source",       value: "betterhalf" },
            { key: "utmSource",    value: utms.utmSource },
            { key: "utmMedium",    value: utms.utmMedium },
            { key: "utmCampaign",  value: utms.utmCampaign },
            { key: "ref",          value: utms.ref },
            { key: "dmId",         value: utms.dmId },
            { key: "influencerId", value: utms.influencerId },
          ],
        });
      }
    } catch { /* non-critical — proceed to checkout anyway */ }

    const hasProtocol = !!localStorage.getItem("bh_protocol_picks");
    track("Checkout Started", {
      item_count: cart.totalQuantity,
      cart_value: parseFloat(cart.subtotal?.amount ?? "0"),
      has_protocol: hasProtocol,
    });
    const w = window as Window & {
      merchantInfo?: { mid: string; environment: string; type: string; storeId: number; cart?: { id: string } };
      triggerGokwikCustomCheckout?: () => void;
    };
    if (w.triggerGokwikCustomCheckout && w.merchantInfo) {
      w.merchantInfo.cart = { id: cart.id };
      w.triggerGokwikCustomCheckout();
    } else if (cart.checkoutUrl) {
      window.location.href = cart.checkoutUrl;
    }
    setIsLoading(false);
  }, [cart]); // cart state is fine here — checkout is always user-triggered after a render

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
