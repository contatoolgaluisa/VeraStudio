import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ProductStatus } from '../src/generated/prisma/client.js';
import { computeTotals } from '../src/modules/cart/pricing.js';
import { buildTestApp, resetCatalog, testPrisma } from './helpers.js';

const app = buildTestApp();
const shipping = { flatCents: 1990, freeMinCents: 29900 };
const UNKNOWN = '0192f1a0-0000-7000-8000-0000000000aa';

describe('cálculo do carrinho', () => {
  it('soma preços originais, descontos e cobra frete abaixo do mínimo', () => {
    const totals = computeTotals(
      [
        { unitPriceCents: 10000, compareAtPriceCents: 12000, quantity: 2 },
        { unitPriceCents: 5000, compareAtPriceCents: null, quantity: 1 },
      ],
      shipping,
    );

    expect(totals).toEqual({
      itemCount: 3,
      subtotalCents: 29000,
      discountCents: 4000,
      shippingCents: 1990,
      totalCents: 25000 + 1990,
      freeShippingMinCents: 29900,
      freeShippingRemainingCents: 4900,
    });
  });

  it('frete grátis a partir do mínimo, contando o valor já com desconto', () => {
    const exact = computeTotals(
      [{ unitPriceCents: 29900, compareAtPriceCents: 39900, quantity: 1 }],
      shipping,
    );
    expect(exact.shippingCents).toBe(0);
    expect(exact.totalCents).toBe(29900);
    expect(exact.freeShippingRemainingCents).toBe(0);

    const below = computeTotals(
      [{ unitPriceCents: 29899, compareAtPriceCents: 39900, quantity: 1 }],
      shipping,
    );
    expect(below.shippingCents).toBe(1990);
  });

  it('carrinho vazio não paga frete', () => {
    expect(computeTotals([], shipping)).toMatchObject({ totalCents: 0, shippingCents: 0 });
  });
});

describe('POST /cart/quote', () => {
  const ids: Record<string, string> = {};

  beforeEach(async () => {
    await resetCatalog();
    const category = await testPrisma.category.create({
      data: { name: 'Feminino', slug: 'feminino' },
    });
    const published = await testPrisma.product.create({
      data: {
        name: 'Camisa Linho',
        slug: 'camisa-linho',
        description: 'Camisa de teste',
        categoryId: category.id,
        priceCents: 15000,
        compareAtPriceCents: 20000,
        status: ProductStatus.PUBLISHED,
        images: {
          create: [
            { url: 'https://exemplo.test/geral.jpg', alt: 'Geral', position: 0 },
            { url: 'https://exemplo.test/areia.jpg', alt: 'Areia', color: 'Areia', position: 1 },
          ],
        },
      },
    });
    const draft = await testPrisma.product.create({
      data: {
        name: 'Rascunho',
        slug: 'rascunho',
        description: 'Ainda não publicado',
        categoryId: category.id,
        priceCents: 9900,
      },
    });
    const variant = (sku: string, data: Record<string, unknown>) =>
      testPrisma.productVariant.create({
        data: {
          productId: published.id,
          sku,
          color: 'Preto',
          colorHex: '#151515',
          size: 'M',
          stock: 5,
          ...data,
        },
      });

    ids.ok = (await variant('C-PRE-M', {})).id;
    ids.areia = (await variant('C-ARE-M', { color: 'Areia', colorHex: '#D8C8A8', stock: 40 })).id;
    ids.low = (await variant('C-PRE-P', { size: 'P', stock: 2 })).id;
    ids.soldout = (await variant('C-PRE-G', { size: 'G', stock: 0 })).id;
    ids.inactive = (await variant('C-PRE-GG', { size: 'GG', isActive: false })).id;
    ids.draft = (
      await testPrisma.productVariant.create({
        data: {
          productId: draft.id,
          sku: 'R-1',
          color: 'Preto',
          colorHex: '#151515',
          size: 'U',
          stock: 9,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await resetCatalog();
    await testPrisma.$disconnect();
  });

  const quote = (items: unknown) => request(app).post('/cart/quote').send({ items });

  it('usa os preços do banco, nunca valores enviados pelo navegador', async () => {
    const res = await request(app)
      .post('/cart/quote')
      .send({ items: [{ variantId: ids.ok, quantity: 1, unitPriceCents: 1 }] });
    expect(res.status).toBe(400);

    const ok = await quote([{ variantId: ids.ok, quantity: 2 }]);
    expect(ok.status).toBe(200);
    expect(ok.body.data.items[0]).toMatchObject({
      status: 'OK',
      quantity: 2,
      unitPriceCents: 15000,
      compareAtPriceCents: 20000,
      lineTotalCents: 30000,
      product: { slug: 'camisa-linho', name: 'Camisa Linho' },
      variant: { sku: 'C-PRE-M', color: 'Preto', size: 'M' },
    });
    expect(ok.body.data.summary).toMatchObject({
      itemCount: 2,
      subtotalCents: 40000,
      discountCents: 10000,
      shippingCents: 0,
      totalCents: 30000,
    });
  });

  it('não expõe o estoque exato: limita a 10 por item', async () => {
    const res = await quote([{ variantId: ids.areia, quantity: 12 }]);

    expect(res.body.data.items[0]).toMatchObject({
      status: 'ADJUSTED',
      requestedQuantity: 12,
      quantity: 10,
      maxQuantity: 10,
    });
    expect(JSON.stringify(res.body)).not.toContain('"stock"');
  });

  it('reduz a quantidade ao estoque disponível', async () => {
    const res = await quote([{ variantId: ids.low, quantity: 5 }]);

    expect(res.body.data.items[0]).toMatchObject({ status: 'ADJUSTED', quantity: 2 });
    expect(res.body.data.summary.itemCount).toBe(2);
  });

  it('marca como indisponível: esgotada, desativada, rascunho ou inexistente', async () => {
    const res = await quote([
      { variantId: ids.soldout, quantity: 1 },
      { variantId: ids.inactive, quantity: 1 },
      { variantId: ids.draft, quantity: 1 },
      { variantId: UNKNOWN, quantity: 1 },
      { variantId: ids.ok, quantity: 1 },
    ]);

    const statuses = res.body.data.items.map((item: { status: string }) => item.status);
    expect(statuses).toEqual(['UNAVAILABLE', 'UNAVAILABLE', 'UNAVAILABLE', 'UNAVAILABLE', 'OK']);
    expect(res.body.data.items[3]).toMatchObject({ product: null, quantity: 0 });
    // Só o item disponível entra no total (R$ 150 + frete).
    expect(res.body.data.summary).toMatchObject({ itemCount: 1, totalCents: 15000 + 1990 });
  });

  it('junta linhas repetidas da mesma variação', async () => {
    const res = await quote([
      { variantId: ids.ok, quantity: 1 },
      { variantId: ids.ok, quantity: 2 },
    ]);

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(3);
  });

  it('usa a foto da cor escolhida quando existe', async () => {
    const res = await quote([
      { variantId: ids.areia, quantity: 1 },
      { variantId: ids.ok, quantity: 1 },
    ]);

    expect(res.body.data.items[0].product.image.alt).toBe('Areia');
    expect(res.body.data.items[1].product.image.alt).toBe('Geral');
  });

  it('valida quantidades e tamanho do carrinho', async () => {
    expect((await quote([{ variantId: ids.ok, quantity: 0 }])).status).toBe(400);
    expect((await quote([{ variantId: 'abc', quantity: 1 }])).status).toBe(400);
    const tooMany = Array.from({ length: 51 }, () => ({ variantId: ids.ok, quantity: 1 }));
    expect((await quote(tooMany)).status).toBe(400);
    expect((await quote([])).body.data.summary.totalCents).toBe(0);
  });
});
