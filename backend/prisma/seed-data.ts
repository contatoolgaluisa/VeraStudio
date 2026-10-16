/**
 * Dados DEMONSTRATIVOS do catálogo (projeto de portfólio).
 *
 * Nomes, descrições, preços e estoques são fictícios. Não há avaliações,
 * números de vendas nem depoimentos. As fotos entram na fase de interface.
 *
 * Preços em centavos: 12900 = R$ 129,00.
 */

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  code: string; // prefixo dos SKUs
}

export interface SeedColor {
  name: string;
  hex: string;
}

export interface SeedProduct {
  name: string;
  slug: string;
  category: string; // slug da categoria
  description: string;
  priceCents: number;
  compareAtPriceCents?: number;
  isNew?: boolean;
  colors: SeedColor[];
  sizes: string[];
}

export const categories: SeedCategory[] = [
  {
    slug: 'feminino',
    name: 'Feminino',
    description: 'Peças contemporâneas de corte preciso e tecidos naturais.',
    code: 'F',
  },
  {
    slug: 'masculino',
    name: 'Masculino',
    description: 'Básicos elevados e alfaiataria descomplicada.',
    code: 'M',
  },
  {
    slug: 'acessorios',
    name: 'Acessórios',
    description: 'Detalhes em couro, seda e metal para completar o visual.',
    code: 'A',
  },
];

// Paleta única, para que a mesma cor tenha o mesmo nome e tom em todo o catálogo
// (isso também faz o filtro por cor funcionar de forma consistente).
const c = {
  preto: { name: 'Preto', hex: '#151515' },
  branco: { name: 'Branco', hex: '#F7F6F2' },
  offWhite: { name: 'Off-white', hex: '#EDE8DE' },
  areia: { name: 'Areia', hex: '#D8C8A8' },
  caramelo: { name: 'Caramelo', hex: '#B07A4F' },
  terracota: { name: 'Terracota', hex: '#A9583E' },
  oliva: { name: 'Verde Oliva', hex: '#6B6B47' },
  marinho: { name: 'Azul Marinho', hex: '#22304A' },
  azulCeu: { name: 'Azul Céu', hex: '#A9C3D9' },
  cinza: { name: 'Cinza Mescla', hex: '#A7A6A2' },
  grafite: { name: 'Grafite', hex: '#4A4A4A' },
  caqui: { name: 'Cáqui', hex: '#B9A57F' },
  tartaruga: { name: 'Tartaruga', hex: '#5A3A22' },
  dourado: { name: 'Dourado', hex: '#C9A54C' },
} satisfies Record<string, SeedColor>;

const roupa = ['P', 'M', 'G', 'GG'];
const roupaCurta = ['P', 'M', 'G'];
const numeracao = ['38', '40', '42', '44'];
const unico = ['U'];

export const products: SeedProduct[] = [
  // ---------------------------------------------------------------- Feminino
  {
    name: 'Vestido Midi Linho',
    slug: 'vestido-midi-linho',
    category: 'feminino',
    description:
      'Vestido midi em linho com alças finas e caimento fluido. Fenda lateral discreta e forro em algodão. Composição: 100% linho.',
    priceCents: 38900,
    isNew: true,
    colors: [c.areia, c.preto],
    sizes: roupa,
  },
  {
    name: 'Camisa Oversized Popeline',
    slug: 'camisa-oversized-popeline',
    category: 'feminino',
    description:
      'Camisa ampla em popeline de algodão, com ombro caído e punhos largos. Funciona aberta, por cima de uma regata, ou abotoada. Composição: 100% algodão.',
    priceCents: 23900,
    compareAtPriceCents: 28900,
    colors: [c.branco, c.azulCeu],
    sizes: roupaCurta,
  },
  {
    name: 'Calça Pantalona Alfaiataria',
    slug: 'calca-pantalona-alfaiataria',
    category: 'feminino',
    description:
      'Pantalona de cintura alta com pregas frontais e barra larga. Tecido com leve elasticidade para mais conforto. Composição: 68% poliéster, 28% viscose, 4% elastano.',
    priceCents: 35900,
    colors: [c.preto, c.offWhite],
    sizes: roupa,
  },
  {
    name: 'Blusa Tricô Canelado',
    slug: 'blusa-trico-canelado',
    category: 'feminino',
    description:
      'Blusa de tricô canelado com gola alta e modelagem justa. Leve o bastante para a meia-estação. Composição: 70% viscose, 30% poliamida.',
    priceCents: 21900,
    isNew: true,
    colors: [c.caramelo, c.cinza],
    sizes: roupaCurta,
  },
  {
    name: 'Saia Midi Plissada',
    slug: 'saia-midi-plissada',
    category: 'feminino',
    description:
      'Saia midi com plissado permanente e cós com elástico embutido. Movimento leve ao caminhar. Composição: 100% poliéster.',
    priceCents: 27900,
    compareAtPriceCents: 34900,
    colors: [c.oliva, c.preto],
    sizes: roupaCurta,
  },
  {
    name: 'Camiseta Essential Feminina',
    slug: 'camiseta-essential-feminina',
    category: 'feminino',
    description:
      'Camiseta de malha penteada com gola careca e modelagem reta. O básico que combina com tudo. Composição: 100% algodão.',
    priceCents: 12900,
    colors: [c.preto, c.branco],
    sizes: roupa,
  },
  {
    name: 'Blazer Alongado',
    slug: 'blazer-alongado',
    category: 'feminino',
    description:
      'Blazer de comprimento alongado com ombros estruturados e fechamento de um botão. Forrado. Composição: 63% poliéster, 33% viscose, 4% elastano.',
    priceCents: 45900,
    isNew: true,
    colors: [c.preto, c.grafite],
    sizes: roupaCurta,
  },
  {
    name: 'Regata Seda Lavada',
    slug: 'regata-seda-lavada',
    category: 'feminino',
    description:
      'Regata de toque acetinado e acabamento lavado, com decote V suave. Composição: 100% viscose.',
    priceCents: 18900,
    compareAtPriceCents: 22900,
    colors: [c.offWhite, c.terracota],
    sizes: roupaCurta,
  },

  // --------------------------------------------------------------- Masculino
  {
    name: 'Camiseta Essential',
    slug: 'camiseta-essential',
    category: 'masculino',
    description:
      'Camiseta de malha penteada encorpada, com gola reforçada que não deforma. Composição: 100% algodão.',
    priceCents: 12900,
    colors: [c.preto, c.branco],
    sizes: roupa,
  },
  {
    name: 'Camisa Linho Manga Longa',
    slug: 'camisa-linho-manga-longa',
    category: 'masculino',
    description:
      'Camisa de linho com gola padre e bolso frontal. Fresca para os dias quentes. Composição: 55% linho, 45% algodão.',
    priceCents: 28900,
    isNew: true,
    colors: [c.areia, c.marinho],
    sizes: roupa,
  },
  {
    name: 'Calça Chino Slim',
    slug: 'calca-chino-slim',
    category: 'masculino',
    description:
      'Chino de sarja leve com modelagem slim e barra italiana. Composição: 98% algodão, 2% elastano.',
    priceCents: 29900,
    compareAtPriceCents: 34900,
    colors: [c.caqui, c.marinho],
    sizes: numeracao,
  },
  {
    name: 'Polo Piquet',
    slug: 'polo-piquet',
    category: 'masculino',
    description:
      'Polo em piquet com carcela de dois botões e punhos canelados. Composição: 100% algodão.',
    priceCents: 17900,
    colors: [c.branco, c.oliva],
    sizes: roupa,
  },
  {
    name: 'Jaqueta Overshirt Sarja',
    slug: 'jaqueta-overshirt-sarja',
    category: 'masculino',
    description:
      'Overshirt de sarja pesada com bolsos chapados e botões de pressão. Usada como camisa ou como jaqueta leve. Composição: 100% algodão.',
    priceCents: 42900,
    isNew: true,
    colors: [c.oliva, c.preto],
    sizes: roupa,
  },
  {
    name: 'Bermuda Alfaiataria',
    slug: 'bermuda-alfaiataria',
    category: 'masculino',
    description:
      'Bermuda de alfaiataria com pregas e cós com passantes. Comprimento acima do joelho. Composição: 70% poliéster, 30% viscose.',
    priceCents: 25900,
    compareAtPriceCents: 29900,
    colors: [c.areia, c.preto],
    sizes: numeracao,
  },
  {
    name: 'Suéter Gola Careca Merino',
    slug: 'sueter-gola-careca-merino',
    category: 'masculino',
    description:
      'Suéter de tricô fino em lã merino, macio e respirável. Composição: 100% lã merino.',
    priceCents: 38900,
    colors: [c.cinza, c.marinho],
    sizes: roupaCurta,
  },
  {
    name: 'Camiseta Henley',
    slug: 'camiseta-henley',
    category: 'masculino',
    description:
      'Camiseta de manga curta com carcela de três botões, em malha flamê. Composição: 100% algodão.',
    priceCents: 15900,
    colors: [c.offWhite, c.grafite],
    sizes: roupa,
  },

  // -------------------------------------------------------------- Acessórios
  {
    name: 'Bolsa Tote Couro',
    slug: 'bolsa-tote-couro',
    category: 'acessorios',
    description:
      'Tote estruturada em couro com alças de ombro e bolso interno com zíper. Cabe um notebook de 13 polegadas.',
    priceCents: 34900,
    isNew: true,
    colors: [c.caramelo, c.preto],
    sizes: unico,
  },
  {
    name: 'Cinto Couro Fivela Fosca',
    slug: 'cinto-couro-fivela-fosca',
    category: 'acessorios',
    description: 'Cinto de couro com 3 cm de largura e fivela metálica de acabamento fosco.',
    priceCents: 14900,
    colors: [c.preto, c.caramelo],
    sizes: roupaCurta,
  },
  {
    name: 'Lenço Seda Estampado',
    slug: 'lenco-seda-estampado',
    category: 'acessorios',
    description:
      'Lenço quadrado com estampa geométrica exclusiva. Pode ser usado no pescoço, no cabelo ou na alça da bolsa. 70 x 70 cm. Composição: 100% seda.',
    priceCents: 12900,
    compareAtPriceCents: 15900,
    colors: [c.terracota, c.azulCeu],
    sizes: unico,
  },
  {
    name: 'Boné Sarja Lavada',
    slug: 'bone-sarja-lavada',
    category: 'acessorios',
    description: 'Boné de seis gomos em sarja lavada, com regulagem traseira em metal.',
    priceCents: 8900,
    colors: [c.preto, c.areia],
    sizes: unico,
  },
  {
    name: 'Óculos de Sol Acetato',
    slug: 'oculos-de-sol-acetato',
    category: 'acessorios',
    description:
      'Armação de acetato com formato quadrado suave e lentes com proteção UV400. Acompanha estojo.',
    priceCents: 29900,
    isNew: true,
    colors: [c.preto, c.tartaruga],
    sizes: unico,
  },
  {
    name: 'Carteira Couro Slim',
    slug: 'carteira-couro-slim',
    category: 'acessorios',
    description:
      'Carteira fina de couro com seis compartimentos para cartões e divisória para notas.',
    priceCents: 11900,
    colors: [c.preto, c.caramelo],
    sizes: unico,
  },
  {
    name: 'Brincos Argola Dourada',
    slug: 'brincos-argola-dourada',
    category: 'acessorios',
    description: 'Argolas médias em latão com banho dourado e fecho de pressão. Diâmetro de 3 cm.',
    priceCents: 9900,
    compareAtPriceCents: 12900,
    colors: [c.dourado],
    sizes: unico,
  },
  {
    name: 'Mochila Nylon Urbana',
    slug: 'mochila-nylon-urbana',
    category: 'acessorios',
    description:
      'Mochila em nylon resistente à água, com compartimento acolchoado para notebook e bolso frontal.',
    priceCents: 27900,
    colors: [c.preto, c.grafite],
    sizes: unico,
  },
];

// Estoque determinístico (sempre o mesmo a cada seed), com alguns zeros para
// demonstrar "esgotado" e alguns valores baixos para o alerta de estoque baixo.
const STOCK_PATTERN = [8, 12, 10, 5, 0, 3, 15, 6, 2, 9];

export function stockFor(productIndex: number, colorIndex: number, sizeIndex: number): number {
  const i = productIndex * 7 + colorIndex * 3 + sizeIndex;
  return STOCK_PATTERN[i % STOCK_PATTERN.length] ?? 0;
}

/** Ex.: VS-F01-PRE-M (loja, categoria+número, 3 letras da cor, tamanho). */
export function skuFor(categoryCode: string, number: number, color: string, size: string): string {
  const colorCode = color
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  return `VS-${categoryCode}${String(number).padStart(2, '0')}-${colorCode}-${size}`;
}
