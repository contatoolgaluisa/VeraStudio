const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 12990 -> "R$ 129,90". A API trabalha em centavos; só a tela converte para reais. */
export function formatPrice(cents: number): string {
  return brl.format(cents / 100);
}

/** "1 produto" / "12 produtos" */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
