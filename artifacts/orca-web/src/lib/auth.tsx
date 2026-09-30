import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type User } from './api';

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string; role: string; language: string }) => Promise<void>;
  demo: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (u: User) => void;
};
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ user: User | null }>('/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const signIn = useCallback(async (email: string, password: string) => setUser((await api<{ user: User }>('/auth/signin', { method: 'POST', body: { email, password } })).user), []);
  const signUp = useCallback(async (input: Parameters<AuthState['signUp']>[0]) => setUser((await api<{ user: User }>('/auth/signup', { method: 'POST', body: input })).user), []);
  const demo = useCallback(async () => setUser((await api<{ user: User }>('/auth/demo', { method: 'POST', body: {} })).user), []);
  const signOut = useCallback(async () => { await api('/auth/signout', { method: 'POST', body: {} }).catch(() => undefined); setUser(null); }, []);
  const value = useMemo(() => ({ user, loading, signIn, signUp, demo, signOut, setUser }), [user, loading, signIn, signUp, demo, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
