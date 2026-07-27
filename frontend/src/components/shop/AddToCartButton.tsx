'use client';

import { useState } from 'react';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface Props {
  variantId: string;
  available: boolean;
  className?: string;
  label?: string;
  productName?: string;
  brand?: string;
  price?: number;
  concern?: string;
  source?: string;
}

export default function AddToCartButton({
  variantId, available, className = '', label = 'Add to Cart',
  productName, brand, price, concern, source,
}: Props) {
  const { addItem, updateItem, removeItem, cart } = useCart();
  const [loading, setLoading] = useState(false);

  // Derive everything from cart state — single source of truth
  const lineItem = cart?.items.find(i => i.variantId === variantId);
  const qty = lineItem?.quantity ?? 0;
  const lineId = lineItem?.lineId ?? null;

  if (!available) {
    return (
      <button disabled className={`flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed ${className}`}>
        Sold Out
      </button>
    );
  }

  const handleAdd = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await addItem(variantId, 1, { product_name: productName, brand, price, concern, source });
    } finally {
      setLoading(false);
    }
  };

  const handleIncrease = async () => {
    if (loading || !lineId) return;
    setLoading(true);
    try {
      await updateItem(lineId, qty + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrease = async () => {
    if (loading || !lineId) return;
    setLoading(true);
    try {
      if (qty - 1 <= 0) {
        await removeItem(lineId);
      } else {
        await updateItem(lineId, qty - 1);
      }
    } finally {
      setLoading(false);
    }
  };

  // Not in cart — show Add to Cart
  if (qty === 0) {
    return (
      <button
        onClick={handleAdd}
        disabled={loading}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-70 ${className}`}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : label}
      </button>
    );
  }

  // In cart — show quantity stepper
  return (
    <div className={`flex items-center justify-between rounded-xl bg-brand text-white ${className}`}>
      <button
        onClick={handleDecrease}
        disabled={loading}
        className="w-10 h-10 flex items-center justify-center hover:bg-brand-hover active:bg-brand-active transition-colors disabled:opacity-50 rounded-l-xl"
        aria-label="Remove one"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="text-sm font-bold min-w-[20px] text-center">
        {loading ? <Loader2 size={13} className="animate-spin inline" /> : qty}
      </span>
      <button
        onClick={handleIncrease}
        disabled={loading}
        className="w-10 h-10 flex items-center justify-center hover:bg-brand-hover active:bg-brand-active transition-colors disabled:opacity-50 rounded-r-xl"
        aria-label="Add one more"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
