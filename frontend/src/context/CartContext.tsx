'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Cart } from '@/lib/shopify/types';

const CART_ID_KEY = 'bh_cart_id';

interface CartContextValue {
  cart: Cart | null;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  checkout: () => void;
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
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Ref so addItem always sees the latest cart ID even inside loops,
  // without waiting for a React re-render to propagate state.
  const cartIdRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CART_ID_KEY);
    if (!stored) return;
    cartIdRef.current = stored;
    cartApi('get', { cartId: stored })
      .then(c => { if (c) setCart(c); })
      .catch(() => { localStorage.removeItem(CART_ID_KEY); cartIdRef.current = null; });
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    setIsLoading(true);
    try {
      let updated: Cart | null;
      if (cartIdRef.current) {
        updated = await cartApi('add', { cartId: cartIdRef.current, variantId, quantity });
      } else {
        updated = await cartApi('create', { variantId, quantity });
        if (updated) {
          cartIdRef.current = updated.id;
          localStorage.setItem(CART_ID_KEY, updated.id);
        }
      }
      if (updated) setCart(updated);
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

  const checkout = useCallback(() => {
    if (cart?.checkoutUrl) {
      window.location.href = cart.checkoutUrl;
    }
  }, [cart]); // cart state is fine here — checkout is always user-triggered after a render

  return (
    <CartContext.Provider value={{
      cart,
      isOpen,
      isLoading,
      openCart,
      closeCart,
      addItem,
      updateItem,
      removeItem,
      checkout,
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
