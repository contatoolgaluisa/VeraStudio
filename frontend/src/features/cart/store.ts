import { useSyncExternalStore } from 'react';
import { z } from 'zod';

/**
 * Carrinho guardado no navegador (decisão D3).
 *
 * Guarda só o necessário para lembrar a escolha (variação e quantidade) e
 * uma "foto" do produto para exibir enquanto o servidor confere tudo.
 * Preço, disponibilidade e totais que valem são sempre os da API (/cart/quote).
 *
 * É um store pequeno, sem biblioteca: uma variável, uma lista de ouvintes e o
 * `useSyncExternalStore` do React para os componentes se atualizarem.
 */

export const CART_STORAGE_KEY = 'vera-carrinho-v1';
export const MAX_QUANTITY_PER_ITEM = 10;
export const MAX_CART_LINES = 50;

const cartItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
  /** Só para exibição enquanto a API responde. Nunca é enviado ao servidor. */
  display: z.object({
    productSlug: z.string(),
    productName: z.string(),
    color: z.string(),
    size: z.string(),
    imageUrl: z.string().nullable(),
    unitPriceCents: z.number().int(),
  }),
});

export type CartItem = z.infer<typeof cartItemSchema>;

const storedCartSchema = z.object({ items: z.array(cartItemSchema).max(MAX_CART_LINES) });

const EMPTY: CartItem[] = [];

/** Lê o carrinho salvo. Dado corrompido ou de outra versão vira carrinho vazio. */
function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = storedCartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.items : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // Modo privado ou armazenamento cheio: o carrinho funciona só nesta visita.
  }
}

let items: CartItem[] = load();
const listeners = new Set<() => void>();

function setItems(next: CartItem[]) {
  items = next;
  save(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Outra aba alterou o carrinho: atualiza esta também.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CART_STORAGE_KEY) return;
    items = load();
    listeners.forEach((listener) => listener());
  });
}

const clamp = (quantity: number, max: number) =>
  Math.max(1, Math.min(quantity, max, MAX_QUANTITY_PER_ITEM));

export type AddResult = 'added' | 'limited' | 'full';

export const cart = {
  getItems: () => items,

  /**
   * Adiciona (ou soma, se a variação já estiver no carrinho), respeitando o
   * máximo que a loja informou para a variação.
   */
  add(item: Omit<CartItem, 'quantity'>, quantity: number, maxQuantity: number): AddResult {
    const existing = items.find((current) => current.variantId === item.variantId);
    const current = existing?.quantity ?? 0;
    const limit = Math.min(maxQuantity, MAX_QUANTITY_PER_ITEM);
    if (current >= limit) return 'full';
    if (!existing && items.length >= MAX_CART_LINES) return 'full';

    const next = Math.min(current + quantity, limit);
    setItems(
      existing
        ? items.map((line) =>
            line.variantId === item.variantId
              ? { ...line, quantity: next, display: item.display }
              : line,
          )
        : [...items, { ...item, quantity: next }],
    );
    return next < current + quantity ? 'limited' : 'added';
  },

  setQuantity(variantId: string, quantity: number, maxQuantity = MAX_QUANTITY_PER_ITEM) {
    setItems(
      items.map((line) =>
        line.variantId === variantId ? { ...line, quantity: clamp(quantity, maxQuantity) } : line,
      ),
    );
  },

  remove(variantId: string) {
    setItems(items.filter((line) => line.variantId !== variantId));
  },

  clear() {
    setItems(EMPTY);
  },

  /** Usado pelos testes para simular um novo carregamento da página. */
  reloadFromStorage() {
    items = load();
    listeners.forEach((listener) => listener());
  },
};

export function useCartItems(): CartItem[] {
  return useSyncExternalStore(subscribe, cart.getItems, cart.getItems);
}

export function useCartCount(): number {
  const current = useCartItems();
  return current.reduce((sum, item) => sum + item.quantity, 0);
}
