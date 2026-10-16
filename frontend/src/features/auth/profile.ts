import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from './auth-context';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  createdAt: string;
}

/**
 * Perfil do usuário logado, vindo da NOSSA API (GET /me). É dali que vem o
 * papel (CUSTOMER/ADMIN). O frontend usa o papel só para decidir o que
 * mostrar; quem bloqueia de verdade é o backend.
 */
export function useProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: async () => {
      const res = await apiFetch<{ data: Profile }>('/me', { token: session?.access_token });
      return res.data;
    },
    enabled: Boolean(session),
  });
}

export function useUpdateName() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch<{ data: Profile }>('/me', {
        method: 'PATCH',
        token: session?.access_token,
        json: { name },
      });
      return res.data;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['me', profile.id], profile);
    },
  });
}
