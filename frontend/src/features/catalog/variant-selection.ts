import type { ProductDetail, ProductVariant } from './types';

/**
 * Regras de seleção de cor e tamanho na página do produto.
 *
 * Ficam separadas do componente para poderem ser testadas sem tela.
 * Lembrete: o que a tela permite é só conveniência. Na Fase 6, o backend
 * valida de novo estoque e preço antes de criar o pedido.
 */

export type SizeStatus = 'available' | 'soldout' | 'nonexistent';

export function findVariant(
  product: ProductDetail,
  color: string | undefined,
  size: string | undefined,
): ProductVariant | undefined {
  if (!color || !size) return undefined;
  return product.variants.find((v) => v.color === color && v.size === size);
}

/** Situação de cada tamanho na cor escolhida. */
export function sizeStatus(product: ProductDetail, color: string, size: string): SizeStatus {
  const variant = findVariant(product, color, size);
  if (!variant) return 'nonexistent';
  return variant.available ? 'available' : 'soldout';
}

/** A cor ainda tem algum tamanho disponível? */
export function colorHasStock(product: ProductDetail, color: string): boolean {
  return product.variants.some((v) => v.color === color && v.available);
}

/**
 * Cor inicial: a pedida na URL, se existir no produto; senão, a primeira com estoque;
 * senão, a primeira da lista.
 */
export function initialColor(product: ProductDetail, requested: string | null): string | undefined {
  if (requested && product.colors.some((c) => c.name === requested)) return requested;
  return product.colors.find((c) => colorHasStock(product, c.name))?.name ?? product.colors[0]?.name;
}

/** Com tamanho único, ele já vem selecionado. */
export function initialSize(product: ProductDetail): string | undefined {
  return product.sizes.length === 1 ? product.sizes[0] : undefined;
}
