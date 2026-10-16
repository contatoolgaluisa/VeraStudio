import { Router } from 'express';
import type { PrismaClient } from '../../lib/prisma.js';
import { createCatalogController } from './catalog.controller.js';
import { createCatalogRepository } from './catalog.repository.js';
import { createCatalogService } from './catalog.service.js';

/**
 * Rotas públicas do catálogo (não exigem login). Montadas em /catalog.
 *
 * GET /catalog/categories        categorias com a contagem de produtos publicados
 * GET /catalog/products          listagem com busca, filtros, ordenação e paginação
 * GET /catalog/products/:slug    detalhes de um produto publicado
 * GET /catalog/filters           opções de filtro disponíveis (cores, tamanhos, preços)
 */
export function catalogRouter(prisma: PrismaClient): Router {
  const repository = createCatalogRepository(prisma);
  const service = createCatalogService(repository);
  const controller = createCatalogController(service);

  const router = Router();
  router.get('/categories', controller.listCategories);
  router.get('/products', controller.listProducts);
  router.get('/products/:slug', controller.getProduct);
  router.get('/filters', controller.getFilterOptions);
  return router;
}
