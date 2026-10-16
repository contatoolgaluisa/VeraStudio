import { type RequestHandler, Router } from 'express';
import { Role } from '../../generated/prisma/client.js';
import type { ImageStorage } from '../../integrations/image-storage.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { requireRole } from '../auth/auth.middleware.js';
import {
  categorySchema,
  createImageSchema,
  createProductSchema,
  createVariantSchema,
  idParamsSchema,
  listAdminOrdersSchema,
  listAdminProductsSchema,
  updateCategorySchema,
  updateImageSchema,
  updateOrderStatusSchema,
  updateProductSchema,
  updateVariantSchema,
  uploadUrlSchema,
} from './admin.schemas.js';
import { createAdminCategoriesService } from './categories.service.js';
import { createDashboardService } from './dashboard.service.js';
import { createAdminImagesService } from './images.service.js';
import { createAdminOrdersService } from './orders.service.js';
import { createAdminProductsService } from './products.service.js';

/**
 * Rotas do painel administrativo, montadas em /admin.
 *
 * TODAS passam por requireAuth + requireRole(ADMIN) antes de qualquer outra
 * coisa: um cliente logado recebe 403, um visitante recebe 401.
 */
export function adminRouter(options: {
  prisma: PrismaClient;
  requireAuth: RequestHandler;
  storage: ImageStorage;
}): Router {
  const { prisma, storage } = options;
  const products = createAdminProductsService(prisma);
  const categories = createAdminCategoriesService(prisma);
  const images = createAdminImagesService(prisma, storage);
  const dashboard = createDashboardService(prisma);
  const orders = createAdminOrdersService(prisma);

  const router = Router();
  router.use(options.requireAuth, requireRole(Role.ADMIN));

  // Dashboard
  router.get('/dashboard', async (_req, res) => {
    res.json({ data: await dashboard.summary() });
  });

  // Produtos
  router.get('/products', async (req, res) => {
    res.json(await products.list(listAdminProductsSchema.parse(req.query)));
  });
  router.post('/products', async (req, res) => {
    res.status(201).json({ data: await products.create(createProductSchema.parse(req.body)) });
  });
  router.get('/products/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.json({ data: await products.getProduct(id) });
  });
  router.patch('/products/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.json({ data: await products.update(id, updateProductSchema.parse(req.body)) });
  });

  // Variações e estoque
  router.post('/products/:id/variants', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const product = await products.addVariant(id, createVariantSchema.parse(req.body));
    res.status(201).json({ data: product });
  });
  router.patch('/variants/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.json({ data: await products.updateVariant(id, updateVariantSchema.parse(req.body)) });
  });

  // Fotos
  router.post('/products/:id/images/upload-url', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.json({ data: await images.createUploadUrl(id, uploadUrlSchema.parse(req.body)) });
  });
  router.post('/products/:id/images', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.status(201).json({ data: await images.register(id, createImageSchema.parse(req.body)) });
  });
  router.patch('/images/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.json({ data: await images.update(id, updateImageSchema.parse(req.body)) });
  });
  router.delete('/images/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    await images.remove(id);
    res.status(204).end();
  });

  // Pedidos
  router.get('/orders', async (req, res) => {
    res.json(await orders.list(listAdminOrdersSchema.parse(req.query)));
  });
  router.get('/orders/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.json({ data: await orders.getOrder(id) });
  });
  router.post('/orders/:id/status', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const { status, note } = updateOrderStatusSchema.parse(req.body);
    res.json({ data: await orders.updateStatus(id, req.user!.id, status, note) });
  });

  // Categorias
  router.get('/categories', async (_req, res) => {
    res.json({ data: await categories.list() });
  });
  router.post('/categories', async (req, res) => {
    res.status(201).json({ data: await categories.create(categorySchema.parse(req.body)) });
  });
  router.patch('/categories/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    res.json({ data: await categories.update(id, updateCategorySchema.parse(req.body)) });
  });
  router.delete('/categories/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    await categories.remove(id);
    res.status(204).end();
  });

  return router;
}
