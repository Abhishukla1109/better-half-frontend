'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/shopify/api';
import { track } from '@/lib/mixpanel';

export default function CartDrawer() {
  const { cart, isOpen, isLoading, closeCart, updateItem, removeItem, checkout } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Mount/unmount after animation to prevent iOS Safari horizontal overflow
  const [shouldRender, setShouldRender] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setShouldRender(true);
      // Fire Cart Viewed when drawer opens — tells us how many users reach this step
      track("Cart Viewed", {
        item_count: cart?.totalQuantity ?? 0,
        cart_value: parseFloat(cart?.subtotal?.amount ?? "0"),
      });
    } else {
      closeTimerRef.current = setTimeout(() => setShouldRender(false), 350);
    }
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, [isOpen, cart]);

  // Focus trap + close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflowY = 'hidden';
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflowY = '';
    };
  }, [isOpen, closeCart]);

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer — only in DOM while open or animating closed */}
      {shouldRender && (
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-50 flex flex-col
          shadow-2xl transition-transform duration-300 ease-out outline-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8e8]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#004f54]" />
            <h2 className="text-base font-700 text-[#004f54]">
              Your Cart {cart && cart.totalQuantity > 0 && (
                <span className="ml-1 text-sm text-[#6b7280]">({cart.totalQuantity})</span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#f0f5f5] text-[#6b7280] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
              <ShoppingBag size={64} className="text-[#d1d5db]" />
              <p className="text-[#6b7280] text-base">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="px-6 py-3 bg-[#004f54] text-white rounded-xl text-sm font-600 hover:bg-[#01696f] transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#f3f4f6] px-5">
              {cart.items.map(item => (
                <li key={item.lineId} className="py-4 flex gap-3">
                  {/* Image */}
                  <Link href={`/product/${item.productHandle}`} onClick={closeCart} className="flex-shrink-0">
                    <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#f7fafa] border border-[#e2e8e8]">
                      {item.image ? (
                        <Image
                          src={item.image.url}
                          alt={item.image.altText || item.productTitle}
                          width={72}
                          height={72}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag size={24} className="text-[#d1d5db]" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.productHandle}`}
                      onClick={closeCart}
                      className="text-sm font-600 text-[#1a2e2e] leading-snug line-clamp-2 hover:text-[#004f54] transition-colors"
                    >
                      {item.productTitle}
                    </Link>
                    {item.variantTitle !== 'Default Title' && (
                      <p className="text-xs text-[#6b7280] mt-0.5">{item.variantTitle}</p>
                    )}
                    <p className="text-sm font-700 text-[#004f54] mt-1">
                      {formatPrice(item.lineTotal)}
                    </p>

                    {/* Qty + Remove */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-[#e2e8e8] rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateItem(item.lineId, Math.max(0, item.quantity - 1))}
                          disabled={isLoading}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 flex items-center justify-center text-[#004f54] hover:bg-[#f0f5f5] transition-colors disabled:opacity-50"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-600">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.lineId, item.quantity + 1)}
                          disabled={isLoading}
                          aria-label="Increase quantity"
                          className="w-8 h-8 flex items-center justify-center text-[#004f54] hover:bg-[#f0f5f5] transition-colors disabled:opacity-50"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.lineId)}
                        disabled={isLoading}
                        aria-label="Remove item"
                        className="text-[#9ca3af] hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="border-t border-[#e2e8e8] px-5 py-5 space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280]">Subtotal</span>
              <span className="text-lg font-800 text-[#004f54]">
                {cart && formatPrice(cart.subtotal)}
              </span>
            </div>
            <p className="text-xs text-[#9ca3af]">Taxes & shipping calculated at checkout</p>

            {/* Checkout CTA */}
            <button
              onClick={checkout}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#004f54] text-white rounded-xl font-700 text-base hover:bg-[#01696f] transition-colors disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Checkout <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* AI note */}
            <div className="flex items-center gap-2 text-xs text-[#004f54] bg-[#f0f5f5] rounded-lg px-3 py-2">
              <span>🤖</span>
              <span>Personalized for your health profile by BetterHalf AI</span>
            </div>
          </div>
        )}
      </div>
      )}
    </>
  );
}
