/**
 * Fotos usadas na interface e seus créditos.
 *
 * Todas vêm do Unsplash, com licença gratuita para uso comercial
 * (https://unsplash.com/license). Mostram roupas reais de outras pessoas e
 * marcas, usadas aqui só como ilustração: não correspondem exatamente aos
 * produtos fictícios da loja.
 *
 * As fotos dos produtos são cadastradas pelo seed do backend
 * (backend/prisma/seed-data.ts). Os créditos delas ficam listados aqui para
 * a página /creditos.
 */

export interface Photo {
  url: string;
  alt: string;
  author: string;
  page: string;
}

function unsplash(id: string, alt: string, author: string, slug: string): Photo {
  return {
    url: `https://images.unsplash.com/${id}`,
    alt,
    author,
    page: `https://unsplash.com/photos/${slug}`,
  };
}

/** Fotos da home. */
export const sitePhotos = {
  hero: unsplash(
    'photo-1613915617430-8ab0fd7c6baf',
    'Pessoa de blazer e calça de alfaiataria com a mão no bolso',
    'Chyntia Juls',
    'person-in-blazer-and-trousers-HlVjI5WmoQY',
  ),
  feminino: unsplash(
    'photo-1668952135120-7d997b1b3778',
    'Mulher usando um casaco longo',
    'Onur Senay',
    'a-woman-in-a-long-coat-Qy8IEssqkYU',
  ),
  masculino: unsplash(
    'photo-1618886614638-80e3c103d31a',
    'Homem de paletó e calça pretos sobre piso de concreto',
    'Mohamad Khosravi',
    'man-in-black-suit-jacket-and-black-pants-standing-on-gray-concrete-floor-during-daytime-vS0Kya7E5V4',
  ),
  acessorios: unsplash(
    'photo-1511405946472-a37e3b5ccd47',
    'Bolsa saco de couro preta',
    'charlesdeluvio',
    'black-leather-bucket-bag-Ghrv69I9mPw',
  ),
} satisfies Record<string, Photo>;

/** Créditos das fotos dos produtos (cadastradas pelo seed). */
export const productPhotoCredits: { product: string; author: string; page: string }[] = [
  {
    product: 'Vestido Midi Linho',
    author: 'Reistor',
    page: 'a-woman-poses-in-a-simple-linen-dress-dziVRZYOFpI',
  },
  {
    product: 'Camisa Oversized Popeline',
    author: 'Margo Evardson',
    page: 'woman-in-white-shirt-with-arms-crossed-outdoors-NK6ZKXJvTVU',
  },
  {
    product: 'Calça Pantalona Alfaiataria',
    author: 'Zulfugar Karimov',
    page: 'woman-in-black-standing-in-front-of-modern-building-uE2nfhvV-9Y',
  },
  {
    product: 'Blusa Tricô Canelado',
    author: 'Tamas Pap',
    page: 'woman-in-white-knit-sweater-XvfquM7g81E',
  },
  {
    product: 'Saia Midi Plissada',
    author: 'engin akyurt',
    page: 'woman-in-white-shirt-and-skirt-O8wizgLm8iE',
  },
  {
    product: 'Camiseta Essential Feminina',
    author: 'Ionela Mat',
    page: 'a-person-wearing-a-white-shirt-qAsXcaY9ZwM',
  },
  {
    product: 'Blazer Alongado',
    author: 'Zulfugar Karimov',
    page: 'a-woman-in-a-black-blazer-touches-her-hair-cXC3o64tT-8',
  },
  {
    product: 'Regata Seda Lavada',
    author: 'Elodie Debard',
    page: 'woman-with-red-hair-in-camisole-ljAA9x4omc4',
  },
  {
    product: 'Camiseta Essential',
    author: 'Haryo Setyadi',
    page: 'white-crew-neck-t-shirt-acn5ERAeSb4',
  },
  {
    product: 'Camisa Linho Manga Longa',
    author: 'Robert Richman',
    page: 'a-blue-shirt-hanging-on-a-white-wall-vcTKFYNZop4',
  },
  {
    product: 'Calça Chino Slim',
    author: 'Redd Francisco',
    page: 'man-wearing-brown-fitted-jeans-and-sneakers-standing-on-road-at-daytime-jC7nVH_Sw8k',
  },
  {
    product: 'Polo Piquet',
    author: 'Hassan OUAJBIR',
    page: 'man-wearing-white-polo-shirt-and-pair-of-red-sneakers-MkmcxwwCepY',
  },
  {
    product: 'Jaqueta Overshirt Sarja',
    author: 'Robert Richman',
    page: 'two-jackets-hanging-on-a-clothes-line-cYRsB4liZPs',
  },
  {
    product: 'Bermuda Alfaiataria',
    author: 'Luiz Rogério Nunes',
    page: 'man-with-tattoos-leaning-against-wall-YWO49A09KwE',
  },
  {
    product: 'Suéter Gola Careca Merino',
    author: 'Majid Akbari',
    page: 'man-in-gray-sweater-standing-near-green-trees-during-daytime-5EK8Q3j920Y',
  },
  { product: 'Camiseta Henley', author: 'Alex Perri', page: 'man-standing-At__EKm5PGE' },
  {
    product: 'Bolsa Tote Couro',
    author: 'Ugluk Potroshitel',
    page: 'brown-leather-handbag-on-white-table-XwjrPFW7xw0',
  },
  {
    product: 'Cinto Couro Fivela Fosca',
    author: 'L S',
    page: 'brown-leather-belt-with-silver-buckle-KAx7H0jxo28',
  },
  {
    product: 'Lenço Seda Estampado',
    author: 'Branislav Rodman',
    page: 'a-white-bust-with-a-colorful-scarf-draped-around-it-XJJRjzkYTiY',
  },
  {
    product: 'Boné Sarja Lavada',
    author: 'Yang Deng',
    page: 'gray-baseball-cap-on-white-surface-2loKxdi6Hmo',
  },
  { product: 'Óculos de Sol Acetato', author: 'Kiran CK', page: 'lSl94SZHRgA' },
  {
    product: 'Carteira Couro Slim',
    author: 'Emil Kalibradov',
    page: 'black-leather-wallet-8WO2s6Yr0Ok',
  },
  {
    product: 'Brincos Argola Dourada',
    author: 'Nataliya Melnychuk',
    page: 'gold-twisted-hoop-earrings-on-stones-5ngCICAXiH0',
  },
  {
    product: 'Mochila Nylon Urbana',
    author: 'Yucel M',
    page: 'black-backpack-on-white-textile-S1mSsru32QM',
  },
].map((credit) => ({ ...credit, page: `https://unsplash.com/photos/${credit.page}` }));
