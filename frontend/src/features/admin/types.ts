/** Formatos da API administrativa (/admin). Valores em centavos. */

export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};

export interface DashboardSummary {
  products: { total: number; published: number; draft: number; archived: number };
  stock: { threshold: number; lowStock: number; outOfStock: number };
  lowStockItems: {
    sku: string;
    color: string;
    size: string;
    stock: number;
    product: { id: string; name: string };
  }[];
  /** null até a Fase 6 (pedidos ainda não existem). */
  orders: null;
}

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  priceCents: number;
  compareAtPriceCents: number | null;
  isNew: boolean;
  updatedAt: string;
  category: { name: string };
  image: { url: string; alt: string } | null;
  variantCount: number;
  totalStock: number;
}

export interface AdminProductList {
  data: AdminProductRow[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface AdminVariant {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  isActive: boolean;
}

export interface AdminImage {
  id: string;
  url: string;
  alt: string;
  color: string | null;
  position: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  status: ProductStatus;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string };
  images: AdminImage[];
  variants: AdminVariant[];
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: { products: number };
}

export interface ProductInput {
  name: string;
  slug?: string;
  description: string;
  categoryId: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  isNew: boolean;
  status?: ProductStatus;
}

export interface VariantInput {
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  stock: number;
}

export interface VariantUpdate {
  isActive?: boolean;
  stockDelta?: number;
}

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  sortOrder?: number;
}
