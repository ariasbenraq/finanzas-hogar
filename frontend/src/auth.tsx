import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setOnUnauthorized } from './api';

interface AuthState {
  email: string | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la página, pregunta al servidor si ya hay una sesión activa (cookie).
  useEffect(() => {
    api
      .me()
      .then((u) => setEmail(u.email))
      .catch(() => setEmail(null))
      .finally(() => setCargando(false));
  }, []);

  // Si cualquier petición protegida devuelve 401, vuelve a la pantalla de login.
  useEffect(() => {
    setOnUnauthorized(() => setEmail(null));
    return () => setOnUnauthorized(null);
  }, []);

  const login = useCallback(async (e: string, p: string) => {
    const u = await api.login(e, p);
    setEmail(u.email);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setEmail(null);
    }
  }, []);

  const value = useMemo(() => ({ email, cargando, login, logout }), [email, cargando, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
