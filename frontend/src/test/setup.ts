import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { cart } from '@/features/cart/store';
import { resetFakeAuth } from './fake-supabase';

// Quanto tempo os `findBy...` e o `waitFor` esperam a tela mudar. O padrão
// (1 s) é curto em máquinas mais lentas: o teste falhava por tempo, não por erro.
configure({ asyncUtilTimeout: 5000 });

// Todos os testes usam o Supabase falso (ver fake-supabase.ts).
vi.mock('@/lib/supabase', async () => (await import('./fake-supabase')).fakeSupabaseModule);

// O jsdom (navegador simulado dos testes) não implementa rolagem de página.
window.scrollTo = () => {};

afterEach(() => {
  // Desmonta os componentes renderizados entre um teste e outro.
  cleanup();
  resetFakeAuth();
  // O carrinho é um estado global salvo no navegador: cada teste começa vazio.
  cart.clear();
  localStorage.clear();
});
