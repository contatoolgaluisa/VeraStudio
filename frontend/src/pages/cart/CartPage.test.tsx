import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CartQuote, QuoteLine } from '@/features/cart/api';
import { cart, type CartItem } from '@/features/cart/store';
import { mockApi } from '@/test/fixtures';
import { renderRoute } from '@/test/render';

function item(variantId: string, name: string, quantity: number): CartItem {
  return {
    variantId,
    quantity,
    display: {
      productSlug: variantId,
      productName: name,
      color: 'Preto',
      size: 'M',
      imageUrl: null,
      unitPriceCents: 1,
    },
  };
}

function line(variantId: string, name: string, overrides: Partial<QuoteLine> = {}): QuoteLine {
  return {
    variantId,
    status: 'OK',
    requestedQuantity: 1,
    quantity: 1,
    maxQuantity: 10,
    unitPriceCents: 15000,
    compareAtPriceCents: null,
    lineTotalCents: 15000,
    product: { id: variantId, slug: variantId, name, image: null },
    variant: { sku: variantId.toUpperCase(), color: 'Preto', colorHex: '#151515', size: 'M' },
    ...overrides,
  };
}

function quote(
  items: QuoteLine[],
  summary: Partial<CartQuote['summary']> = {},
): {
  data: CartQuote;
} {
  return {
    data: {
      items,
      summary: {
        itemCount: 1,
        subtotalCents: 15000,
        discountCents: 0,
        shippingCents: 1990,
        totalCents: 16990,
        freeShippingMinCents: 29900,
        freeShippingRemainingCents: 14900,
        ...summary,
      },
    },
  };
}

function load(...items: CartItem[]) {
  for (const current of items) {
    cart.add(current, current.quantity, 10);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('carrinho', () => {
  it('mostra o estado vazio', async () => {
    mockApi({});
    renderRoute('/carrinho');

    expect(await screen.findByRole('heading', { name: 'Seu carrinho está vazio' })).toBeTruthy();
  });

  it('envia só variação e quantidade, e mostra os valores do servidor', async () => {
    load(item('camisa', 'Camisa Linho', 2));
    let sent: unknown = null;
    mockApi({
      '/cart/quote': (_url, init) => {
        sent = JSON.parse(String(init?.body));
        return quote(
          [
            line('camisa', 'Camisa Linho', {
              quantity: 2,
              requestedQuantity: 2,
              compareAtPriceCents: 20000,
              lineTotalCents: 30000,
            }),
          ],
          {
            itemCount: 2,
            subtotalCents: 40000,
            discountCents: 10000,
            shippingCents: 0,
            totalCents: 30000,
            freeShippingRemainingCents: 0,
          },
        );
      },
    });
    renderRoute('/carrinho');

    expect(await screen.findByText('Grátis')).toBeTruthy();
    expect(sent).toEqual({ items: [{ variantId: 'camisa', quantity: 2 }] });
    expect(screen.getByText(/−R\$\s?100,00/)).toBeTruthy();
    expect(screen.getByText('Total').nextElementSibling?.textContent).toMatch(/R\$\s?300,00/);
    // O preço guardado no navegador (R$ 0,01) nunca aparece.
    expect(screen.queryByText(/R\$\s?0,01/)).toBeNull();
  });

  it('mostra quanto falta para o frete grátis', async () => {
    load(item('camisa', 'Camisa Linho', 1));
    mockApi({ '/cart/quote': () => quote([line('camisa', 'Camisa Linho')]) });
    renderRoute('/carrinho');

    expect(await screen.findByText(/Faltam R\$\s?149,00 para frete grátis/)).toBeTruthy();
  });

  it('aplica a quantidade ajustada ao estoque e avisa', async () => {
    load(item('saia', 'Saia Midi', 5));
    mockApi({
      '/cart/quote': (_url, init) => {
        const { items } = JSON.parse(String(init?.body)) as {
          items: { quantity: number }[];
        };
        const requested = items[0]!.quantity;
        return quote([
          line('saia', 'Saia Midi', {
            status: requested > 2 ? 'ADJUSTED' : 'OK',
            requestedQuantity: requested,
            quantity: 2,
            maxQuantity: 2,
          }),
        ]);
      },
    });
    renderRoute('/carrinho');

    expect(await screen.findByText(/Saia Midi \(Preto, M\): 2 unidades disponíveis/)).toBeTruthy();
    await waitFor(() => expect(cart.getItems()[0]?.quantity).toBe(2));
    expect(
      screen.getByRole('button', { name: 'Aumentar quantidade de Saia Midi, Preto, M' }),
    ).toHaveProperty('disabled', true);
  });

  it('sinaliza itens indisponíveis e permite remover', async () => {
    load(item('camisa', 'Camisa Linho', 1), item('vestido', 'Vestido Antigo', 1));
    mockApi({
      '/cart/quote': (_url, init) => {
        const { items } = JSON.parse(String(init?.body)) as { items: { variantId: string }[] };
        return quote(
          items.map(({ variantId }) =>
            variantId === 'vestido'
              ? line('vestido', 'Vestido Antigo', {
                  status: 'UNAVAILABLE',
                  quantity: 0,
                  maxQuantity: 0,
                  lineTotalCents: 0,
                })
              : line('camisa', 'Camisa Linho'),
          ),
        );
      },
    });
    renderRoute('/carrinho');

    expect(await screen.findByText(/Indisponível: esgotado ou fora da loja/)).toBeTruthy();
    expect(screen.getByText('Remova os itens indisponíveis para continuar.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remover Vestido Antigo, Preto, M' }));

    await waitFor(() =>
      expect(screen.queryByText('Remova os itens indisponíveis para continuar.')).toBeNull(),
    );
    expect(cart.getItems().map((current) => current.variantId)).toEqual(['camisa']);
  });

  it('altera a quantidade e não finge o fechamento do pedido', async () => {
    load(item('camisa', 'Camisa Linho', 1));
    mockApi({ '/cart/quote': () => quote([line('camisa', 'Camisa Linho')]) });
    renderRoute('/carrinho');

    fireEvent.click(
      await screen.findByRole('button', { name: 'Aumentar quantidade de Camisa Linho, Preto, M' }),
    );
    expect(cart.getItems()[0]?.quantity).toBe(2);
    expect(screen.getByRole('button', { name: 'Finalizar compra' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('avisa quando não consegue conferir os preços', async () => {
    load(item('camisa', 'Camisa Linho', 1));
    mockApi({
      '/cart/quote': () =>
        Response.json({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, { status: 500 }),
    });
    renderRoute('/carrinho');

    expect(
      await screen.findByText('Não foi possível conferir preços e estoque agora.'),
    ).toBeTruthy();
  });
});
