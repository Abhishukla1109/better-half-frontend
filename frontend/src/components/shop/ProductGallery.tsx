'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ShopifyImage } from '@/lib/shopify/types';

interface Props {
  featuredImage: ShopifyImage | null;
  images: ShopifyImage[];
  title: string;
}

export default function ProductGallery({ featuredImage, images, title }: Props) {
  const allImages = images.length > 0 ? images : featuredImage ? [featuredImage] : [];
  const [active, setActive] = useState(0);

  if (allImages.length === 0) {
    return (
      <div className="aspect-square bg-surface-teal rounded-2xl flex items-center justify-center text-6xl">
        💊
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-teal">
        <Image
          src={allImages[active].url}
          alt={allImages[active].altText || title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                active === i ? 'border-brand' : 'border-transparent hover:border-[#c8e0e0]'
              }`}
            >
              <Image
                src={img.url}
                alt={img.altText || `${title} ${i + 1}`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
