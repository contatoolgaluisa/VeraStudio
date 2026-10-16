import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminFetch } from '@/features/admin/api';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api';
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  Paged,
} from './types';

function useToken() {
  return useAuth().session?.access_token;
}

/** Depois de criar ou cancelar: pedidos, estoque da loja e painel mudaram. */
function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
    ]);
}

export function useCreateOrder() {
  const token = useToken();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (input: {
      items: { variantId: string; quantity: number }[];
      idempotencyKey: string;
    }) =>
      (await apiFetch<{ data: OrderDetail }>('/orders', { method: 'POST', token, json: input }))
        .data,
    onSuccess: () => invalidate(),
  });
}

export function useMyOrders(page: number) {
  const token = useToken();
  return useQuery({
    queryKey: ['orders', 'mine', page],
    queryFn: () => apiFetch<Paged<OrderSummary>>(`/orders?page=${page}`, { token }),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useMyOrder(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['orders', 'mine', 'detail', id],
    queryFn: async () => (await apiFetch<{ data: OrderDetail }>(`/orders/${id}`, { token })).data,
    enabled: Boolean(token),
  });
}

export function useCancelMyOrder(id: string) {
  const token = useToken();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async () =>
      (await apiFetch<{ data: OrderDetail }>(`/orders/${id}/cancel`, { method: 'POST', token }))
        .data,
    onSuccess: () => invalidate(),
  });
}

export interface AdminOrderQuery {
  q?: string;
  status?: OrderStatus;
  page: number;
}

export function useAdminOrders(query: AdminOrderQuery) {
  const adminFetch = useAdminFetch();
  return useQuery({
    queryKey: ['admin', 'orders', query],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(query.page) });
      if (query.q) params.set('q', query.q);
      if (query.status) params.set('status', query.status);
      return adminFetch<Paged<AdminOrderSummary>>(`/orders?${params}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(id: string) {
  const adminFetch = useAdminFetch();
  return useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: async () => (await adminFetch<{ data: AdminOrderDetail }>(`/orders/${id}`)).data,
  });
}

export function useUpdateOrderStatus(id: string) {
  const adminFetch = useAdminFetch();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: async (input: { status: OrderStatus; note: string | null }) =>
      (
        await adminFetch<{ data: AdminOrderDetail }>(`/orders/${id}/status`, {
          method: 'POST',
          json: input,
        })
      ).data,
    onSuccess: async (order) => {
      queryClient.setQueryData(['admin', 'order', id], order);
      await invalidate();
    },
  });
}
