'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import type { LocalProduct } from '@/lib/localProducts';

interface Props {
  product: LocalProduct;
}

export default function LocalProductForm({ product }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  async function handleAdd() {
    if (!product.available || state !== 'idle') return;
    setState('loading');
    // Visual demo — real cart add happens when Shopify variant IDs are available
    await new Promise(r => setTimeout(r, 500));
    setState('done');
    setTimeout(() => setState('idle'), 2500);
  }

  const total = product.price * quantity;

  if (!product.available) {
    return (
      <button disabled className="w-full py-4 rounded-xl bg-gray-200 text-gray-400 text-base font-bold cursor-not-allowed">
        Out of Stock
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity */}
      <div className="flex items-center gap-4">
        <p className="text-sm font-semibold text-on-dark">Qty</p>
        <div className="flex items-center border border-border-light rounded-xl overflow-hidden">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-brand hover:bg-surface-teal transition-colors"
            aria-label="Decrease"
          >
            <Minus size={14} />
          </button>
          <span className="w-10 text-center text-sm font-bold">{quantity}</span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            className="w-10 h-10 flex items-center justify-center text-brand hover:bg-surface-teal transition-colors"
            aria-label="Increase"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-sm text-gray-400">₹{product.price.toLocaleString('en-IN')} each</span>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all
          ${state === 'done'
            ? 'bg-green-600 text-white'
            : 'bg-brand text-white hover:bg-brand-hover active:scale-[0.98]'
          }`}
      >
        {state === 'done' ? <Check size={18} /> : <ShoppingBag size={18} />}
        {state === 'loading'
          ? 'Adding…'
          : state === 'done'
            ? 'Added to cart!'
            : `Add to Cart — ₹${total.toLocaleString('en-IN')}`}
      </button>
    </div>
  );
}
