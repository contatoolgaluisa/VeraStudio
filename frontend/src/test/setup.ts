import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { resetFakeAuth } from './fake-supabase';

// Todos os testes usam o Supabase falso (ver fake-supabase.ts).
vi.mock('@/lib/supabase', async () => (await import('./fake-supabase')).fakeSupabaseModule);

// O jsdom (navegador simulado dos testes) não implementa rolagem de página.
window.scrollTo = () => {};

afterEach(() => {
  // Desmonta os componentes renderizados entre um teste e outro.
  cleanup();
  resetFakeAuth();
});
