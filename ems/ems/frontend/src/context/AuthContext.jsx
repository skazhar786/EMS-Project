import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { TOKEN_KEY } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  // True only while we are restoring a saved session on first load.
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setEmployee(null);
  }, []);

  // Persistent login: restore the session from the saved token.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return undefined;
    let cancelled = false;

    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setUser(res.data.data.user);
        setEmployee(res.data.data.employee);
      })
      .catch(() => {
        // A 401 already removed the token (see api.js). Any other error (e.g. server down)
        // just leaves the user logged out for now without destroying the saved token.
        if (!cancelled) {
          setUser(null);
          setEmployee(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // api.js fires this when any request returns 401 (expired/invalid token).
  useEffect(() => {
    const onForcedLogout = () => {
      setUser(null);
      setEmployee(null);
      toast.error('Your session has expired. Please log in again.');
    };
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    localStorage.removeItem(TOKEN_KEY); // never send a stale token with a login attempt
    const res = await api.post('/auth/login', { email, password });
    const { token, user: u, employee: e } = res.data.data;
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
    setEmployee(e);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout must always succeed locally, even if the server is unreachable.
    }
    clearSession();
    toast.success('Logged out successfully');
  }, [clearSession]);

  // Re-fetch the current user (used after profile changes in later phases).
  const refreshUser = useCallback(async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.data.user);
    setEmployee(res.data.data.employee);
  }, []);

  const value = useMemo(
    () => ({ user, employee, loading, isAuthenticated: !!user, login, logout, refreshUser }),
    [user, employee, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
