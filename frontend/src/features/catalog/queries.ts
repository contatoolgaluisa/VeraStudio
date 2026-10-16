import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { fetchCategories, fetchFilterOptions, fetchProduct, fetchProducts } from './api';
import type { ProductQuery } from './types';

/**
 * Hooks de dados do catálogo (TanStack Query).
 *
 * A `queryKey` identifica cada consulta no cache: voltar para uma página já
 * visitada mostra o resultado na hora, sem nova espera.
 */

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: ['catalog', 'products', query],
    queryFn: () => fetchProducts(query),
    // Ao trocar de filtro ou página, mantém a lista anterior na tela enquanto
    // a nova carrega, em vez de piscar um estado vazio.
    placeholderData: keepPreviousData,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['catalog', 'product', slug],
    queryFn: () => fetchProduct(slug),
    // 404 é uma resposta definitiva: não adianta tentar de novo.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
}

export function useFilterOptions(category?: string) {
  return useQuery({
    queryKey: ['catalog', 'filters', category ?? null],
    queryFn: () => fetchFilterOptions(category),
    staleTime: 5 * 60_000,
  });
}
