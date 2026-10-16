import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export interface AuthState {
  /** Sessão atual; null quando ninguém está logado. */
  session: Session | null;
  /** false enquanto a sessão salva ainda está sendo lida (evita "piscar" a tela de login). */
  ready: boolean;
  /** true quando a pessoa chegou pelo link de redefinição de senha. */
  passwordRecovery: boolean;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return context;
}
