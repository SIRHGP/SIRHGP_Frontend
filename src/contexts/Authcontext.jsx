// contexts/Authcontext.jsx — version corrigée

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_URL = 'http://localhost:8080/api';

const ROLE_HIERARCHY = ['STAGIAIRE', 'STAFF', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];

const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('sirhgp-token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('sirhgp-token');
  }
};

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sirhgp-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => { setAuthToken(token); }, [token]);

  const loadProfile = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API_URL}/auth/profile`);
      setUser(res.data?.data || res.data);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadProfile(); }, []);

  const login = async (email, motDePasse) => {
    const res  = await axios.post(`${API_URL}/auth/login`, { email, password: motDePasse });
    const data = res.data?.data || res.data;
    if (!data.token) throw new Error('Token manquant');
    setToken(data.token);
    setUser(data.user);
    setAuthToken(data.token);
    return data;
  };

  const logout = async () => {
    try { await axios.post(`${API_URL}/auth/logout`); } catch {}
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  // Niveau numérique du rôle (0 = STAGIAIRE … 4 = SUPER_ADMIN)
  const roleLevel = ROLE_HIERARCHY.indexOf(user?.roleName ?? '');

  // Vérifie si l'utilisateur a au moins le niveau `minRole`
  const hasMinRole = (minRole) =>
    roleLevel >= ROLE_HIERARCHY.indexOf(minRole);

  // Vérifie une permission fine (renvoyée par le backend dans user.permissions)
  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.roleName === 'SUPER_ADMIN') return true;
    return user.permissions?.includes(perm) ?? false;
  };

  // Rétrocompatibilité
  const isAdmin = () => hasMinRole('ADMIN');

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, setUser,
      hasPermission, hasMinRole, isAdmin,
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