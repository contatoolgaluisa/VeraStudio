import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchFilterOptions, fetchProducts } from './api';
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
