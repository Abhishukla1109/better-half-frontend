'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { formatPrice } from '@/lib/shopify/api';
import AddToCartButton from './AddToCartButton';
import type { Product } from '@/lib/shopify/types';

interface Props {
  product: Product;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: Props) {
  const firstVariant = product.variants[0];
  const available = firstVariant?.availableForSale ?? false;

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-[#e2e8e8] flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#004f54]/10">
      {/* Image */}
      <Link href={`/product/${product.handle}`} className="relative block aspect-square bg-[#f7fafa] overflow-hidden">
        {product.onSale && (
          <span className="absolute top-2 left-2 z-10 text-[11px] font-700 bg-red-500 text-white px-2 py-0.5 rounded-md">
            {product.discountPct}% off
          </span>
        )}
        {product.featuredImage ? (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#d1d5db] text-4xl">
            💊
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {product.vendor && (
          <p className="text-[11px] font-700 text-[#004f54] uppercase tracking-wide">{product.vendor}</p>
        )}

        <Link
          href={`/product/${product.handle}`}
          className="text-sm font-600 text-[#1a2e2e] leading-snug line-clamp-2 hover:text-[#004f54] transition-colors"
        >
          {product.title}
        </Link>

        {/* Rating placeholder */}
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={11} className={i <= 4 ? 'fill-amber-400 text-amber-400' : 'text-[#d1d5db]'} />
          ))}
          <span className="text-[11px] text-[#9ca3af] ml-0.5">(4.0)</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-base font-800 text-[#004f54]">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <span className="text-sm text-[#9ca3af] line-through">{formatPrice(product.compareAtPrice)}</span>
          )}
        </div>

        {!compact && (
          <AddToCartButton
            variantId={firstVariant?.id ?? ''}
            available={available}
            className="w-full mt-1 py-2.5 text-sm"
          />
        )}
      </div>
    </div>
  );
}
