import { AppError } from '../lib/errors.js';

/**
 * Armazenamento das fotos de produtos (Supabase Storage).
 *
 * Fluxo de envio, sem o arquivo passar pelo nosso servidor:
 * 1. o backend (já tendo conferido que é ADMIN) cria um link de envio
 *    temporário, para UM arquivo, num caminho escolhido pelo servidor;
 * 2. o navegador envia a foto direto para o Storage por esse link;
 * 3. o backend confere tipo e tamanho do arquivo enviado e só então o
 *    cadastra no produto.
 *
 * É uma interface para os testes poderem usar um armazenamento em memória.
 */
export interface StoredObject {
  contentType: string;
  size: number;
}

export interface ImageStorage {
  /** Link (URL completa) para enviar um arquivo com PUT, válido por poucos minutos. */
  createUploadUrl(path: string): Promise<string>;
  /** Tipo e tamanho do arquivo enviado, ou null se ele não existir. */
  inspect(path: string): Promise<StoredObject | null>;
  publicUrl(path: string): string;
  remove(paths: string[]): Promise<void>;
}

export const IMAGE_BUCKET = 'product-images';
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Implementação real, usando a API REST do Storage. A secret key vai só no
 * cabeçalho `apikey` (recomendação do Supabase) e nunca sai do servidor.
 */
export function createSupabaseImageStorage(options: {
  supabaseUrl: string;
  secretKey: string;
}): ImageStorage {
  const base = `${options.supabaseUrl}/storage/v1`;
  const headers = { apikey: options.secretKey, 'Content-Type': 'application/json' };
  const publicUrl = (path: string) => `${base}/object/public/${IMAGE_BUCKET}/${path}`;

  async function failIfNotOk(response: Response, action: string) {
    if (response.ok) return;
    // O detalhe vai para o log do servidor (pelo tratador de erros), nunca para o cliente.
    throw new Error(`Storage: falha ao ${action} (HTTP ${response.status})`);
  }

  return {
    async createUploadUrl(path) {
      const response = await fetch(`${base}/object/upload/sign/${IMAGE_BUCKET}/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      await failIfNotOk(response, 'criar o link de envio');
      const { url } = (await response.json()) as { url: string };
      return `${base}${url}`;
    },

    async inspect(path) {
      const response = await fetch(publicUrl(path), { method: 'HEAD' });
      if (response.status === 404 || response.status === 400) return null;
      await failIfNotOk(response, 'consultar o arquivo');
      return {
        contentType: response.headers.get('content-type') ?? '',
        size: Number(response.headers.get('content-length') ?? 0),
      };
    },

    publicUrl,

    async remove(paths) {
      if (paths.length === 0) return;
      const response = await fetch(`${base}/object/${IMAGE_BUCKET}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ prefixes: paths }),
      });
      await failIfNotOk(response, 'apagar arquivos');
    },
  };
}

/**
 * Usada quando SUPABASE_SECRET_KEY não está configurada: o painel continua
 * funcionando, mas o envio de fotos responde com um aviso claro (503).
 */
export function createUnconfiguredImageStorage(): ImageStorage {
  const fail = async (): Promise<never> => {
    throw new AppError(
      503,
      'STORAGE_NOT_CONFIGURED',
      'Envio de fotos pendente de configuração: defina SUPABASE_SECRET_KEY no backend.',
    );
  };
  return {
    createUploadUrl: fail,
    inspect: fail,
    publicUrl: (path) => path,
    remove: async () => {},
  };
}
