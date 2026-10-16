import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProductStatus } from '../src/generated/prisma/client.js';
import { buildTestApp, resetCatalog, testPrisma } from './helpers.js';

/**
 * Testes de integração: a API real consultando um PostgreSQL real
 * (banco de testes). Cada produto abaixo existe para provar uma regra.
 */

const app = buildTestApp();
const HOUR = 60 * 60 * 1000;
const base = new Date('2026-01-01T12:00:00Z').getTime();

async function seedFixture() {
  await resetCatalog();

  const feminino = await testPrisma.category.create({
    data: { name: 'Feminino', slug: 'feminino', sortOrder: 0 },
  });
  const masculino = await testPrisma.category.create({
    data: { name: 'Masculino', slug: 'masculino', sortOrder: 1 },
  });

  // A: o mais recente; Preto/G esgotado
  await testPrisma.product.create({
    data: {
      name: 'Vestido Linho',
      slug: 'vestido-linho',
      description: 'Vestido de teste',
      categoryId: feminino.id,
      priceCents: 30000,
      status: ProductStatus.PUBLISHED,
      isNew: true,
      createdAt: new Date(base),
      images: {
        create: [
          { url: 'https://exemplo.test/2.jpg', alt: 'Costas', position: 1 },
          { url: 'https://exemplo.test/1.jpg', alt: 'Frente', position: 0 },
        ],
      },
      variants: {
        create: [
          { sku: 'T-A-PRE-M', color: 'Preto', colorHex: '#000000', size: 'M', stock: 5 },
          { sku: 'T-A-PRE-G', color: 'Preto', colorHex: '#000000', size: 'G', stock: 0 },
          { sku: 'T-A-ARE-M', color: 'Areia', colorHex: '#D8C8A8', size: 'M', stock: 25 },
          { sku: 'T-A-ARE-P', color: 'Areia', colorHex: '#D8C8A8', size: 'P', stock: 2 },
        ],
      },
    },
  });

  // B: em promoção
  await testPrisma.product.create({
    data: {
      name: 'Camiseta Básica',
      slug: 'camiseta-basica',
      description: 'Camiseta de teste',
      categoryId: masculino.id,
      priceCents: 12900,
      compareAtPriceCents: 15900,
      status: ProductStatus.PUBLISHED,
      createdAt: new Date(base - 1 * HOUR),
      variants: {
        create: [{ sku: 'T-B-BRA-P', color: 'Branco', colorHex: '#FFFFFF', size: 'P', stock: 10 }],
      },
    },
  });

  // C: rascunho, nunca aparece na loja
  await testPrisma.product.create({
    data: {
      name: 'Vestido Rascunho',
      slug: 'vestido-rascunho',
      description: 'Ainda não publicado',
      categoryId: feminino.id,
      priceCents: 10000,
      status: ProductStatus.DRAFT,
      createdAt: new Date(base + 1 * HOUR),
      variants: {
        create: [{ sku: 'T-C-PRE-M', color: 'Preto', colorHex: '#000000', size: 'M', stock: 3 }],
      },
    },
  });

  // D: publicado, mas totalmente esgotado
  await testPrisma.product.create({
    data: {
      name: 'Calça Sem Estoque',
      slug: 'calca-sem-estoque',
      description: 'Esgotada',
      categoryId: feminino.id,
      priceCents: 20000,
      status: ProductStatus.PUBLISHED,
      createdAt: new Date(base - 2 * HOUR),
      variants: {
        create: [{ sku: 'T-D-PRE-M', color: 'Preto', colorHex: '#000000', size: 'M', stock: 0 }],
      },
    },
  });

  // E: tem uma variação desativada (Preto/P), que precisa ficar invisível
  await testPrisma.product.create({
    data: {
      name: 'Vestido Seda',
      slug: 'vestido-seda',
      description: 'Vestido de teste',
      categoryId: feminino.id,
      priceCents: 45000,
      status: ProductStatus.PUBLISHED,
      createdAt: new Date(base - 3 * HOUR),
      variants: {
        create: [
          {
            sku: 'T-E-PRE-P',
            color: 'Preto',
            colorHex: '#000000',
            size: 'P',
            stock: 5,
            isActive: false,
          },
          { sku: 'T-E-AZU-M', color: 'Azul', colorHex: '#0000FF', size: 'M', stock: 3 },
        ],
      },
    },
  });
}

/** Lista apenas os slugs, para comparar resultados de forma legível. */
async function slugsFor(query: string) {
  const res = await request(app).get(`/catalog/products${query}`);
  expect(res.status).toBe(200);
  return (res.body.data as { slug: string }[]).map((p) => p.slug);
}

beforeAll(seedFixture);
afterAll(async () => {
  await resetCatalog();
  await testPrisma.$disconnect();
});

describe('GET /catalog/products', () => {
  it('lista só produtos publicados, dos mais novos para os mais antigos', async () => {
    const res = await request(app).get('/catalog/products');

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 12, total: 4, totalPages: 1 });
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual([
      'vestido-linho',
      'camiseta-basica',
      'calca-sem-estoque',
      'vestido-seda',
    ]);
  });

  it('monta o resumo do produto sem expor o estoque exato', async () => {
    const res = await request(app).get('/catalog/products?q=linho');
    const [product] = res.body.data;

    expect(product).toEqual({
      id: expect.any(String),
      slug: 'vestido-linho',
      name: 'Vestido Linho',
      category: { slug: 'feminino', name: 'Feminino' },
      priceCents: 30000,
      compareAtPriceCents: null,
      isOnSale: false,
      discountPercent: null,
      isNew: true,
      image: { url: 'https://exemplo.test/1.jpg', alt: 'Frente' },
      colors: [
        { name: 'Areia', hex: '#D8C8A8' },
        { name: 'Preto', hex: '#000000' },
      ],
      sizes: ['P', 'M', 'G'],
      inStock: true,
    });
    expect(JSON.stringify(product)).not.toContain('stock');
  });

  it('busca pelo nome sem diferenciar maiúsculas e minúsculas', async () => {
    expect(await slugsFor('?q=VESTIDO')).toEqual(['vestido-linho', 'vestido-seda']);
  });

  it('filtra por categoria', async () => {
    expect(await slugsFor('?category=masculino')).toEqual(['camiseta-basica']);
  });

  it('filtra por faixa de preço (em centavos)', async () => {
    expect(await slugsFor('?minPrice=15000&maxPrice=35000')).toEqual([
      'vestido-linho',
      'calca-sem-estoque',
    ]);
  });

  it('filtra por cor considerando só variações ativas e com estoque', async () => {
    // D tem Preto esgotado e E tem Preto desativado: só A aparece.
    expect(await slugsFor('?colors=Preto')).toEqual(['vestido-linho']);
  });

  it('exige que cor e tamanho estejam na MESMA variação', async () => {
    expect(await slugsFor('?colors=Preto&sizes=M')).toEqual(['vestido-linho']);
    // A tem Preto/G, mas esgotado; e Areia, mas não em G.
    expect(await slugsFor('?colors=Preto,Areia&sizes=G')).toEqual([]);
    expect(await slugsFor('?sizes=P,M&colors=Azul')).toEqual(['vestido-seda']);
  });

  it('filtra promoções e calcula o percentual de desconto', async () => {
    const res = await request(app).get('/catalog/products?onSale=true');

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      slug: 'camiseta-basica',
      priceCents: 12900,
      compareAtPriceCents: 15900,
      isOnSale: true,
      discountPercent: 19,
    });
  });

  it('filtra novidades', async () => {
    expect(await slugsFor('?isNew=true')).toEqual(['vestido-linho']);
  });

  it('ordena por preço', async () => {
    expect(await slugsFor('?sort=price_asc')).toEqual([
      'camiseta-basica',
      'calca-sem-estoque',
      'vestido-linho',
      'vestido-seda',
    ]);
    expect(await slugsFor('?sort=price_desc')).toEqual([
      'vestido-seda',
      'vestido-linho',
      'calca-sem-estoque',
      'camiseta-basica',
    ]);
  });

  it('pagina os resultados', async () => {
    const res = await request(app).get('/catalog/products?pageSize=3&page=2');

    expect(res.body.meta).toEqual({ page: 2, pageSize: 3, total: 4, totalPages: 2 });
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(['vestido-seda']);
  });

  it('marca produtos sem nenhuma variação disponível como esgotados', async () => {
    const res = await request(app).get('/catalog/products?q=sem%20estoque');
    expect(res.body.data[0].inStock).toBe(false);
  });

  it.each([
    ['pageSize acima do limite', '?pageSize=1000'],
    ['página zero', '?page=0'],
    ['preço negativo', '?minPrice=-1'],
    ['faixa de preço invertida', '?minPrice=5000&maxPrice=1000'],
    ['ordenação desconhecida', '?sort=aleatorio'],
    ['categoria com caracteres inválidos', '?category=Femin%20ino'],
  ])('responde 400 para parâmetros inválidos: %s', async (_label, query) => {
    const res = await request(app).get(`/catalog/products${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /catalog/products/:slug', () => {
  it('retorna detalhes, imagens em ordem e variações ordenadas', async () => {
    const res = await request(app).get('/catalog/products/vestido-linho');

    expect(res.status).toBe(200);
    const product = res.body.data;
    expect(product.description).toBe('Vestido de teste');
    expect(product.images.map((i: { alt: string }) => i.alt)).toEqual(['Frente', 'Costas']);
    expect(
      product.variants.map((v: { sku: string; available: boolean; maxQuantity: number }) => [
        v.sku,
        v.available,
        v.maxQuantity,
      ]),
    ).toEqual([
      ['T-A-ARE-P', true, 2],
      ['T-A-ARE-M', true, 10], // 25 em estoque, mas o limite por item é 10
      ['T-A-PRE-M', true, 5],
      ['T-A-PRE-G', false, 0],
    ]);
    expect(JSON.stringify(product)).not.toContain('"stock"');
  });

  it('não mostra variações desativadas', async () => {
    const res = await request(app).get('/catalog/products/vestido-seda');

    expect(res.body.data.variants.map((v: { sku: string }) => v.sku)).toEqual(['T-E-AZU-M']);
    expect(res.body.data.colors).toEqual([{ name: 'Azul', hex: '#0000FF' }]);
  });

  it('responde 404 para rascunhos e produtos inexistentes', async () => {
    for (const slug of ['vestido-rascunho', 'nao-existe']) {
      const res = await request(app).get(`/catalog/products/${slug}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });
});

describe('GET /catalog/categories', () => {
  it('lista categorias em ordem, contando só produtos publicados', async () => {
    const res = await request(app).get('/catalog/categories');

    expect(res.status).toBe(200);
    expect(
      res.body.data.map((c: { slug: string; productCount: number }) => [c.slug, c.productCount]),
    ).toEqual([
      ['feminino', 3],
      ['masculino', 1],
    ]);
  });
});

describe('GET /catalog/filters', () => {
  it('oferece só cores e tamanhos que podem ser comprados', async () => {
    const res = await request(app).get('/catalog/filters');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      colors: [
        { name: 'Areia', hex: '#D8C8A8' },
        { name: 'Azul', hex: '#0000FF' },
        { name: 'Branco', hex: '#FFFFFF' },
        { name: 'Preto', hex: '#000000' },
      ],
      sizes: ['P', 'M'],
      priceRange: { minCents: 12900, maxCents: 45000 },
    });
  });

  it('restringe as opções a uma categoria', async () => {
    const res = await request(app).get('/catalog/filters?category=masculino');

    expect(res.body.data).toEqual({
      colors: [{ name: 'Branco', hex: '#FFFFFF' }],
      sizes: ['P'],
      priceRange: { minCents: 12900, maxCents: 12900 },
    });
  });
});

describe('restrições do banco de dados', () => {
  it('recusa estoque negativo mesmo se o código tentar gravar', async () => {
    await expect(
      testPrisma.productVariant.update({
        where: { sku: 'T-A-PRE-M' },
        data: { stock: -1 },
      }),
    ).rejects.toThrow();
  });

  it('recusa preço "de" menor ou igual ao preço de venda', async () => {
    await expect(
      testPrisma.product.update({
        where: { slug: 'camiseta-basica' },
        data: { compareAtPriceCents: 12900 },
      }),
    ).rejects.toThrow();
  });

  it('recusa duas variações com a mesma cor e tamanho no mesmo produto', async () => {
    const product = await testPrisma.product.findUniqueOrThrow({
      where: { slug: 'vestido-linho' },
    });

    await expect(
      testPrisma.productVariant.create({
        data: {
          productId: product.id,
          sku: 'T-A-PRE-M-DUP',
          color: 'Preto',
          colorHex: '#000000',
          size: 'M',
        },
      }),
    ).rejects.toThrow();
  });
});
