export type BrandCode = 'MM' | 'LJ' | 'BW';

export interface MosaicProduct {
  id: string;
  name: string;
  price: number;
  discountedPrice: number;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  brand: BrandCode;
  urlKey: string;
  outOfStock: boolean;
  keyIngredients: string[];
  forWith?: { For: string; With: string };
  soDesc: string;
}
