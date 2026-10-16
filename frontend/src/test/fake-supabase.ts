import { vi } from 'vitest';

/**
 * Supabase Auth falso para os testes: guarda a sessão em memória e avisa os
 * ouvintes, como o real. Assim os testes não dependem de internet nem de
 * uma conta no Supabase. Cada teste define o que login, cadastro etc. respondem.
 */

export interface FakeSession {
  access_token: string;
  user: { id: string; email: string };
}

type Listener = (event: string, session: FakeSession | null) => void;

const listeners = new Set<Listener>();
let current: FakeSession | null = null;

export const fakeAuth = {
  getSession: vi.fn(async () => ({ data: { session: current }, error: null })),
  onAuthStateChange: vi.fn((listener: Listener) => {
    listeners.add(listener);
    return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
  }),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(async () => {
    setFakeSession(null);
    return { error: null };
  }),
  resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
  updateUser: vi.fn(async () => ({ data: { user: current?.user ?? null }, error: null })),
};

/** Simula login (ou logout, com null) e avisa a aplicação. */
export function setFakeSession(session: FakeSession | null, event?: string) {
  current = session;
  const name = event ?? (session ? 'SIGNED_IN' : 'SIGNED_OUT');
  listeners.forEach((listener) => listener(name, session));
}

export function resetFakeAuth() {
  current = null;
  listeners.clear();
  vi.clearAllMocks();
  // Respostas configuradas por um teste não podem vazar para o próximo.
  fakeAuth.signInWithPassword.mockReset();
  fakeAuth.signUp.mockReset();
}

export const fakeSupabaseModule = { supabase: { auth: fakeAuth } };
