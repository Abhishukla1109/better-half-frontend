'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createCart, addToCart, updateCartLine, removeCartLine, getCart } from '@/lib/shopify/api';
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Restore cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_ID_KEY);
    if (stored) {
      getCart(stored)
        .then(c => { if (c) setCart(c); })
        .catch(() => localStorage.removeItem(CART_ID_KEY));
    }
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(async (variantId: string, quantity = 1) => {
    setIsLoading(true);
    try {
      let updated: Cart;
      if (cart?.id) {
        updated = await addToCart(cart.id, variantId, quantity);
      } else {
        updated = await createCart(variantId, quantity);
        localStorage.setItem(CART_ID_KEY, updated.id);
      }
      setCart(updated);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const updateItem = useCallback(async (lineId: string, quantity: number) => {
    if (!cart) return;
    setIsLoading(true);
    try {
      const updated = await updateCartLine(cart.id, lineId, quantity);
      setCart(updated);
    } finally {
      setIsLoading(false);
    }
  }, [cart]);

  const removeItem = useCallback(async (lineId: string) => {
    if (!cart) return;
    setIsLoading(true);
    try {
      const updated = await removeCartLine(cart.id, lineId);
      setCart(updated);
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
