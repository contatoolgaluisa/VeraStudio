import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { useAdminFetch } from './api';
import type { AdminImage } from './types';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Conferência rápida no navegador, só para avisar antes de enviar. O backend confere de novo. */
export function imageFileProblem(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Envie uma imagem JPG, PNG ou WebP.';
  if (file.size > MAX_IMAGE_BYTES)
    return 'A imagem passa de 5 MB. Reduza o tamanho e tente de novo.';
  return null;
}

export interface UploadInput {
  file: File;
  alt: string;
  color: string | null;
}

/**
 * Envio de foto em três passos:
 * 1. a API (que confere se é ADMIN) devolve um link de envio de uso único;
 * 2. o navegador envia o arquivo direto para o Supabase Storage por esse link
 *    (o arquivo não passa pelo nosso servidor, e nenhuma chave vai para o navegador);
 * 3. a API confere o arquivo que chegou (tipo e tamanho) e o cadastra no produto.
 */
export function useUploadImage(productId: string) {
  const adminFetch = useAdminFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, alt, color }: UploadInput) => {
      const problem = imageFileProblem(file);
      if (problem) throw new ApiError(400, 'INVALID_IMAGE', problem);

      const { data: target } = await adminFetch<{ data: { path: string; uploadUrl: string } }>(
        `/products/${productId}/images/upload-url`,
        { method: 'POST', json: { contentType: file.type } },
      );

      let response: Response;
      try {
        response = await fetch(target.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
          body: file,
        });
      } catch {
        throw new ApiError(
          0,
          'UPLOAD_FAILED',
          'Não foi possível enviar a foto. Confira a conexão.',
        );
      }
      if (!response.ok) {
        throw new ApiError(
          response.status,
          'UPLOAD_FAILED',
          'O armazenamento recusou a foto. Confira o tipo e o tamanho do arquivo.',
        );
      }

      const { data } = await adminFetch<{ data: AdminImage }>(`/products/${productId}/images`, {
        method: 'POST',
        json: { path: target.path, alt, color },
      });
      return data;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog'] }),
      ]),
  });
}
