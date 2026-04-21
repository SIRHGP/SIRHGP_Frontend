import axios from 'axios';

const BASE = 'http://localhost:8080/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sirhgp-token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sirhgp-token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get('/auth/profile'),
  changePassword: (id, params) => api.patch(`/employers/${id}/change-password`, null, { params }),
};

// Employers
export const employerApi = {
  getAll: (params) => api.get('/employers', { params }),
  getById: (id) => api.get(`/employers/${id}`),
  getStats: (id) => api.get(`/employers/${id}/stats`),
  create: (data) => api.post('/employers', data),
  update: (id, data) => api.put(`/employers/${id}`, data),
  toggleActif: (id) => api.patch(`/employers/${id}/toggle-actif`),
  delete: (id) => api.delete(`/employers/${id}`),
};

// Rôles
export const roleApi = {
  getAll: (params) => api.get('/roles', { params }),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  addPermission: (roleId, permId) => api.post(`/roles/${roleId}/permissions/${permId}`),
  removePermission: (roleId, permId) => api.delete(`/roles/${roleId}/permissions/${permId}`),
  setPermissions: (roleId, ids) => api.put(`/roles/${roleId}/permissions`, ids),
  delete: (id) => api.delete(`/roles/${id}`),
};

// Permissions
export const permissionApi = {
  getAll: (params) => api.get('/permissions', { params }),
  getById: (id) => api.get(`/permissions/${id}`),
  create: (data) => api.post('/permissions', data),
  update: (id, data) => api.put(`/permissions/${id}`, data),
  addAction: (permId, actionId) => api.post(`/permissions/${permId}/actions/${actionId}`),
  removeAction: (permId, actionId) => api.delete(`/permissions/${permId}/actions/${actionId}`),
  setActions: (permId, ids) => api.put(`/permissions/${permId}/actions`, ids),
  delete: (id) => api.delete(`/permissions/${id}`),
};

// Actions
export const actionApi = {
  getAll: (params) => api.get('/actions', { params }),
  getById: (id) => api.get(`/actions/${id}`),
  create: (data) => api.post('/actions', data),
  update: (id, data) => api.put(`/actions/${id}`, data),
  delete: (id) => api.delete(`/actions/${id}`),
};

// Départements
export const departementApi = {
  getAll: (params) => api.get('/departements', { params }),
  getById: (id) => api.get(`/departements/${id}`),
  create: (data) => api.post('/departements', data),
  update: (id, data) => api.put(`/departements/${id}`, data),
  addPoste: (deptId, posteId) => api.post(`/departements/${deptId}/postes/${posteId}`),
  removePoste: (deptId, posteId) => api.delete(`/departements/${deptId}/postes/${posteId}`),
  delete: (id) => api.delete(`/departements/${id}`),
};

// Postes
export const posteApi = {
  getAll: (params) => api.get('/postes', { params }),
  getById: (id) => api.get(`/postes/${id}`),
  getByDepartement: (deptId) => api.get(`/postes/by-departement/${deptId}`),
  create: (data) => api.post('/postes', data),
  update: (id, data) => api.put(`/postes/${id}`, data),
  addPermission: (posteId, permId) => api.post(`/postes/${posteId}/permissions/${permId}`),
  removePermission: (posteId, permId) => api.delete(`/postes/${posteId}/permissions/${permId}`),
  setPermissions: (posteId, ids) => api.put(`/postes/${posteId}/permissions`, ids),
  assignDepartement: (posteId, deptId) => api.post(`/postes/${posteId}/assign-departement/${deptId}`),
  removeDepartement: (posteId) => api.delete(`/postes/${posteId}/remove-departement`),
  delete: (id) => api.delete(`/postes/${id}`),
};

// Projets
export const projetApi = {
  getAll: (params) => api.get('/projets', { params }),
  getById: (id) => api.get(`/projets/${id}`),
  getEnRetard: () => api.get('/projets/en-retard'),
  getByDepartement: (deptId) => api.get(`/projets/by-departement/${deptId}`),
  getDashboardGlobal: () => api.get('/projets/dashboard/global'),
  getDashboard: (id) => api.get(`/projets/${id}/dashboard`),
  getStatsByStatut: () => api.get('/projets/statistiques/statut'),
  getStatsBudget: () => api.get('/projets/statistiques/budget'),
  getFactures: (id) => api.get(`/projets/${id}/factures`),
  create: (data) => api.post('/projets', data),
  update: (id, data) => api.put(`/projets/${id}`, data),
  changeStatut: (id, statut) => api.patch(`/projets/${id}/statut`, null, { params: { statut } }),
  addMembre: (projetId, employerId) => api.post(`/projets/${projetId}/membres/${employerId}`),
  removeMembre: (projetId, employerId) => api.delete(`/projets/${projetId}/membres/${employerId}`),
  addDepartement: (projetId, deptId) => api.post(`/projets/${projetId}/departements/${deptId}`),
  removeDepartement: (projetId, deptId) => api.delete(`/projets/${projetId}/departements/${deptId}`),
  delete: (id) => api.delete(`/projets/${id}`),
};

// Tâches
export const tacheApi = {
  getAll: (params) => api.get('/taches', { params }),
  getById: (id) => api.get(`/taches/${id}`),
  getByProjet: (projetId) => api.get(`/taches/projet/${projetId}`),
  getByAssignee: (employerId) => api.get(`/taches/assignee/${employerId}`),
  create: (data) => api.post('/taches', data),
  update: (id, data) => api.put(`/taches/${id}`, data),
  changeStatut: (id, statut) => api.patch(`/taches/${id}/statut`, null, { params: { statut } }),
  delete: (id) => api.delete(`/taches/${id}`),
};

// Commentaires
export const commentaireApi = {
  getByTache: (tacheId) => api.get(`/commentaires/tache/${tacheId}`),
  getById: (id) => api.get(`/commentaires/${id}`),
  create: (data) => api.post('/commentaires', data),
  update: (id, contenu) => api.put(`/commentaires/${id}`, contenu, { headers: { 'Content-Type': 'text/plain' } }),
  delete: (id) => api.delete(`/commentaires/${id}`),
  deleteByTache: (tacheId) => api.delete(`/commentaires/tache/${tacheId}`),
};

// Factures
export const factureApi = {
  getAll: (params) => api.get('/factures', { params }),
  getById: (id) => api.get(`/factures/${id}`),
  getByProjet: (projetId) => api.get(`/factures/by-projet/${projetId}`),
  create: (data) => api.post('/factures', data),
  update: (id, data) => api.put(`/factures/${id}`, data),
  changeStatut: (id, statut) => api.patch(`/factures/${id}/statut`, null, { params: { statut } }),
  paiement: (id, montant) => api.patch(`/factures/${id}/paiement`, null, { params: { montant } }),
  delete: (id) => api.delete(`/factures/${id}`),
};

// Événements
export const evenementApi = {
  getAll: (params) => api.get('/evenements', { params }),
  getById: (id) => api.get(`/evenements/${id}`),
  getByParticipant: (id) => api.get(`/evenements/participant/${id}`),
  getByProjet: (projetId) => api.get(`/evenements/projet/${projetId}`),
  getByRange: (start, end) => api.get('/evenements/range', { params: { start, end } }),
  create: (data) => api.post('/evenements', data),
  update: (id, data) => api.put(`/evenements/${id}`, data),
  delete: (id) => api.delete(`/evenements/${id}`),
};

// Documents
export const documentApi = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  getByEmployer: (id) => api.get(`/documents/employer/${id}`),
  getByProjet: (projetId) => api.get(`/documents/projet/${projetId}`),
  upload: (formData) => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  download: (id) => api.get(`/documents/download/${id}`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}`),
};

export default api;