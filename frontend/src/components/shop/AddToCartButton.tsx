'use client';

import { useState } from 'react';
import { ShoppingBag, Check, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface Props {
  variantId: string;
  available: boolean;
  className?: string;
  label?: string;
}

export default function AddToCartButton({ variantId, available, className = '', label = 'Add to Cart' }: Props) {
  const { addItem } = useCart();
  const [state, setState] = useState<'idle' | 'loading' | 'added'>('idle');

  async function handleClick() {
    if (!available || state !== 'idle') return;
    setState('loading');
    try {
      await addItem(variantId);
      setState('added');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('idle');
    }
  }

  if (!available) {
    return (
      <button disabled className={`flex items-center justify-center gap-2 py-4 rounded-xl font-700 text-base bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed ${className}`}>
        Sold Out
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'idle'}
      className={`flex items-center justify-center gap-2 py-4 rounded-xl font-700 text-base transition-all
        ${state === 'added'
          ? 'bg-green-600 text-white'
          : 'bg-[#004f54] text-white hover:bg-[#01696f] active:scale-[0.98]'}
        disabled:opacity-80
        ${className}`}
    >
      {state === 'loading' && <Loader2 size={18} className="animate-spin" />}
      {state === 'added' && <Check size={18} />}
      {state === 'idle' && <ShoppingBag size={18} />}
      {state === 'loading' ? 'Adding…' : state === 'added' ? 'Added!' : label}
    </button>
  );
}
