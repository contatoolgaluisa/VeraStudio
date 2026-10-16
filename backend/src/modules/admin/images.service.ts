import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import {
  ALLOWED_IMAGE_TYPES,
  type ImageStorage,
  MAX_IMAGE_BYTES,
} from '../../integrations/image-storage.js';
import { AppError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import type { createImageSchema, updateImageSchema, uploadUrlSchema } from './admin.schemas.js';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Pasta de cada produto no Storage. O caminho é sempre escolhido pelo servidor. */
function folderFor(productId: string) {
  return `products/${productId}/`;
}

export function createAdminImagesService(prisma: PrismaClient, storage: ImageStorage) {
  async function assertProduct(productId: string) {
    const exists = await prisma.product.count({ where: { id: productId } });
    if (!exists) throw AppError.notFound('Produto não encontrado');
  }

  return {
    async createUploadUrl(productId: string, input: z.infer<typeof uploadUrlSchema>) {
      await assertProduct(productId);
      const path = `${folderFor(productId)}${randomUUID()}.${EXTENSIONS[input.contentType]}`;
      return { path, uploadUrl: await storage.createUploadUrl(path) };
    },

    async register(productId: string, input: z.infer<typeof createImageSchema>) {
      await assertProduct(productId);

      // O caminho precisa ser da pasta deste produto (não aceita "../" nem caminhos de outro produto).
      const expectedPrefix = folderFor(productId);
      if (!input.path.startsWith(expectedPrefix) || input.path.includes('..')) {
        throw new AppError(400, 'INVALID_PATH', 'Caminho de imagem inválido para este produto.');
      }

      // Confere o arquivo que REALMENTE foi enviado, não o que o navegador disse.
      const stored = await storage.inspect(input.path);
      if (!stored) {
        throw new AppError(400, 'IMAGE_NOT_FOUND', 'A foto não foi encontrada. Envie novamente.');
      }
      const typeOk = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(
        stored.contentType.split(';')[0]?.trim() ?? '',
      );
      if (!typeOk || stored.size > MAX_IMAGE_BYTES || stored.size === 0) {
        await storage.remove([input.path]);
        throw new AppError(
          400,
          'INVALID_IMAGE',
          'Arquivo recusado: envie uma imagem JPG, PNG ou WebP de até 5 MB.',
        );
      }

      const last = await prisma.productImage.aggregate({
        where: { productId },
        _max: { position: true },
      });
      return prisma.productImage.create({
        data: {
          productId,
          url: storage.publicUrl(input.path),
          storagePath: input.path,
          alt: input.alt,
          color: input.color ?? null,
          position: (last._max.position ?? -1) + 1,
        },
        select: { id: true, url: true, alt: true, color: true, position: true },
      });
    },

    update(imageId: string, input: z.infer<typeof updateImageSchema>) {
      return prisma.productImage.update({
        where: { id: imageId },
        data: input,
        select: { id: true, url: true, alt: true, color: true, position: true },
      });
    },

    async remove(imageId: string) {
      const image = await prisma.productImage.delete({
        where: { id: imageId },
        select: { storagePath: true },
      });
      // Fotos do seed (Unsplash) não têm arquivo no nosso Storage.
      if (image.storagePath) await storage.remove([image.storagePath]);
    },
  };
}
