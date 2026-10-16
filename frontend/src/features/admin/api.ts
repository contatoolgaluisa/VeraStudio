import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api';
import type {
  AdminCategory,
  AdminImage,
  AdminProduct,
  AdminProductList,
  CategoryInput,
  DashboardSummary,
  ProductInput,
  ProductStatus,
  VariantInput,
  VariantUpdate,
} from './types';

/**
 * Acesso à API administrativa. Toda chamada leva o token de login; quem
 * decide se a pessoa pode ou não fazer a operação é o backend (403 se não for ADMIN).
 */
export function useAdminFetch() {
  const { session } = useAuth();
  const token = session?.access_token;
  return useCallback(
    <T>(path: string, init: Parameters<typeof apiFetch>[1] = {}) =>
      apiFetch<T>(`/admin${path}`, { ...init, token }),
    [token],
  );
}

/**
 * Depois de qualquer alteração, descarta o cache do painel E o da loja:
 * assim a vitrine mostra o preço, a foto ou o estoque novo na hora.
 */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
    ]);
}

export function useDashboard() {
  const adminFetch = useAdminFetch();
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await adminFetch<{ data: DashboardSummary }>('/dashboard')).data,
  });
}

export interface AdminProductQuery {
  q?: string;
  status?: ProductStatus;
  page: number;
}

export function useAdminProducts(query: AdminProductQuery) {
  const adminFetch = useAdminFetch();
  return useQuery({
    queryKey: ['admin', 'products', query],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(query.page), pageSize: '20' });
      if (query.q) params.set('q', query.q);
      if (query.status) params.set('status', query.status);
      return adminFetch<AdminProductList>(`/products?${params}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string) {
  const adminFetch = useAdminFetch();
  return useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: async () => (await adminFetch<{ data: AdminProduct }>(`/products/${id}`)).data,
  });
}

export function useAdminCategories() {
  const adminFetch = useAdminFetch();
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => (await adminFetch<{ data: AdminCategory[] }>('/categories')).data,
  });
}

/** Mutação que, ao terminar, atualiza o cache do produto e invalida o resto. */
function useProductMutation<V>(request: (variables: V) => Promise<{ data: AdminProduct }>) {
  const queryClient = useQueryClient();
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (variables: V) => (await request(variables)).data,
    onSuccess: async (product) => {
      queryClient.setQueryData(['admin', 'product', product.id], product);
      await invalidateAll();
    },
  });
}

export function useCreateProduct() {
  const adminFetch = useAdminFetch();
  return useProductMutation((input: ProductInput) =>
    adminFetch('/products', { method: 'POST', json: input }),
  );
}

export function useUpdateProduct(id: string) {
  const adminFetch = useAdminFetch();
  return useProductMutation((input: Partial<ProductInput>) =>
    adminFetch(`/products/${id}`, { method: 'PATCH', json: input }),
  );
}

export function useAddVariant(productId: string) {
  const adminFetch = useAdminFetch();
  return useProductMutation((input: VariantInput) =>
    adminFetch(`/products/${productId}/variants`, { method: 'POST', json: input }),
  );
}

export function useUpdateVariant() {
  const adminFetch = useAdminFetch();
  return useProductMutation(({ id, ...input }: VariantUpdate & { id: string }) =>
    adminFetch(`/variants/${id}`, { method: 'PATCH', json: input }),
  );
}

/** Mutações simples (fotos e categorias): só invalidam o cache ao terminar. */
function useAdminMutation<V, R>(request: (variables: V) => Promise<R>) {
  const invalidateAll = useInvalidateAll();
  return useMutation({ mutationFn: request, onSuccess: () => invalidateAll() });
}

export function useUpdateImage() {
  const adminFetch = useAdminFetch();
  return useAdminMutation(
    ({ id, ...input }: { id: string; alt?: string; color?: string | null; position?: number }) =>
      adminFetch<{ data: AdminImage }>(`/images/${id}`, { method: 'PATCH', json: input }),
  );
}

/** Reordena as fotos: grava a nova posição só das que mudaram de lugar. */
export function useReorderImages() {
  const adminFetch = useAdminFetch();
  return useAdminMutation(async (images: AdminImage[]) => {
    const changed = images
      .map((image, position) => ({ image, position }))
      .filter(({ image, position }) => image.position !== position);
    for (const { image, position } of changed) {
      await adminFetch(`/images/${image.id}`, { method: 'PATCH', json: { position } });
    }
  });
}

export function useDeleteImage() {
  const adminFetch = useAdminFetch();
  return useAdminMutation((id: string) => adminFetch<null>(`/images/${id}`, { method: 'DELETE' }));
}

export function useCreateCategory() {
  const adminFetch = useAdminFetch();
  return useAdminMutation((input: CategoryInput) =>
    adminFetch<{ data: AdminCategory }>('/categories', { method: 'POST', json: input }),
  );
}

export function useUpdateCategory() {
  const adminFetch = useAdminFetch();
  return useAdminMutation(({ id, ...input }: CategoryInput & { id: string }) =>
    adminFetch<{ data: AdminCategory }>(`/categories/${id}`, { method: 'PATCH', json: input }),
  );
}

export function useDeleteCategory() {
  const adminFetch = useAdminFetch();
  return useAdminMutation((id: string) =>
    adminFetch<null>(`/categories/${id}`, { method: 'DELETE' }),
  );
}
