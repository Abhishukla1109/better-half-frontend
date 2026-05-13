'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartButton() {
  const { cart, openCart } = useCart();
  const count = cart?.totalQuantity ?? 0;

  return (
    <button
      onClick={openCart}
      aria-label={`Cart${count > 0 ? `, ${count} items` : ''}`}
      className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f0f5f5] transition-colors text-[#1a2e2e]"
    >
      <ShoppingBag size={20} />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#004f54] text-white text-[10px] font-700 rounded-full px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
