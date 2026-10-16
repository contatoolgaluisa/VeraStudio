import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { OrderStatus, ProductStatus, Role } from '../src/generated/prisma/client.js';
import { releaseExpiredReservations } from '../src/modules/orders/reservations.js';
import { signToken } from './auth-helpers.js';
import { buildTestApp, resetCatalog, resetOrders, resetUsers, testPrisma } from './helpers.js';

const app = buildTestApp();

const ana = { sub: '0192f1a0-0000-7000-8000-0000000000a1', email: 'ana@exemplo.com' };
const bia = { sub: '0192f1a0-0000-7000-8000-0000000000b2', email: 'bia@exemplo.com' };
const admin = { sub: '0192f1a0-0000-7000-8000-0000000000ad', email: 'admin@exemplo.com' };
const auth: Record<string, string> = {};
const v: Record<string, string> = {};
let productId = '';

beforeEach(async () => {
  await resetOrders();
  await resetCatalog();
  await resetUsers();
  await testPrisma.userProfile.createMany({
    data: [
      { id: ana.sub, email: ana.email },
      { id: bia.sub, email: bia.email },
      { id: admin.sub, email: admin.email, role: Role.ADMIN },
    ],
  });
  auth.ana = `Bearer ${await signToken(ana)}`;
  auth.bia = `Bearer ${await signToken(bia)}`;
  auth.admin = `Bearer ${await signToken(admin)}`;

  const category = await testPrisma.category.create({
    data: { name: 'Feminino', slug: 'feminino' },
  });
  const product = await testPrisma.product.create({
    data: {
      name: 'Camisa Linho',
      slug: 'camisa-linho',
      description: 'Camisa de teste',
      categoryId: category.id,
      priceCents: 15000,
      compareAtPriceCents: 20000,
      status: ProductStatus.PUBLISHED,
      images: { create: [{ url: 'https://exemplo.test/c.jpg', alt: 'Camisa', position: 0 }] },
    },
  });
  productId = product.id;
  const variant = async (sku: string, size: string, stock: number) =>
    (
      await testPrisma.productVariant.create({
        data: { productId, sku, color: 'Preto', colorHex: '#151515', size, stock },
      })
    ).id;
  v.m = await variant('C-PRE-M', 'M', 5);
  v.last = await variant('C-PRE-P', 'P', 1);
  v.g = await variant('C-PRE-G', 'G', 20);
});

afterAll(async () => {
  await resetOrders();
  await resetCatalog();
  await resetUsers();
  await testPrisma.$disconnect();
});

const stockOf = async (id: string) =>
  (await testPrisma.productVariant.findUniqueOrThrow({ where: { id } })).stock;

function createOrder(
  who: string,
  items: { variantId: string; quantity: number }[],
  idempotencyKey = randomUUID(),
  target = app,
) {
  return request(target)
    .post('/orders')
    .set('Authorization', auth[who]!)
    .send({ items, idempotencyKey });
}

describe('acesso', () => {
  it('exige login em todas as rotas de pedidos', async () => {
    const id = randomUUID();
    expect((await request(app).post('/orders').send({})).status).toBe(401);
    expect((await request(app).get('/orders')).status).toBe(401);
    expect((await request(app).get(`/orders/${id}`)).status).toBe(401);
    expect((await request(app).post(`/orders/${id}/cancel`)).status).toBe(401);
  });

  it('cliente não vê nem cancela pedido de outra pessoa', async () => {
    const created = await createOrder('ana', [{ variantId: v.m!, quantity: 1 }]);
    const id = created.body.data.id as string;

    expect((await request(app).get(`/orders/${id}`).set('Authorization', auth.bia!)).status).toBe(
      404,
    );
    const cancel = await request(app).post(`/orders/${id}/cancel`).set('Authorization', auth.bia!);
    expect(cancel.status).toBe(404);
    const list = await request(app).get('/orders').set('Authorization', auth.bia!);
    expect(list.body.data).toEqual([]);
    expect(await stockOf(v.m!)).toBe(4);
  });

  it('cliente não acessa a gestão de pedidos do painel', async () => {
    const res = await request(app).get('/admin/orders').set('Authorization', auth.ana!);
    expect(res.status).toBe(403);
  });
});

describe('criação do pedido', () => {
  it('calcula no servidor, reserva o estoque e congela os dados do item', async () => {
    const res = await createOrder('ana', [
      { variantId: v.m!, quantity: 2 },
      { variantId: v.g!, quantity: 1 },
    ]);

    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order).toMatchObject({
      status: 'PENDING_PAYMENT',
      itemCount: 3,
      subtotalCents: 60000,
      discountCents: 15000,
      shippingCents: 0,
      totalCents: 45000,
    });
    expect(order.number).toBeGreaterThanOrEqual(1001);
    const minutes = (new Date(order.reservationExpiresAt).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
    expect(order.items).toContainEqual(
      expect.objectContaining({
        productName: 'Camisa Linho',
        sku: 'C-PRE-M',
        size: 'M',
        unitPriceCents: 15000,
        compareAtPriceCents: 20000,
        quantity: 2,
        lineTotalCents: 30000,
      }),
    );
    expect(order.statusHistory).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'PENDING_PAYMENT' }),
    ]);
    expect(await stockOf(v.m!)).toBe(3);
    expect(await stockOf(v.g!)).toBe(19);

    // O pedido guarda o que foi comprado, mesmo que o produto mude depois.
    await testPrisma.product.update({
      where: { id: productId },
      data: { name: 'Camisa Renomeada', priceCents: 99900, compareAtPriceCents: null },
    });
    const later = await request(app).get(`/orders/${order.id}`).set('Authorization', auth.ana!);
    expect(later.body.data.items[0]).toMatchObject({
      productName: 'Camisa Linho',
      unitPriceCents: 15000,
    });
    expect(later.body.data.totalCents).toBe(45000);
  });

  it('recusa campos extras como preço enviado pelo navegador', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', auth.ana!)
      .send({
        items: [{ variantId: v.m, quantity: 1, unitPriceCents: 1 }],
        idempotencyKey: randomUUID(),
      });
    expect(res.status).toBe(400);
  });

  it('o mesmo envio repetido devolve o mesmo pedido e reserva uma vez só', async () => {
    const key = randomUUID();
    const items = [{ variantId: v.m!, quantity: 2 }];

    const first = await createOrder('ana', items, key);
    const again = await createOrder('ana', items, key);
    const [a, b] = await Promise.all([
      createOrder('ana', items, key),
      createOrder('ana', items, key),
    ]);

    expect(first.status).toBe(201);
    expect(again.status).toBe(200);
    expect(new Set([first, again, a, b].map((r) => r.body.data.id)).size).toBe(1);
    expect(await testPrisma.order.count()).toBe(1);
    expect(await stockOf(v.m!)).toBe(3);
  });

  it('três envios simultâneos com a mesma chave reservam uma vez só', async () => {
    const key = randomUUID();
    const results = await Promise.all(
      [key, key, key].map((k) => createOrder('ana', [{ variantId: v.g!, quantity: 1 }], k)),
    );
    expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(true);
    expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
    expect(await stockOf(v.g!)).toBe(19);
  });

  it('a última peça vai para uma pessoa só, mesmo com compras simultâneas', async () => {
    const [anaRes, biaRes] = await Promise.all([
      createOrder('ana', [{ variantId: v.last!, quantity: 1 }]),
      createOrder('bia', [{ variantId: v.last!, quantity: 1 }]),
    ]);

    expect([anaRes.status, biaRes.status].sort()).toEqual([201, 409]);
    const loser = anaRes.status === 409 ? anaRes : biaRes;
    expect(loser.body.error.code).toBe('CART_CHANGED');
    expect(await stockOf(v.last!)).toBe(0);
    expect(await testPrisma.order.count()).toBe(1);
  });

  it('recusa sem reservar nada quando algum item mudou', async () => {
    await testPrisma.productVariant.update({ where: { id: v.g! }, data: { isActive: false } });

    const res = await createOrder('ana', [
      { variantId: v.m!, quantity: 1 },
      { variantId: v.g!, quantity: 1 },
      { variantId: v.last!, quantity: 3 },
      { variantId: randomUUID(), quantity: 1 },
    ]);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_CHANGED');
    expect(res.body.error.details.map((d: { reason: string }) => d.reason).sort()).toEqual([
      'INSUFFICIENT_STOCK',
      'NOT_FOUND',
      'UNAVAILABLE',
    ]);
    // Nem o item que estava disponível foi reservado.
    expect(await stockOf(v.m!)).toBe(5);
    expect(await testPrisma.order.count()).toBe(0);
  });

  it('limita pedidos aguardando pagamento por cliente', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await createOrder('ana', [{ variantId: v.g!, quantity: 1 }])).status).toBe(201);
    }
    const res = await createOrder('ana', [{ variantId: v.g!, quantity: 1 }]);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TOO_MANY_PENDING_ORDERS');
  });

  it('limita tentativas de criação por minuto', async () => {
    const limited = buildTestApp({ orderCreateLimitPerMinute: 2 });
    const empty: { variantId: string; quantity: number }[] = [];

    await createOrder('ana', empty, randomUUID(), limited);
    await createOrder('ana', empty, randomUUID(), limited);
    const third = await createOrder('ana', empty, randomUUID(), limited);

    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('TOO_MANY_REQUESTS');
    // O limite é por pessoa: outra cliente não é afetada.
    expect((await createOrder('bia', empty, randomUUID(), limited)).status).toBe(400);
  });
});

describe('cancelamento e expiração da reserva', () => {
  it('cliente cancela pedido aguardando pagamento e o estoque volta', async () => {
    const created = await createOrder('ana', [{ variantId: v.m!, quantity: 2 }]);
    const id = created.body.data.id as string;

    const res = await request(app).post(`/orders/${id}/cancel`).set('Authorization', auth.ana!);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(await stockOf(v.m!)).toBe(5);

    const again = await request(app).post(`/orders/${id}/cancel`).set('Authorization', auth.ana!);
    expect(again.status).toBe(409);
    expect(await stockOf(v.m!)).toBe(5);
  });

  it('reserva vencida expira, devolve o estoque uma vez e registra no histórico', async () => {
    const created = await createOrder('ana', [{ variantId: v.m!, quantity: 3 }]);
    const id = created.body.data.id as string;
    await testPrisma.order.update({
      where: { id },
      data: { reservationExpiresAt: new Date(Date.now() - 1000) },
    });

    const [first, second] = await Promise.all([
      releaseExpiredReservations(testPrisma),
      releaseExpiredReservations(testPrisma),
    ]);

    expect(first + second).toBe(1);
    expect(await stockOf(v.m!)).toBe(5);
    const order = await request(app).get(`/orders/${id}`).set('Authorization', auth.ana!);
    expect(order.body.data.status).toBe('EXPIRED');
    const history = await testPrisma.orderStatusHistory.findMany({
      where: { orderId: id, toStatus: OrderStatus.EXPIRED },
    });
    expect(history).toHaveLength(1);
    expect(history[0]!.changedById).toBeNull();
  });

  it('reserva ainda válida não expira', async () => {
    await createOrder('ana', [{ variantId: v.m!, quantity: 1 }]);
    expect(await releaseExpiredReservations(testPrisma)).toBe(0);
    expect(await stockOf(v.m!)).toBe(4);
  });

  it('libera reservas vencidas antes de criar um pedido novo', async () => {
    const first = await createOrder('ana', [{ variantId: v.last!, quantity: 1 }]);
    await testPrisma.order.update({
      where: { id: first.body.data.id },
      data: { reservationExpiresAt: new Date(Date.now() - 1000) },
    });

    const res = await createOrder('bia', [{ variantId: v.last!, quantity: 1 }]);
    expect(res.status).toBe(201);
    expect(await stockOf(v.last!)).toBe(0);
  });
});

describe('meus pedidos', () => {
  it('lista só os pedidos da pessoa, do mais recente ao mais antigo', async () => {
    await createOrder('ana', [{ variantId: v.m!, quantity: 1 }]);
    await createOrder('ana', [{ variantId: v.g!, quantity: 1 }]);
    await createOrder('bia', [{ variantId: v.g!, quantity: 1 }]);

    const res = await request(app).get('/orders').set('Authorization', auth.ana!);

    expect(res.body.meta.total).toBe(2);
    expect(res.body.data[0].number).toBeGreaterThan(res.body.data[1].number);
  });
});

describe('pedidos no painel', () => {
  async function paidOrder() {
    const created = await createOrder('ana', [{ variantId: v.m!, quantity: 1 }]);
    const id = created.body.data.id as string;
    // Até a Fase 7, só o teste consegue simular a confirmação do pagamento.
    await testPrisma.order.update({ where: { id }, data: { status: OrderStatus.PAID } });
    return { id, number: created.body.data.number as number };
  }

  const setStatus = (id: string, status: string, note?: string) =>
    request(app)
      .post(`/admin/orders/${id}/status`)
      .set('Authorization', auth.admin!)
      .send({ status, note });

  it('nunca marca como pago pelo painel', async () => {
    const created = await createOrder('ana', [{ variantId: v.m!, quantity: 1 }]);
    const res = await setStatus(created.body.data.id, 'PAID');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('segue o fluxo de envio e registra quem mudou, quando e por quê', async () => {
    const { id } = await paidOrder();

    expect((await setStatus(id, 'SHIPPED')).status).toBe(422);
    expect((await setStatus(id, 'PROCESSING')).status).toBe(200);
    expect((await setStatus(id, 'SHIPPED', 'Rastreio BR123')).status).toBe(200);
    const done = await setStatus(id, 'DELIVERED');

    expect(done.body.data.status).toBe('DELIVERED');
    const last = done.body.data.statusHistory.at(-1);
    expect(last).toMatchObject({
      fromStatus: 'SHIPPED',
      toStatus: 'DELIVERED',
      changedBy: { email: 'admin@exemplo.com' },
    });
    expect(done.body.data.statusHistory.map((h: { note: string }) => h.note)).toContain(
      'Rastreio BR123',
    );
    expect((await setStatus(id, 'PROCESSING')).status).toBe(422);
  });

  it('não cancela pedido pago (exige reembolso, Fase 7)', async () => {
    const { id } = await paidOrder();
    const res = await setStatus(id, 'CANCELLED');
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/reembolso/);
  });

  it('cancela pedido aguardando pagamento e devolve o estoque', async () => {
    const created = await createOrder('ana', [{ variantId: v.m!, quantity: 2 }]);

    const res = await setStatus(created.body.data.id, 'CANCELLED', 'Pedido de teste');

    expect(res.body.data.status).toBe('CANCELLED');
    expect(await stockOf(v.m!)).toBe(5);
  });

  it('lista com filtro e busca por número ou e-mail, e calcula o dashboard', async () => {
    const paid = await paidOrder();
    await createOrder('bia', [{ variantId: v.g!, quantity: 1 }]);

    const byStatus = await request(app)
      .get('/admin/orders?status=PAID')
      .set('Authorization', auth.admin!);
    expect(byStatus.body.data.map((o: { id: string }) => o.id)).toEqual([paid.id]);

    const byNumber = await request(app)
      .get(`/admin/orders?q=%23${paid.number}`)
      .set('Authorization', auth.admin!);
    expect(byNumber.body.data).toHaveLength(1);

    const byEmail = await request(app)
      .get('/admin/orders?q=BIA@')
      .set('Authorization', auth.admin!);
    expect(byEmail.body.data[0].customerEmail).toBe('bia@exemplo.com');

    const detail = await request(app)
      .get(`/admin/orders/${paid.id}`)
      .set('Authorization', auth.admin!);
    expect(detail.body.data.user).toMatchObject({ email: 'ana@exemplo.com' });

    const dashboard = await request(app).get('/admin/dashboard').set('Authorization', auth.admin!);
    expect(dashboard.body.data.orders).toEqual({
      total: 2,
      pendingPayment: 1,
      toFulfill: 1,
      paidRevenueCents: 15000 + 1990,
    });
  });
});
