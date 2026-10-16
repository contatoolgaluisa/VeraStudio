import { describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY, cart, type CartItem } from './store';

const camisa: Omit<CartItem, 'quantity'> = {
  variantId: 'v-1',
  display: {
    productSlug: 'camisa',
    productName: 'Camisa',
    color: 'Preto',
    size: 'M',
    imageUrl: null,
    unitPriceCents: 15000,
  },
};

describe('carrinho no navegador', () => {
  it('soma a mesma variação em vez de duplicar', () => {
    expect(cart.add(camisa, 1, 5)).toBe('added');
    expect(cart.add(camisa, 2, 5)).toBe('added');

    expect(cart.getItems()).toHaveLength(1);
    expect(cart.getItems()[0]?.quantity).toBe(3);
  });

  it('respeita o máximo da variação e o limite de 10 por item', () => {
    cart.add(camisa, 2, 3);
    expect(cart.add(camisa, 5, 3)).toBe('limited');
    expect(cart.getItems()[0]?.quantity).toBe(3);
    expect(cart.add(camisa, 1, 3)).toBe('full');

    cart.clear();
    cart.add(camisa, 30, 40);
    expect(cart.getItems()[0]?.quantity).toBe(10);
  });

  it('altera quantidade sem sair de 1 a máximo, e remove', () => {
    cart.add(camisa, 2, 5);
    cart.setQuantity('v-1', 0, 5);
    expect(cart.getItems()[0]?.quantity).toBe(1);
    cart.setQuantity('v-1', 9, 5);
    expect(cart.getItems()[0]?.quantity).toBe(5);

    cart.remove('v-1');
    expect(cart.getItems()).toEqual([]);
  });

  it('continua salvo depois de recarregar a página', () => {
    cart.add(camisa, 2, 5);

    cart.reloadFromStorage();

    expect(cart.getItems()).toMatchObject([{ variantId: 'v-1', quantity: 2 }]);
  });

  it('ignora dados salvos corrompidos ou adulterados', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{isso não é json');
    cart.reloadFromStorage();
    expect(cart.getItems()).toEqual([]);

    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...camisa, quantity: 500 }] }),
    );
    cart.reloadFromStorage();
    expect(cart.getItems()).toEqual([]);
  });
});
