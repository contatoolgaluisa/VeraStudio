import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeProduct, makeProductDetail, mockApi, productList } from '@/test/fixtures';
import { renderRoute } from '@/test/render';

const detail = makeProductDetail();
const handlers = {
  '/catalog/products/camiseta-teste': () => ({ data: detail }),
  '/catalog/products': () =>
    productList([
      makeProduct({ id: detail.id, slug: detail.slug, name: detail.name }),
      makeProduct({ id: 'outro', slug: 'outro-produto', name: 'Outro Produto' }),
    ]),
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('página do produto', () => {
  it('mostra nome, preço, cores e caminho de navegação', async () => {
    mockApi(handlers);
    renderRoute('/produto/camiseta-teste');

    expect(await screen.findByRole('heading', { level: 1, name: 'Camiseta Teste' })).toBeTruthy();
    expect(screen.getByText(/R\$\s?129,00/)).toBeTruthy();
    const breadcrumb = screen.getByRole('navigation', { name: 'Você está em' });
    expect(within(breadcrumb).getByRole('link', { name: 'Feminino' })).toBeTruthy();
    // Areia está esgotada em todos os tamanhos: a primeira cor selecionada é Branco.
    expect(screen.getByRole('radio', { name: 'Branco' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: 'Areia (esgotada)' })).toBeTruthy();
  });

  it('bloqueia tamanhos esgotados e inexistentes na cor escolhida', async () => {
    mockApi(handlers);
    renderRoute('/produto/camiseta-teste?cor=Preto');

    const sizeP = await screen.findByRole('radio', { name: 'P' });
    expect(sizeP).toHaveProperty('disabled', false);
    expect(screen.getByRole('radio', { name: 'M (esgotado)' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('radio', { name: 'G (indisponível nesta cor)' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('limita a quantidade ao estoque da variação escolhida', async () => {
    mockApi(handlers);
    renderRoute('/produto/camiseta-teste?cor=Preto');

    fireEvent.click(await screen.findByRole('radio', { name: 'P' }));

    const quantity = screen.getByLabelText('Quantidade');
    expect(within(quantity).getAllByRole('option').map((o) => o.textContent)).toEqual(['1', '2']);
    expect(screen.getByText('Restam 2 unidades neste tamanho.')).toBeTruthy();
    expect(screen.getByText('Código: T-PRE-P')).toBeTruthy();
  });

  it('troca de cor pela URL e limpa um tamanho que não existe na nova cor', async () => {
    mockApi(handlers);
    const router = renderRoute('/produto/camiseta-teste?cor=Preto');

    fireEvent.click(await screen.findByRole('radio', { name: 'P' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Branco' }));

    await waitFor(() => expect(router.state.location.search).toBe('?cor=Branco'));
    expect(screen.getByRole('radio', { name: 'P (indisponível nesta cor)' })).toHaveProperty(
      'checked',
      false,
    );
    expect(screen.getByText(/Escolha um tamanho/)).toBeTruthy();
  });

  it('deixa claro que o carrinho ainda não existe, sem fingir a compra', async () => {
    mockApi(handlers);
    renderRoute('/produto/camiseta-teste');

    const button = await screen.findByRole('button', { name: 'Adicionar ao carrinho' });
    expect(button).toHaveProperty('disabled', true);
    expect(screen.getByText(/O carrinho de compras chega na Fase 6/)).toBeTruthy();
  });

  it('sugere outros produtos da categoria, sem repetir o atual', async () => {
    mockApi(handlers);
    renderRoute('/produto/camiseta-teste');

    const related = await screen.findByRole('region', { name: 'Mais em Feminino' });
    expect(within(related).getByRole('link', { name: 'Outro Produto' })).toBeTruthy();
    expect(within(related).queryByRole('link', { name: 'Camiseta Teste' })).toBeNull();
  });

  it('responde 404 para produto inexistente', async () => {
    mockApi(handlers);
    renderRoute('/produto/nao-existe');

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeTruthy();
  });
});

describe('páginas institucionais', () => {
  it.each([
    ['/contato', 'Contato'],
    ['/entrega', 'Entrega'],
    ['/trocas-e-devolucoes', 'Trocas e devoluções'],
    ['/privacidade', 'Política de privacidade'],
  ])('%s aparece identificada como conteúdo demonstrativo', (path, title) => {
    mockApi(handlers);
    renderRoute(path);

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy();
    expect(screen.getByText('Conteúdo demonstrativo.')).toBeTruthy();
  });
});
