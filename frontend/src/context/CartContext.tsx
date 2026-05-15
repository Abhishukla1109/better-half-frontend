'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  useEffect(() => {
    const stored = localStorage.getItem(CART_ID_KEY);
    if (!stored) return;
    cartApi('get', { cartId: stored })
      .then(c => { if (c) setCart(c); })
      .catch(() => localStorage.removeItem(CART_ID_KEY));
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    setIsLoading(true);
    try {
      let updated: Cart | null;
      if (cart?.id) {
        updated = await cartApi('add', { cartId: cart.id, variantId, quantity });
      } else {
        updated = await cartApi('create', { variantId, quantity });
        if (updated) localStorage.setItem(CART_ID_KEY, updated.id);
      }
      if (updated) setCart(updated);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const updateItem = useCallback(async (lineId: string, quantity: number) => {
    if (!cart) return;
    setIsLoading(true);
    try {
      const updated = await cartApi('update', { cartId: cart.id, lineId, quantity });
      if (updated) setCart(updated);
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const removeItem = useCallback(async (lineId: string) => {
    if (!cart) return;
    setIsLoading(true);
    try {
      const updated = await cartApi('remove', { cartId: cart.id, lineId });
      if (updated) setCart(updated);
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const checkout = useCallback(() => {
    if (cart?.checkoutUrl) {
      window.location.href = cart.checkoutUrl;
    }
  }, [cart]);

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
