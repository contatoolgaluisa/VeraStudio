/**
 * Imagens responsivas.
 *
 * O Unsplash redimensiona a foto pela própria URL (?w=640). Assim o navegador
 * escolhe, pelo `srcSet`, o menor arquivo que fica nítido na tela do usuário:
 * um celular não baixa uma foto de 2000px.
 */
const WIDTHS = [320, 480, 640, 960, 1280, 1600];

function isUnsplash(url: string): boolean {
  return url.startsWith('https://images.unsplash.com/');
}

export function imageUrl(url: string, width: number): string {
  if (!isUnsplash(url)) return url;
  return `${url}?auto=format&fit=crop&w=${width}&q=75`;
}

export function imageSrcSet(url: string): string | undefined {
  if (!isUnsplash(url)) return undefined;
  return WIDTHS.map((width) => `${imageUrl(url, width)} ${width}w`).join(', ');
}
