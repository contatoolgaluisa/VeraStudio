import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { type ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from './auth-context';

/**
 * Acompanha a sessão do Supabase e a disponibiliza para o app inteiro.
 * O Supabase avisa de cada mudança (login, logout, token renovado) e o
 * estado aqui acompanha.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setReady(true);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        // Dados de outra pessoa não podem sobrar no cache após o logout.
        queryClient.removeQueries({ queryKey: ['me'] });
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ session, ready, passwordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}
