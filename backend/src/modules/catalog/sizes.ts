/**
 * Ordem de exibição dos tamanhos. Sem isso, a ordem alfabética colocaria
 * "G" antes de "M" e "P". Tamanhos desconhecidos vão para o fim.
 */
const LETTER_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
const NUMBER_SIZES = ['34', '36', '38', '40', '42', '44', '46', '48'];
const SIZE_ORDER = [...LETTER_SIZES, ...NUMBER_SIZES, 'U'];

function rank(size: string): number {
  const index = SIZE_ORDER.indexOf(size);
  return index === -1 ? SIZE_ORDER.length : index;
}

export function sortSizes(sizes: Iterable<string>): string[] {
  return [...new Set(sizes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'pt-BR'));
}
