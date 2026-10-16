import { AppError } from '../../lib/errors.js';
import type {
  CatalogRepository,
  ProductDetailRow,
  ProductSummaryRow,
} from './catalog.repository.js';
import { type ListProductsQuery, MAX_QUANTITY_PER_ITEM } from './catalog.schemas.js';
import { sortSizes } from './sizes.js';

/**
 * Regras de negócio do catálogo público e conversão do formato do banco
 * para o formato da API (DTO).
 *
 * Por que não devolver direto o que vem do banco? Para controlar exatamente o
 * que sai da API. Ex.: a quantidade exata em estoque NÃO é exposta; a loja
 * recebe só "disponível" e a quantidade máxima que pode ser comprada.
 */

export interface ColorOption {
  name: string;
  hex: string;
}

export interface ProductSummaryDto {
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

export interface VariantDto {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  available: boolean;
  /** Quanto o cliente pode colocar no carrinho (limitado ao estoque). */
  maxQuantity: number;
}

export interface ProductDetailDto extends Omit<ProductSummaryDto, 'image'> {
  description: string;
  images: { id: string; url: string; alt: string; color: string | null }[];
  variants: VariantDto[];
}

function discountPercent(priceCents: number, compareAtPriceCents: number | null): number | null {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtPriceCents) * 100);
}

/** Cores sem repetição, em ordem alfabética. */
function uniqueColors(variants: { color: string; colorHex: string }[]): ColorOption[] {
  const byName = new Map<string, string>();
  for (const variant of variants) {
    if (!byName.has(variant.color)) byName.set(variant.color, variant.colorHex);
  }
  return [...byName.entries()]
    .map(([name, hex]) => ({ name, hex }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function pricing(row: { priceCents: number; compareAtPriceCents: number | null }) {
  const discount = discountPercent(row.priceCents, row.compareAtPriceCents);
  return {
    priceCents: row.priceCents,
    compareAtPriceCents: discount === null ? null : row.compareAtPriceCents,
    isOnSale: discount !== null,
    discountPercent: discount,
  };
}

export function toProductSummary(row: ProductSummaryRow): ProductSummaryDto {
  const [firstImage] = row.images;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    ...pricing(row),
    isNew: row.isNew,
    image: firstImage ?? null,
    colors: uniqueColors(row.variants),
    sizes: sortSizes(row.variants.map((v) => v.size)),
    inStock: row.variants.some((v) => v.stock > 0),
  };
}

export function toProductDetail(row: ProductDetailRow): ProductDetailDto {
  const colors = uniqueColors(row.variants);
  const sizes = sortSizes(row.variants.map((v) => v.size));
  const colorRank = new Map(colors.map((c, i) => [c.name, i]));
  const sizeRank = new Map(sizes.map((s, i) => [s, i]));

  const variants = row.variants
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      available: v.stock > 0,
      maxQuantity: Math.min(v.stock, MAX_QUANTITY_PER_ITEM),
    }))
    .sort(
      (a, b) =>
        (colorRank.get(a.color) ?? 0) - (colorRank.get(b.color) ?? 0) ||
        (sizeRank.get(a.size) ?? 0) - (sizeRank.get(b.size) ?? 0),
    );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    ...pricing(row),
    isNew: row.isNew,
    images: row.images,
    colors,
    sizes,
    variants,
    inStock: variants.some((v) => v.available),
  };
}

export function createCatalogService(repository: CatalogRepository) {
  return {
    async listCategories() {
      const rows = await repository.listCategories();
      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        productCount: row._count.products,
      }));
    },

    async listProducts(query: ListProductsQuery) {
      const { total, rows } = await repository.listProducts(query);
      return {
        data: rows.map(toProductSummary),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },

    async getProduct(slug: string): Promise<ProductDetailDto> {
      const row = await repository.findPublishedBySlug(slug);
      if (!row) throw AppError.notFound('Produto não encontrado');
      return toProductDetail(row);
    },

    async getFilterOptions(categorySlug?: string) {
      const { variants, minPriceCents, maxPriceCents } =
        await repository.getFilterOptions(categorySlug);
      return {
        colors: uniqueColors(variants),
        sizes: sortSizes(variants.map((v) => v.size)),
        priceRange:
          minPriceCents === null || maxPriceCents === null
            ? null
            : { minCents: minPriceCents, maxCents: maxPriceCents },
      };
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
