import { describe, expect, it } from 'vitest';
import { formatPrice, pluralize } from './format';
import { imageSrcSet, imageUrl } from './images';

describe('formatPrice', () => {
  it('converte centavos em reais no formato brasileiro', () => {
    // O Intl usa um espaço especial (não separável) depois de "R$".
    expect(formatPrice(12990).replace(/\s/g, ' ')).toBe('R$ 129,90');
    expect(formatPrice(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
});

describe('pluralize', () => {
  it('usa singular apenas para 1', () => {
    expect(pluralize(1, 'produto', 'produtos')).toBe('1 produto');
    expect(pluralize(0, 'produto', 'produtos')).toBe('0 produtos');
  });
});

describe('imagens responsivas', () => {
  const unsplash = 'https://images.unsplash.com/photo-123';

  it('pede ao Unsplash a largura certa', () => {
    expect(imageUrl(unsplash, 640)).toBe(`${unsplash}?auto=format&fit=crop&w=640&q=75`);
    expect(imageSrcSet(unsplash)).toContain(`${unsplash}?auto=format&fit=crop&w=320&q=75 320w`);
  });

  it('mantém outras URLs como estão', () => {
    expect(imageUrl('https://exemplo.com/a.jpg', 640)).toBe('https://exemplo.com/a.jpg');
    expect(imageSrcSet('https://exemplo.com/a.jpg')).toBeUndefined();
  });
});
