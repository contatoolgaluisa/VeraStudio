import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ProductStatus, Role } from '../src/generated/prisma/client.js';
import { createUnconfiguredImageStorage } from '../src/integrations/image-storage.js';
import { signToken } from './auth-helpers.js';
import {
  buildTestApp,
  fakeStorage,
  resetCatalog,
  resetUsers,
  testPrisma,
} from './helpers.js';

const app = buildTestApp();

const admin = { sub: '0192f1a0-0000-7000-8000-00000000000a', email: 'admin@exemplo.com' };
const customer = { sub: '0192f1a0-0000-7000-8000-00000000000c', email: 'cliente@exemplo.com' };
let adminAuth = '';
let customerAuth = '';
let categoryId = '';

beforeEach(async () => {
  await resetCatalog();
  await resetUsers();
  fakeStorage.reset();
  await testPrisma.userProfile.createMany({
    data: [
      { id: admin.sub, email: admin.email, role: Role.ADMIN },
      { id: customer.sub, email: customer.email, role: Role.CUSTOMER },
    ],
  });
  adminAuth = `Bearer ${await signToken(admin)}`;
  customerAuth = `Bearer ${await signToken(customer)}`;
  const category = await testPrisma.category.create({
    data: { name: 'Feminino', slug: 'feminino' },
  });
  categoryId = category.id;
});

afterAll(async () => {
  await resetCatalog();
  await resetUsers();
  await testPrisma.$disconnect();
});

const productInput = () => ({
  name: 'Blusa Ômega Canelada',
  description: 'Blusa de teste com descrição suficiente.',
  categoryId,
  priceCents: 19900,
});

async function createProduct(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/admin/products')
    .set('Authorization', adminAuth)
    .send({ ...productInput(), ...overrides });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; slug: string };
}

async function addVariant(productId: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post(`/admin/products/${productId}/variants`)
    .set('Authorization', adminAuth)
    .send({ color: 'Preto', colorHex: '#151515', size: 'M', sku: 'VS-T-PRE-M', stock: 4, ...overrides });
}

describe('permissões: toda rota /admin exige ADMIN', () => {
  const someId = '0192f1a0-0000-7000-8000-0000000000ff';
  const routes: [string, string][] = [
    ['get', '/admin/dashboard'],
    ['get', '/admin/products'],
    ['post', '/admin/products'],
    ['get', `/admin/products/${someId}`],
    ['patch', `/admin/products/${someId}`],
    ['post', `/admin/products/${someId}/variants`],
    ['patch', `/admin/variants/${someId}`],
    ['post', `/admin/products/${someId}/images/upload-url`],
    ['post', `/admin/products/${someId}/images`],
    ['patch', `/admin/images/${someId}`],
    ['delete', `/admin/images/${someId}`],
    ['get', '/admin/categories'],
    ['post', '/admin/categories'],
    ['patch', `/admin/categories/${someId}`],
    ['delete', `/admin/categories/${someId}`],
  ];

  it.each(routes)('%s %s: 401 sem login e 403 para cliente', async (method, path) => {
    const call = (auth?: string) => {
      const req = (request(app) as unknown as Record<string, (p: string) => request.Test>)[
        method
      ]!(path);
      return auth ? req.set('Authorization', auth) : req;
    };

    expect((await call()).status).toBe(401);
    const forbidden = await call(customerAuth);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });
});

describe('dashboard', () => {
  it('calcula os indicadores a partir do banco e não inventa pedidos', async () => {
    const published = await testPrisma.product.create({
      data: { ...productInput(), slug: 'publicado', status: ProductStatus.PUBLISHED },
    });
    const archived = await testPrisma.product.create({
      data: { ...productInput(), slug: 'arquivado', status: ProductStatus.ARCHIVED },
    });
    await testPrisma.product.create({ data: { ...productInput(), slug: 'rascunho' } });
    await testPrisma.productVariant.createMany({
      data: [
        { productId: published.id, sku: 'A-1', color: 'Preto', colorHex: '#000000', size: 'P', stock: 0 },
        { productId: published.id, sku: 'A-2', color: 'Preto', colorHex: '#000000', size: 'M', stock: 3 },
        { productId: published.id, sku: 'A-3', color: 'Preto', colorHex: '#000000', size: 'G', stock: 9 },
        // Não contam: variação inativa e produto arquivado
        { productId: published.id, sku: 'A-4', color: 'Azul', colorHex: '#0000FF', size: 'P', stock: 0, isActive: false },
        { productId: archived.id, sku: 'B-1', color: 'Preto', colorHex: '#000000', size: 'P', stock: 1 },
      ],
    });

    const res = await request(app).get('/admin/dashboard').set('Authorization', adminAuth);

    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual({ total: 3, published: 1, draft: 1, archived: 1 });
    expect(res.body.data.stock).toEqual({ threshold: 3, lowStock: 2, outOfStock: 1 });
    expect(res.body.data.lowStockItems.map((i: { sku: string }) => i.sku)).toEqual(['A-1', 'A-2']);
    expect(res.body.data.orders).toBeNull();
  });
});

describe('produtos', () => {
  it('cria como rascunho e gera o endereço a partir do nome, sem acentos', async () => {
    const product = await createProduct();

    expect(product).toMatchObject({ slug: 'blusa-omega-canelada', status: 'DRAFT' });
  });

  it('não deixa criar um produto já publicado, sem variações', async () => {
    const res = await request(app)
      .post('/admin/products')
      .set('Authorization', adminAuth)
      .send({ ...productInput(), status: 'PUBLISHED' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CANNOT_PUBLISH');
  });

  it('recusa endereço repetido, categoria inexistente e preço "de" menor que o preço', async () => {
    await createProduct();
    const duplicate = await request(app)
      .post('/admin/products')
      .set('Authorization', adminAuth)
      .send(productInput());
    expect(duplicate.status).toBe(409);

    const badCategory = await request(app)
      .post('/admin/products')
      .set('Authorization', adminAuth)
      .send({ ...productInput(), slug: 'outro', categoryId: '0192f1a0-0000-7000-8000-0000000000ee' });
    expect(badCategory.status).toBe(422);

    const badPrice = await request(app)
      .post('/admin/products')
      .set('Authorization', adminAuth)
      .send({ ...productInput(), slug: 'outro', compareAtPriceCents: 10000 });
    expect(badPrice.status).toBe(400);
  });

  it('recusa campos desconhecidos no corpo', async () => {
    const res = await request(app)
      .post('/admin/products')
      .set('Authorization', adminAuth)
      .send({ ...productInput(), id: 'escolhido-pelo-cliente' });

    expect(res.status).toBe(400);
  });

  it('só publica com ao menos uma variação ativa, e aí aparece na loja', async () => {
    const product = await createProduct();

    const tooEarly = await request(app)
      .patch(`/admin/products/${product.id}`)
      .set('Authorization', adminAuth)
      .send({ status: 'PUBLISHED' });
    expect(tooEarly.status).toBe(422);

    expect((await addVariant(product.id)).status).toBe(201);
    const published = await request(app)
      .patch(`/admin/products/${product.id}`)
      .set('Authorization', adminAuth)
      .send({ status: 'PUBLISHED', compareAtPriceCents: 24900 });
    expect(published.status).toBe(200);

    const store = await request(app).get(`/catalog/products/${product.slug}`);
    expect(store.status).toBe(200);
    expect(store.body.data).toMatchObject({ priceCents: 19900, compareAtPriceCents: 24900 });
  });

  it('confere o preço "de" contra o preço já salvo ao editar só um dos dois', async () => {
    const product = await createProduct();

    const res = await request(app)
      .patch(`/admin/products/${product.id}`)
      .set('Authorization', adminAuth)
      .send({ compareAtPriceCents: 15000 });

    expect(res.status).toBe(422);
  });

  it('lista com busca por nome e por SKU', async () => {
    const product = await createProduct();
    await addVariant(product.id);
    await createProduct({ name: 'Calça Teste Larga', slug: 'calca-teste-larga' });

    const byName = await request(app).get('/admin/products?q=calça').set('Authorization', adminAuth);
    const bySku = await request(app).get('/admin/products?q=vs-t-pre').set('Authorization', adminAuth);

    expect(byName.body.data.map((p: { slug: string }) => p.slug)).toEqual(['calca-teste-larga']);
    expect(bySku.body.data).toHaveLength(1);
    expect(bySku.body.data[0]).toMatchObject({ variantCount: 1, totalStock: 4 });
  });
});

describe('variações e estoque', () => {
  it('impede duas variações com a mesma cor e tamanho, ou o mesmo SKU', async () => {
    const product = await createProduct();
    await addVariant(product.id);

    expect((await addVariant(product.id, { sku: 'OUTRO-SKU' })).status).toBe(409);
    expect((await addVariant(product.id, { size: 'G' })).status).toBe(409);
  });

  it('ajusta o estoque de forma relativa e nunca deixa negativo', async () => {
    const product = await createProduct();
    const created = await addVariant(product.id);
    const variantId = created.body.data.variants[0].id as string;

    const plus = await request(app)
      .patch(`/admin/variants/${variantId}`)
      .set('Authorization', adminAuth)
      .send({ stockDelta: 5 });
    expect(plus.body.data.variants[0].stock).toBe(9);

    const tooMuch = await request(app)
      .patch(`/admin/variants/${variantId}`)
      .set('Authorization', adminAuth)
      .send({ stockDelta: -10 });
    expect(tooMuch.status).toBe(409);
    expect(tooMuch.body.error.code).toBe('INSUFFICIENT_STOCK');

    const variant = await testPrisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(9);
  });

  it('dois ajustes ao mesmo tempo não deixam o estoque negativo', async () => {
    const product = await createProduct();
    const created = await addVariant(product.id, { stock: 4 });
    const variantId = created.body.data.variants[0].id as string;

    const results = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .patch(`/admin/variants/${variantId}`)
          .set('Authorization', adminAuth)
          .send({ stockDelta: -3 }),
      ),
    );

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const variant = await testPrisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.stock).toBe(1);
  });

  it('não deixa desativar a última variação ativa de um produto publicado', async () => {
    const product = await createProduct();
    const created = await addVariant(product.id);
    const variantId = created.body.data.variants[0].id as string;
    await request(app)
      .patch(`/admin/products/${product.id}`)
      .set('Authorization', adminAuth)
      .send({ status: 'PUBLISHED' });

    const res = await request(app)
      .patch(`/admin/variants/${variantId}`)
      .set('Authorization', adminAuth)
      .send({ isActive: false });

    expect(res.status).toBe(422);
    const variant = await testPrisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    expect(variant.isActive).toBe(true);
  });
});

describe('categorias', () => {
  it('cria, recusa endereço repetido e só exclui categoria vazia', async () => {
    const created = await request(app)
      .post('/admin/categories')
      .set('Authorization', adminAuth)
      .send({ name: 'Calçados' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('calcados');

    const duplicate = await request(app)
      .post('/admin/categories')
      .set('Authorization', adminAuth)
      .send({ name: 'Calçados' });
    expect(duplicate.status).toBe(409);

    await createProduct();
    const inUse = await request(app)
      .delete(`/admin/categories/${categoryId}`)
      .set('Authorization', adminAuth);
    expect(inUse.status).toBe(409);
    expect(inUse.body.error.code).toBe('CATEGORY_IN_USE');

    const empty = await request(app)
      .delete(`/admin/categories/${created.body.data.id}`)
      .set('Authorization', adminAuth);
    expect(empty.status).toBe(204);
  });
});

describe('fotos', () => {
  async function requestUpload(productId: string) {
    const res = await request(app)
      .post(`/admin/products/${productId}/images/upload-url`)
      .set('Authorization', adminAuth)
      .send({ contentType: 'image/webp' });
    expect(res.status).toBe(200);
    return res.body.data as { path: string; uploadUrl: string };
  }

  it('o servidor escolhe o caminho do arquivo, dentro da pasta do produto', async () => {
    const product = await createProduct();

    const { path, uploadUrl } = await requestUpload(product.id);

    expect(path).toMatch(new RegExp(`^products/${product.id}/[0-9a-f-]{36}\\.webp$`));
    expect(uploadUrl).toContain(path);
  });

  it('recusa tipo de arquivo não permitido no pedido de envio', async () => {
    const product = await createProduct();
    const res = await request(app)
      .post(`/admin/products/${product.id}/images/upload-url`)
      .set('Authorization', adminAuth)
      .send({ contentType: 'image/svg+xml' });

    expect(res.status).toBe(400);
  });

  it('confere o arquivo realmente enviado antes de cadastrar', async () => {
    const product = await createProduct();
    const { path } = await requestUpload(product.id);
    const register = () =>
      request(app)
        .post(`/admin/products/${product.id}/images`)
        .set('Authorization', adminAuth)
        .send({ path, alt: 'Blusa preta de frente' });

    // Nada foi enviado ainda
    expect((await register()).body.error.code).toBe('IMAGE_NOT_FOUND');

    // Enviaram um HTML disfarçado: recusado e apagado do Storage
    fakeStorage.upload(path, { contentType: 'text/html', size: 2000 });
    const disguised = await register();
    expect(disguised.body.error.code).toBe('INVALID_IMAGE');
    expect(fakeStorage.removed).toContain(path);

    // Grande demais
    fakeStorage.upload(path, { contentType: 'image/webp', size: 6 * 1024 * 1024 });
    expect((await register()).body.error.code).toBe('INVALID_IMAGE');
  });

  it('não aceita caminho de outro produto', async () => {
    const product = await createProduct();
    const other = await createProduct({ name: 'Outro Produto', slug: 'outro-produto' });
    const { path } = await requestUpload(other.id);
    fakeStorage.upload(path, { contentType: 'image/webp', size: 1000 });

    const res = await request(app)
      .post(`/admin/products/${product.id}/images`)
      .set('Authorization', adminAuth)
      .send({ path, alt: 'Tentativa de usar a foto de outro produto' });

    expect(res.body.error.code).toBe('INVALID_PATH');
  });

  it('cadastra em ordem, aparece na loja e apaga do Storage ao excluir', async () => {
    const product = await createProduct();
    await addVariant(product.id);
    await request(app)
      .patch(`/admin/products/${product.id}`)
      .set('Authorization', adminAuth)
      .send({ status: 'PUBLISHED' });

    const uploaded = [];
    for (const alt of ['Frente', 'Costas']) {
      const { path } = await requestUpload(product.id);
      fakeStorage.upload(path, { contentType: 'image/webp', size: 1000 });
      const res = await request(app)
        .post(`/admin/products/${product.id}/images`)
        .set('Authorization', adminAuth)
        .send({ path, alt, color: 'Preto' });
      expect(res.status).toBe(201);
      uploaded.push({ ...res.body.data, path });
    }
    expect(uploaded.map((i) => i.position)).toEqual([0, 1]);

    const store = await request(app).get(`/catalog/products/${product.slug}`);
    expect(store.body.data.images.map((i: { alt: string }) => i.alt)).toEqual(['Frente', 'Costas']);

    const removed = await request(app)
      .delete(`/admin/images/${uploaded[0].id}`)
      .set('Authorization', adminAuth);
    expect(removed.status).toBe(204);
    expect(fakeStorage.removed).toContain(uploaded[0].path);
  });

  it('avisa claramente quando o Storage não está configurado', async () => {
    const unconfigured = buildTestApp({ imageStorage: createUnconfiguredImageStorage() });
    const product = await createProduct();

    const res = await request(unconfigured)
      .post(`/admin/products/${product.id}/images/upload-url`)
      .set('Authorization', adminAuth)
      .send({ contentType: 'image/jpeg' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('STORAGE_NOT_CONFIGURED');
  });
});
