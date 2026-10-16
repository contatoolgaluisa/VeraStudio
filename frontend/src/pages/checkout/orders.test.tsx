import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CartQuote } from '@/features/cart/api';
import { cart } from '@/features/cart/store';
import type { AdminOrderDetail, OrderDetail, OrderStatus } from '@/features/orders/types';
import { setFakeSession } from '@/test/fake-supabase';
import { mockApi } from '@/test/fixtures';
import { renderRoute } from '@/test/render';

const ORDER_ID = '0192f1a0-0000-7000-8000-00000000f001';

function login(role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
  setFakeSession({ access_token: 'token-ana', user: { id: 'u-ana', email: 'ana@exemplo.com' } });
  return {
    '/me': () => ({
      data: {
        id: 'u-ana',
        email: 'ana@exemplo.com',
        name: 'Ana',
        role,
        createdAt: '2026-10-01T00:00:00Z',
      },
    }),
  };
}

function addCamisa(quantity = 2) {
  cart.add(
    {
      variantId: 'v-camisa',
      display: {
        productSlug: 'camisa',
        productName: 'Camisa Linho',
        color: 'Preto',
        size: 'M',
        imageUrl: null,
        unitPriceCents: 15000,
      },
    },
    quantity,
    10,
  );
}

const quote = (status: 'OK' | 'UNAVAILABLE' = 'OK'): { data: CartQuote } => ({
  data: {
    items: [
      {
        variantId: 'v-camisa',
        status,
        requestedQuantity: 2,
        quantity: status === 'OK' ? 2 : 0,
        maxQuantity: status === 'OK' ? 10 : 0,
        unitPriceCents: 15000,
        compareAtPriceCents: null,
        lineTotalCents: status === 'OK' ? 30000 : 0,
        product: { id: 'p', slug: 'camisa', name: 'Camisa Linho', image: null },
        variant: { sku: 'C-PRE-M', color: 'Preto', colorHex: '#151515', size: 'M' },
      },
    ],
    summary: {
      itemCount: 2,
      subtotalCents: 30000,
      discountCents: 0,
      shippingCents: 0,
      totalCents: 30000,
      freeShippingMinCents: 29900,
      freeShippingRemainingCents: 0,
    },
  },
});

function order(status: OrderStatus = 'PENDING_PAYMENT'): OrderDetail {
  return {
    id: ORDER_ID,
    number: 1001,
    status,
    itemCount: 2,
    subtotalCents: 30000,
    discountCents: 0,
    shippingCents: 0,
    totalCents: 30000,
    reservationExpiresAt: '2026-10-16T15:30:00.000Z',
    createdAt: '2026-10-16T15:00:00.000Z',
    updatedAt: '2026-10-16T15:00:00.000Z',
    items: [
      {
        id: 'i1',
        productName: 'Camisa Linho',
        productSlug: 'camisa',
        sku: 'C-PRE-M',
        color: 'Preto',
        size: 'M',
        imageUrl: null,
        unitPriceCents: 15000,
        compareAtPriceCents: null,
        quantity: 2,
        lineTotalCents: 30000,
      },
    ],
    statusHistory: [
      { fromStatus: null, toStatus: 'PENDING_PAYMENT', createdAt: '2026-10-16T15:00:00.000Z' },
    ],
  };
}

function adminOrder(status: OrderStatus): AdminOrderDetail {
  return {
    ...order(status),
    customerEmail: 'ana@exemplo.com',
    user: { id: 'u-ana', name: 'Ana', email: 'ana@exemplo.com' },
  };
}

const body = (init: RequestInit | undefined) =>
  JSON.parse(String(init?.body)) as Record<string, unknown>;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkout', () => {
  it('exige login e volta para o checkout depois', async () => {
    addCamisa();
    mockApi({});
    const router = renderRoute('/checkout');

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
    expect(router.state.location.search).toBe('?redirect=%2Fcheckout');
  });

  it('cria o pedido uma vez só, limpa o carrinho e abre o pedido', async () => {
    addCamisa();
    const sent: Record<string, unknown>[] = [];
    mockApi({
      ...login(),
      '/cart/quote': () => quote(),
      '/orders': (_url, init) => {
        sent.push(body(init));
        return Response.json({ data: order() }, { status: 201 });
      },
      [`/orders/${ORDER_ID}`]: () => ({ data: order() }),
    });
    const router = renderRoute('/checkout');

    const confirm = await screen.findByRole('button', { name: 'Confirmar pedido' });
    expect(screen.getByText(/as peças ficam reservadas por 30 minutos/)).toBeTruthy();
    fireEvent.click(confirm);

    await waitFor(() => expect(router.state.location.pathname).toBe(`/conta/pedidos/${ORDER_ID}`));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ items: [{ variantId: 'v-camisa', quantity: 2 }] });
    expect(String(sent[0]!.idempotencyKey)).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(cart.getItems()).toEqual([]));
    expect(
      await screen.findByText('Pedido criado. As peças estão reservadas para você.'),
    ).toBeTruthy();
  });

  it('repete a mesma chave numa nova tentativa do mesmo carrinho', async () => {
    addCamisa();
    const keys: unknown[] = [];
    mockApi({
      ...login(),
      '/cart/quote': () => quote(),
      '/orders': (_url, init) => {
        keys.push(body(init).idempotencyKey);
        return Response.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Falha temporária.' } },
          { status: 500 },
        );
      },
    });
    renderRoute('/checkout');

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText('Falha temporária.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toBe(keys[1]);
  });

  it('avisa e manda revisar o carrinho quando algo mudou', async () => {
    addCamisa();
    let quoteCalls = 0;
    mockApi({
      ...login(),
      '/cart/quote': () => {
        quoteCalls += 1;
        return quote(quoteCalls === 1 ? 'OK' : 'UNAVAILABLE');
      },
      '/orders': () =>
        Response.json(
          { error: { code: 'CART_CHANGED', message: 'mudou', details: [] } },
          { status: 409 },
        ),
    });
    renderRoute('/checkout');

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(/Revise o carrinho antes de confirmar/)).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toHaveProperty(
        'disabled',
        true,
      ),
    );
    expect(cart.getItems()).toHaveLength(1);
  });
});

describe('meus pedidos', () => {
  it('lista os pedidos e mostra estado vazio', async () => {
    mockApi({
      ...login(),
      '/orders': () => ({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }),
    });
    renderRoute('/conta/pedidos');

    expect(await screen.findByRole('heading', { name: 'Você ainda não fez pedidos' })).toBeTruthy();
  });

  it('mostra a reserva e permite cancelar com confirmação', async () => {
    let cancelled = false;
    mockApi({
      ...login(),
      [`/orders/${ORDER_ID}`]: () => ({ data: order(cancelled ? 'CANCELLED' : 'PENDING_PAYMENT') }),
      [`/orders/${ORDER_ID}/cancel`]: () => {
        cancelled = true;
        return { data: order('CANCELLED') };
      },
    });
    renderRoute(`/conta/pedidos/${ORDER_ID}`);

    expect(await screen.findByRole('heading', { name: 'Pedido #1001' })).toBeTruthy();
    expect(screen.getByText(/Reservado até/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    expect(await screen.findAllByText('Cancelado')).not.toHaveLength(0);
    expect(cancelled).toBe(true);
    expect(screen.queryByText(/Reservado até/)).toBeNull();
  });
});

describe('pedidos no painel', () => {
  it('oferece só as mudanças permitidas e nunca "pago"', async () => {
    let current: OrderStatus = 'PENDING_PAYMENT';
    const sent: Record<string, unknown>[] = [];
    mockApi({
      ...login('ADMIN'),
      [`/admin/orders/${ORDER_ID}`]: () => ({ data: adminOrder(current) }),
      [`/admin/orders/${ORDER_ID}/status`]: (_url, init) => {
        sent.push(body(init));
        current = body(init).status as OrderStatus;
        return { data: adminOrder(current) };
      },
    });
    renderRoute(`/admin/pedidos/${ORDER_ID}`);

    expect(await screen.findByRole('heading', { name: 'Pedido #1001' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /pago/i })).toBeNull();
    expect(screen.getByText(/"Pago" só é registrado pela confirmação do pagamento/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Observação (opcional)'), {
      target: { value: 'Cliente pediu' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }));

    await waitFor(() => expect(sent).toEqual([{ status: 'CANCELLED', note: 'Cliente pediu' }]));
    expect(await screen.findByText(/As peças reservadas voltaram ao estoque/)).toBeTruthy();
  });

  it('segue para o envio a partir de um pedido pago', async () => {
    mockApi({
      ...login('ADMIN'),
      [`/admin/orders/${ORDER_ID}`]: () => ({ data: adminOrder('PAID') }),
    });
    renderRoute(`/admin/pedidos/${ORDER_ID}`);

    expect(await screen.findByRole('button', { name: 'Iniciar separação' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).toBeNull();
  });

  it('lista pedidos com busca na URL', async () => {
    const fetchMock = mockApi({
      ...login('ADMIN'),
      '/admin/orders': () => ({
        data: [
          {
            id: ORDER_ID,
            number: 1001,
            status: 'PAID',
            itemCount: 2,
            totalCents: 30000,
            reservationExpiresAt: '2026-10-16T15:30:00.000Z',
            createdAt: '2026-10-16T15:00:00.000Z',
            customerEmail: 'ana@exemplo.com',
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
    });
    renderRoute('/admin/pedidos?q=%231001');

    expect((await screen.findByRole('link', { name: '#1001' })).getAttribute('href')).toBe(
      `/admin/pedidos/${ORDER_ID}`,
    );
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/admin/orders?') && url.includes('q=%231001'))).toBe(
      true,
    );
  });
});
