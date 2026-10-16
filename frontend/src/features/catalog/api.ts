import { apiFetch } from '@/lib/api';
import type { Category, FilterOptions, ProductList, ProductQuery } from './types';

/** Monta a query string só com os parâmetros preenchidos. */
export function toSearchParams(query: ProductQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}

export function fetchProducts(query: ProductQuery): Promise<ProductList> {
  const params = toSearchParams(query).toString();
  return apiFetch<ProductList>(`/catalog/products${params ? `?${params}` : ''}`);
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch<{ data: Category[] }>('/catalog/categories');
  return res.data;
}

export async function fetchFilterOptions(category?: string): Promise<FilterOptions> {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await apiFetch<{ data: FilterOptions }>(`/catalog/filters${params}`);
  return res.data;
}
