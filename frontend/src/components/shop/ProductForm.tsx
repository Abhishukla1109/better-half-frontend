'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import AddToCartButton from './AddToCartButton';
import { formatPrice } from '@/lib/shopify/api';
import type { Product, ShopifyProductVariant } from '@/lib/shopify/types';

interface Props {
  product: Product;
}

export default function ProductForm({ product }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ShopifyProductVariant>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);

  const hasMultipleVariants = product.variants.length > 1 && !product.variants.every(v => v.title === 'Default Title');

  // Group options
  const options = product.variants[0]?.selectedOptions?.map(o => o.name) ?? [];

  function selectOption(optionName: string, value: string) {
    const currentSelections: Record<string, string> = {};
    selectedVariant.selectedOptions.forEach(o => {
      currentSelections[o.name] = o.value;
    });
    currentSelections[optionName] = value;

    const match = product.variants.find(v =>
      v.selectedOptions.every(o => currentSelections[o.name] === o.value)
    );
    if (match) setSelectedVariant(match);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Variant selectors */}
      {hasMultipleVariants && options.map(optionName => {
        const values = [...new Set(product.variants.map(v =>
          v.selectedOptions.find(o => o.name === optionName)?.value
        ).filter(Boolean))] as string[];

        return (
          <div key={optionName}>
            <p className="text-sm font-600 text-[#1a2e2e] mb-2">
              {optionName}: <span className="font-400 text-[#6b7280]">{selectedVariant.selectedOptions.find(o => o.name === optionName)?.value}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map(val => {
                const isSelected = selectedVariant.selectedOptions.find(o => o.name === optionName)?.value === val;
                return (
                  <button
                    key={val}
                    onClick={() => selectOption(optionName, val)}
                    className={`px-4 py-2 rounded-xl text-sm font-600 border transition-all ${
                      isSelected
                        ? 'border-[#004f54] bg-[#004f54] text-white'
                        : 'border-[#e2e8e8] text-[#374151] hover:border-[#004f54]'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quantity */}
      <div className="flex items-center gap-4">
        <p className="text-sm font-600 text-[#1a2e2e]">Qty</p>
        <div className="flex items-center border border-[#e2e8e8] rounded-xl overflow-hidden">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[#004f54] hover:bg-[#f0f5f5] transition-colors"
            aria-label="Decrease"
          >
            <Minus size={14} />
          </button>
          <span className="w-10 text-center text-sm font-700">{quantity}</span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            className="w-10 h-10 flex items-center justify-center text-[#004f54] hover:bg-[#f0f5f5] transition-colors"
            aria-label="Increase"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-sm text-[#9ca3af]">{formatPrice(selectedVariant.price)} each</span>
      </div>

      {/* Add to cart */}
      <AddToCartButton
        variantId={selectedVariant.id}
        available={selectedVariant.availableForSale}
        className="w-full"
        label={`Add to Cart — ${formatPrice({ amount: String(parseFloat(selectedVariant.price.amount) * quantity), currencyCode: selectedVariant.price.currencyCode })}`}
      />
    </div>
  );
}
