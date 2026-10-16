import type { ShippingRule } from '../../config/env.js';

/**
 * Cálculo dos valores do carrinho (e, na Fase 6B, do pedido).
 * Função pura: recebe as linhas já conferidas no banco e devolve os totais.
 * Tudo em centavos inteiros, sem números decimais.
 */

export interface PricedLine {
  unitPriceCents: number;
  /** Preço "de", quando o produto está em promoção. */
  compareAtPriceCents: number | null;
  quantity: number;
}

export interface Totals {
  itemCount: number;
  /** Soma pelos preços originais (o preço "de", quando existe). */
  subtotalCents: number;
  /** Quanto as promoções descontam do subtotal. */
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingMinCents: number;
  /** Quanto falta para o frete grátis (0 se já atingiu). */
  freeShippingRemainingCents: number;
}

export function computeTotals(lines: PricedLine[], shipping: ShippingRule): Totals {
  let itemCount = 0;
  let subtotalCents = 0;
  let discountCents = 0;

  for (const line of lines) {
    const original = Math.max(line.compareAtPriceCents ?? 0, line.unitPriceCents);
    itemCount += line.quantity;
    subtotalCents += original * line.quantity;
    discountCents += (original - line.unitPriceCents) * line.quantity;
  }

  const merchandiseCents = subtotalCents - discountCents;
  const freeShipping = merchandiseCents >= shipping.freeMinCents;
  // Carrinho vazio não paga frete.
  const shippingCents = itemCount === 0 || freeShipping ? 0 : shipping.flatCents;

  return {
    itemCount,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: merchandiseCents + shippingCents,
    freeShippingMinCents: shipping.freeMinCents,
    freeShippingRemainingCents: freeShipping ? 0 : shipping.freeMinCents - merchandiseCents,
  };
}
