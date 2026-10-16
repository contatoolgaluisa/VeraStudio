import type { ShippingRule } from '../../config/env.js';
import { ProductStatus } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { MAX_QUANTITY_PER_ITEM } from '../catalog/catalog.schemas.js';
import type { QuoteInput } from './cart.schemas.js';
import { computeTotals, type Totals } from './pricing.js';

/**
 * - OK: disponível na quantidade pedida.
 * - ADJUSTED: disponível, mas em quantidade menor (estoque ou limite por item).
 * - UNAVAILABLE: esgotada, desativada, produto fora da loja ou inexistente.
 */
export type LineStatus = 'OK' | 'ADJUSTED' | 'UNAVAILABLE';

export interface QuoteLine {
  variantId: string;
  status: LineStatus;
  requestedQuantity: number;
  /** Quantidade que vale (0 se indisponível). */
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

export interface Quote {
  items: QuoteLine[];
  summary: Totals;
}

/** Junta linhas repetidas da mesma variação (ex.: duas abas adicionando o mesmo item). */
function mergeItems(items: QuoteInput['items']) {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function createCartService(prisma: PrismaClient, shipping: ShippingRule) {
  return {
    async quote(input: QuoteInput): Promise<Quote> {
      const items = mergeItems(input.items);
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: items.map((item) => item.variantId) } },
        select: {
          id: true,
          sku: true,
          color: true,
          colorHex: true,
          size: true,
          stock: true,
          isActive: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              priceCents: true,
              compareAtPriceCents: true,
              images: {
                orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
                select: { url: true, alt: true, color: true },
              },
            },
          },
        },
      });
      const byId = new Map(variants.map((variant) => [variant.id, variant]));

      const lines = items.map(({ variantId, quantity: requested }): QuoteLine => {
        const variant = byId.get(variantId);
        if (!variant) {
          return {
            variantId,
            status: 'UNAVAILABLE',
            requestedQuantity: requested,
            quantity: 0,
            maxQuantity: 0,
            unitPriceCents: null,
            compareAtPriceCents: null,
            lineTotalCents: 0,
            product: null,
            variant: null,
          };
        }

        const { product } = variant;
        const onSale = product.status === ProductStatus.PUBLISHED && variant.isActive;
        const maxQuantity = onSale ? Math.min(variant.stock, MAX_QUANTITY_PER_ITEM) : 0;
        const quantity = Math.min(requested, maxQuantity);
        const status: LineStatus =
          maxQuantity === 0 ? 'UNAVAILABLE' : quantity < requested ? 'ADJUSTED' : 'OK';
        const image =
          product.images.find((img) => img.color === variant.color) ?? product.images[0] ?? null;

        return {
          variantId,
          status,
          requestedQuantity: requested,
          quantity,
          maxQuantity,
          unitPriceCents: product.priceCents,
          compareAtPriceCents: product.compareAtPriceCents,
          lineTotalCents: product.priceCents * quantity,
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            image: image && { url: image.url, alt: image.alt },
          },
          variant: {
            sku: variant.sku,
            color: variant.color,
            colorHex: variant.colorHex,
            size: variant.size,
          },
        };
      });

      const summary = computeTotals(
        lines
          .filter((line) => line.quantity > 0)
          .map((line) => ({
            unitPriceCents: line.unitPriceCents!,
            compareAtPriceCents: line.compareAtPriceCents,
            quantity: line.quantity,
          })),
        shipping,
      );

      return { items: lines, summary };
    },
  };
}
