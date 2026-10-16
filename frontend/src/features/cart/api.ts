import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { CartItem } from './store';

export type LineStatus = 'OK' | 'ADJUSTED' | 'UNAVAILABLE';

export interface QuoteLine {
  variantId: string;
  status: LineStatus;
  requestedQuantity: number;
  quantity: number;
  maxQuantity: number;
  unitPriceCents: number | null;
  compareAtPriceCents: number | null;
  lineTotalCents: number;
  product: {
    id: string;
    slug: string;
    name: string;
    image: { url: string; alt: string } | null;
  } | null;
  variant: { sku: string; color: string; colorHex: string; size: string } | null;
}

export interface CartQuote {
  items: QuoteLine[];
  summary: {
    itemCount: number;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    totalCents: number;
    freeShippingMinCents: number;
    freeShippingRemainingCents: number;
  };
}

/**
 * Pede ao servidor os valores reais do carrinho. Só variação e quantidade
 * são enviadas; preço e disponibilidade vêm do banco.
 */
export function useCartQuote(items: CartItem[]) {
  const payload = items.map(({ variantId, quantity }) => ({ variantId, quantity }));
  return useQuery({
    // O cache do catálogo é invalidado pelo painel; o do carrinho também
    // começa com 'catalog' para ser invalidado junto.
    queryKey: ['catalog', 'cart-quote', payload],
    queryFn: async () =>
      (
        await apiFetch<{ data: CartQuote }>('/cart/quote', {
          method: 'POST',
          json: { items: payload },
        })
      ).data,
    enabled: payload.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}
