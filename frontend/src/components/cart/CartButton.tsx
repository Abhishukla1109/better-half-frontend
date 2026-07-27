'use client';

import { useCart } from '@/context/CartContext';

export default function CartButton() {
  const { cart, openCart } = useCart();
  const count = cart?.totalQuantity ?? 0;

  return (
    <button
      onClick={openCart}
      aria-label={`Cart${count > 0 ? `, ${count} items` : ''}`}
      className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors cursor-pointer"
    >
      <span className="text-xl leading-none">🛒</span>
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-brand text-white text-2xs font-bold rounded-full px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
