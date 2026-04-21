// hooks/useApi.js
import { useState, useEffect, useCallback, useRef } from 'react';

// ── useApi : fetch standard ──────────────────────────────────────────────────
export function useApi(apiFn, deps = [], immediate = true) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      const d = res.data?.data !== undefined ? res.data.data : res.data;
      setData(d);
      return d;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erreur');
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => { if (immediate) fetch(); }, []); // eslint-disable-line

  return { data, loading, error, refetch: fetch };
}

// ── useMutation : POST/PUT/DELETE ────────────────────────────────────────────
export function useMutation(apiFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      return res.data?.data !== undefined ? res.data.data : res.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erreur';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  return { mutate, loading, error };
}

// ── usePaginated : pagination automatique ───────────────────────────────────
export function usePaginated(apiFn, initialPage = 0, size = 20) {
  const [page, setPage]       = useState(initialPage);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async (p = page, extraParams = {}) => {
    setLoading(true);
    try {
      const res = await apiFn({ page: p, size, ...extraParams });
      const d = res.data?.data !== undefined ? res.data.data : res.data;
      setData(d);
      return d;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, size]); // eslint-disable-line

  useEffect(() => { fetch(page); }, [page]); // eslint-disable-line

  return { data, loading, error, page, setPage, refetch: fetch };
}

// ── useRoleData : fetch filtré selon le rôle de l'utilisateur ────────────────
// Appelle automatiquement le bon endpoint selon le rôle.
// adminFn    → SUPER_ADMIN / ADMIN : voit tout
// managerFn  → MANAGER : voit son département
// selfFn     → STAFF / STAGIAIRE : voit seulement ses données
export function useRoleData({ user, adminFn, managerFn, selfFn, params = {} }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let res;
      const role = user.roleName;

      if ((role === 'SUPER_ADMIN' || role === 'ADMIN') && adminFn) {
        res = await adminFn(params);
      } else if (role === 'MANAGER' && managerFn) {
        res = await managerFn({ ...params, departementId: user.departementId });
      } else if (selfFn) {
        res = await selfFn({ ...params, employerId: user.id });
      } else if (adminFn) {
        // fallback
        res = await adminFn(params);
      }

      if (res) {
        const d = res.data?.data !== undefined ? res.data.data : res.data;
        setData(Array.isArray(d) ? d : d?.content || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.roleName, JSON.stringify(params)]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}