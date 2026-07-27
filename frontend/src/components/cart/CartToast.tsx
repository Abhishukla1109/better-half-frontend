'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartToast() {
  const { openCart } = useCart();
  const [visible, setVisible] = useState(false);
  const [productName, setProductName] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent<{ name: string }>).detail?.name ?? 'Item';
      setProductName(name);
      setVisible(true);
      if (timer) clearTimeout(timer);
      setTimer(setTimeout(() => setVisible(false), 3000));
    };
    window.addEventListener('bh-cart-added', handler);
    return () => window.removeEventListener('bh-cart-added', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up">
      <div className="flex items-center gap-3 bg-on-dark text-white px-4 py-3 rounded-2xl shadow-xl max-w-[320px]">
        <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0">
          <ShoppingBag size={15} className="text-primary-container" />
        </div>
        <p className="text-sm font-semibold flex-1 leading-snug line-clamp-1">
          {productName} added to cart
        </p>
        <button
          onClick={() => { setVisible(false); openCart(); }}
          className="text-xs font-bold text-primary-container shrink-0 hover:opacity-80 transition-opacity"
        >
          View
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-white/40 hover:text-white/70 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
