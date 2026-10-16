/**
 * Formatos devolvidos pela API do catálogo (ver docs/api.md).
 * Valores monetários sempre em centavos.
 */

export interface ColorOption {
  name: string;
  hex: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  category: { slug: string; name: string };
  priceCents: number;
  compareAtPriceCents: number | null;
  isOnSale: boolean;
  discountPercent: number | null;
  isNew: boolean;
  image: { url: string; alt: string } | null;
  colors: ColorOption[];
  sizes: string[];
  inStock: boolean;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductList {
  data: ProductSummary[];
  meta: PageMeta;
}

export interface FilterOptions {
  colors: ColorOption[];
  sizes: string[];
  priceRange: { minCents: number; maxCents: number } | null;
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc';

/** Parâmetros aceitos por GET /catalog/products. */
export interface ProductQuery {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  onSale?: boolean;
  isNew?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}
