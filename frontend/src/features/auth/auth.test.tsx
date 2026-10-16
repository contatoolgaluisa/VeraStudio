import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeAuth, setFakeSession } from '@/test/fake-supabase';
import { mockApi } from '@/test/fixtures';
import { renderRoute } from '@/test/render';

const anaSession = {
  access_token: 'token-da-ana',
  user: { id: 'u-ana', email: 'ana@exemplo.com' },
};

function profile(role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
  return {
    data: {
      id: 'u-ana',
      email: 'ana@exemplo.com',
      name: 'Ana Souza',
      role,
      createdAt: '2026-10-01T12:00:00.000Z',
    },
  };
}

/** API falsa: /me só responde com o token certo, como o backend real. */
function mockMe(role: 'CUSTOMER' | 'ADMIN' = 'CUSTOMER') {
  return mockApi({
    '/me': (_url, init) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (auth !== 'Bearer token-da-ana') {
        return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 });
      }
      return profile(role);
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('páginas protegidas', () => {
  it('mandam para o login e guardam o caminho de volta', async () => {
    mockMe();
    const router = renderRoute('/conta');

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/entrar');
    expect(router.state.location.search).toBe('?redirect=%2Fconta');
  });

  it('o painel mostra "acesso restrito" para clientes', async () => {
    mockMe('CUSTOMER');
    setFakeSession(anaSession);
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Acesso restrito' })).toBeTruthy();
  });

  it('o painel abre para administradores', async () => {
    mockMe('ADMIN');
    setFakeSession(anaSession);
    renderRoute('/admin');

    expect(await screen.findByRole('navigation', { name: 'Painel administrativo' })).toBeTruthy();
  });
});

describe('login', () => {
  it('valida os campos antes de chamar o Supabase', async () => {
    mockMe();
    renderRoute('/entrar');

    fireEvent.click(await screen.findByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido')).toBeTruthy();
    expect(screen.getByText('Informe a senha')).toBeTruthy();
    expect(screen.getByLabelText('E-mail').getAttribute('aria-invalid')).toBe('true');
    expect(fakeAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('mostra mensagem clara para e-mail ou senha errados', async () => {
    mockMe();
    fakeAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    renderRoute('/entrar');

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'ana@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'E-mail ou senha incorretos.',
    );
  });

  it('entra e volta para a página pedida, que usa o token na API', async () => {
    const fetchMock = mockMe();
    fakeAuth.signInWithPassword.mockImplementation(async () => {
      setFakeSession(anaSession);
      return { data: { session: anaSession }, error: null };
    });
    const router = renderRoute('/entrar?redirect=%2Fconta');

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'ana@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-certa-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Minha conta' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/conta');
    expect(screen.getByLabelText('Nome')).toHaveProperty('value', 'Ana Souza');
    expect(fakeAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      password: 'senha-certa-123',
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('ignora redirecionamento para outro site', async () => {
    mockMe();
    setFakeSession(anaSession);
    const router = renderRoute('/entrar?redirect=%2F%2Fsite-malicioso.example');

    await waitFor(() => expect(router.state.location.pathname).toBe('/conta'));
  });
});

describe('cadastro', () => {
  it('confere se as senhas são iguais', async () => {
    mockMe();
    renderRoute('/cadastro');

    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } });
    fireEvent.change(screen.getByLabelText('Confirme a senha'), {
      target: { value: 'outra-senha-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('As senhas não são iguais')).toBeTruthy();
    expect(fakeAuth.signUp).not.toHaveBeenCalled();
  });

  it('avisa para confirmar o e-mail quando o Supabase exige confirmação', async () => {
    mockMe();
    fakeAuth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    renderRoute('/cadastro');

    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: ' Ana Souza ' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-1' } });
    fireEvent.change(screen.getByLabelText('Confirme a senha'), {
      target: { value: 'senha-forte-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeTruthy();
    const [args] = fakeAuth.signUp.mock.calls[0] as [
      { email: string; options: { data: Record<string, unknown> } },
    ];
    expect(args.email).toBe('ana@exemplo.com');
    // Só o nome vai nos metadados: nenhum papel é enviado pelo navegador.
    expect(args.options.data).toEqual({ name: 'Ana Souza' });
  });
});

describe('senha', () => {
  it('a recuperação mostra a mesma resposta exista a conta ou não', async () => {
    mockMe();
    renderRoute('/recuperar-senha');

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'quem@exemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText(/Se existir uma conta com quem@exemplo.com/)).toBeTruthy();
    expect(fakeAuth.resetPasswordForEmail).toHaveBeenCalledWith('quem@exemplo.com', {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
  });

  it('a redefinição sem um link válido explica o que fazer', async () => {
    mockMe();
    renderRoute('/redefinir-senha');

    expect(await screen.findByRole('heading', { name: 'Link inválido ou expirado' })).toBeTruthy();
  });
});

describe('logout', () => {
  it('sai da conta e volta a exigir login', async () => {
    mockMe();
    setFakeSession(anaSession);
    renderRoute('/conta');

    fireEvent.click(await screen.findByRole('button', { name: 'Sair da conta' }));

    expect(fakeAuth.signOut).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeTruthy();
  });

  it('o cabeçalho troca "Entrar" por "Minha conta" após o login', async () => {
    mockMe();
    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Entrar' })).toBeTruthy();
    act(() => setFakeSession(anaSession));
    expect(await screen.findByRole('link', { name: 'Minha conta' })).toBeTruthy();
  });
});
