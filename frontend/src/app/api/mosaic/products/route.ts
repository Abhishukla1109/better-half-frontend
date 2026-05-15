import { NextResponse } from 'next/server';
import type { MosaicProduct, BrandCode } from '@/lib/mosaic/types';

const BRANDS: BrandCode[] = ['MM', 'LJ', 'BW'];
const API_URL = process.env.MOSAIC_API_URL ?? 'http://stg.api.ourlittlejoys.com/static-service/all-products';
const COOKIE = process.env.MOSAIC_API_COOKIE ?? '';

interface RawProduct {
  product_id?: string;
  stampedId?: string;
  name: string;
  price?: number;
  discounted_price?: number;
  prod_img?: string | null;
  rating?: number | string;
  users_reviewed?: number | string;
  category?: string;
  slug?: string | null;
  url_key?: string;
  out_of_stock?: boolean;
  visibility?: boolean;
  key_ingredients?: string[];
  card_for_with?: { For: string; With: string };
  soDesc?: string;
}

function thumbUrl(url: string): string {
  return url.replace(/\?tr=w-\d+/, '?tr=w-400');
}

function normalizeCategory(raw: string | undefined): string {
  if (!raw) return 'other';
  return raw.toLowerCase().trim();
}

function normalize(p: RawProduct, brand: BrandCode): MosaicProduct {
  const price = p.price ?? 0;
  const dp = p.discounted_price;
  const discountedPrice = dp && dp > 0 && dp < price ? dp : price;
  return {
    id: `${brand}-${p.product_id ?? p.stampedId ?? p.url_key ?? p.name}`,
    name: p.name,
    price,
    discountedPrice,
    image: thumbUrl(p.prod_img!),
    rating: p.rating ? parseFloat(String(p.rating)) : 0,
    reviewCount: p.users_reviewed ? parseInt(String(p.users_reviewed)) : 0,
    category: normalizeCategory(p.category),
    brand,
    urlKey: p.slug ?? p.url_key ?? '',
    outOfStock: !!p.out_of_stock,
    keyIngredients: p.key_ingredients ?? [],
    forWith: p.card_for_with,
    soDesc: p.soDesc ?? '',
  };
}

async function fetchBrand(brand: BrandCode): Promise<MosaicProduct[]> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify({ urlKeys: [''], type: brand, forceFetch: true, identifier: '', brand }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const { data } = await res.json() as { data: Record<string, RawProduct> };
    return Object.values(data)
      .filter((p): p is RawProduct & { prod_img: string } => !!p.prod_img && p.visibility === true)
      .map(p => normalize(p, brand));
  } catch {
    return [];
  }
}

export async function GET() {
  const [mm, lj, bw] = await Promise.all(BRANDS.map(fetchBrand));
  return NextResponse.json([...mm, ...lj, ...bw]);
}
