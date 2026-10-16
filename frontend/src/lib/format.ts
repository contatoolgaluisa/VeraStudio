const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 12990 -> "R$ 129,90". A API trabalha em centavos; só a tela converte para reais. */
export function formatPrice(cents: number): string {
  return brl.format(cents / 100);
}

/** "1 produto" / "12 produtos" */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Lê um valor digitado em reais e devolve centavos: "129,90" -> 12990,
 * "1.299,90" -> 129990, "89" -> 8900. Devolve null se não for um valor válido.
 * Fazemos a conversão com texto, sem multiplicar números decimais
 * (0,1 + 0,2 não é exatamente 0,3 em ponto flutuante).
 */
export function parseReais(input: string): number | null {
  const value = input.replace(/^\s*R\$\s*/, '').trim();
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(value);
  if (!match) return null;
  const reais = Number(match[1]!.replaceAll('.', ''));
  const cents = Number((match[2] ?? '0').padEnd(2, '0'));
  return reais * 100 + cents;
}

/** 12990 -> "129,90" (para preencher um campo de formulário). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
