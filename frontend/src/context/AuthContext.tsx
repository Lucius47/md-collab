import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe, loginUrl, logout as apiLogout } from '../lib/api';
import type { ApiUser } from '../types/api';

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Auth0's hosted login is a full-page flow the backend drives end to end
  // (see backend README) — this is a navigation, not a fetch call.
  const login = useCallback(() => {
    window.location.href = loginUrl;
  }, []);

  const logout = useCallback(async () => {
    try {
      const { logoutUrl } = await apiLogout();
      setUser(null);
      // Also clears the Auth0-side session (single sign-out), then Auth0
      // redirects back to FRONTEND_URL per the backend's config.
      window.location.href = logoutUrl;
    } catch {
      setUser(null);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
