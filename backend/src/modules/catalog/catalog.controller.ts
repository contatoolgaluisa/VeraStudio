import type { Request, Response } from 'express';
import {
  filterOptionsQuerySchema,
  listProductsQuerySchema,
  productSlugParamsSchema,
} from './catalog.schemas.js';
import type { CatalogService } from './catalog.service.js';

/**
 * Controllers: leem e validam a requisição, chamam o serviço e respondem.
 * Se a validação falhar, o Zod lança um erro que o tratador central
 * transforma em 400 VALIDATION_ERROR.
 */
export function createCatalogController(service: CatalogService) {
  return {
    async listCategories(_req: Request, res: Response) {
      res.json({ data: await service.listCategories() });
    },

    async listProducts(req: Request, res: Response) {
      const query = listProductsQuerySchema.parse(req.query);
      res.json(await service.listProducts(query));
    },

    async getProduct(req: Request, res: Response) {
      const { slug } = productSlugParamsSchema.parse(req.params);
      res.json({ data: await service.getProduct(slug) });
    },

    async getFilterOptions(req: Request, res: Response) {
      const { category } = filterOptionsQuerySchema.parse(req.query);
      res.json({ data: await service.getFilterOptions(category) });
    },
  };
}
