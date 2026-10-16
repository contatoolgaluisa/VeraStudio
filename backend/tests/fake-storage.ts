import type { ImageStorage, StoredObject } from '../src/integrations/image-storage.js';

/** Storage em memória para os testes: simula o Supabase Storage sem rede. */
export function createFakeStorage() {
  const objects = new Map<string, StoredObject>();
  const removed: string[] = [];

  const storage: ImageStorage = {
    async createUploadUrl(path) {
      return `https://storage.test/upload/${path}?token=teste`;
    },
    async inspect(path) {
      return objects.get(path) ?? null;
    },
    publicUrl(path) {
      return `https://storage.test/public/${path}`;
    },
    async remove(paths) {
      for (const path of paths) {
        objects.delete(path);
        removed.push(path);
      }
    },
  };

  return {
    storage,
    removed,
    /** Simula o navegador enviando um arquivo pelo link assinado. */
    upload(path: string, object: StoredObject) {
      objects.set(path, object);
    },
    reset() {
      objects.clear();
      removed.length = 0;
    },
  };
}
