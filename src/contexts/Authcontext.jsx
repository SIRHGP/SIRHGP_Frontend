/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import api, { authApi } from '../Api';

const AuthContext = createContext(null);

const ROLE_HIERARCHY = ['STAGIAIRE', 'SECRETAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];

const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('sirhgp-token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('sirhgp-token');
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sirhgp-token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('sirhgp-token')));

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let active = true;
    const refreshProfile = async () => {
      try {
        const res = await authApi.profile();
        if (!active) return;
        setUser(res.data?.data || res.data);
      } catch (error) {
        if (!active) return;
        setToken(null);
        setUser(null);
        void error;
      } finally {
        if (active) setLoading(false);
      }
    };

    void refreshProfile();
    return () => {
      active = false;
    };
  }, [token]);

  const login = async (email, motDePasse, entrepriseId) => {
    const res = await authApi.login({ email, motDePasse, entrepriseId: entrepriseId ?? null });
    const data = res.data?.data || res.data;
    if (!data.token) throw new Error('Token manquant');
    setToken(data.token);
    setUser(data.user);
    setAuthToken(data.token);
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // session déjà invalide
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
    setLoading(false);
  };

  const roleLevel = ROLE_HIERARCHY.indexOf(user?.roleName ?? '');
  const hasMinRole = (minRole) => roleLevel >= ROLE_HIERARCHY.indexOf(minRole);

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.roleName === 'SUPER_ADMIN') return true;
    return user.permissions?.includes(perm) ?? false;
  };

  const isAdmin = () => hasMinRole('ADMIN');

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      setUser,
      hasPermission,
      hasMinRole,
      isAdmin,
      roleLevel,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
