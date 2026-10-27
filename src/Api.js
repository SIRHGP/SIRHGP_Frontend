import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: BASE });

export async function fetchAllPages(fetchPage, size = 100) {
  const first = await fetchPage({ page: 0, size });
  let body = first?.data?.data ?? first?.data;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) body = body.data;
  if (Array.isArray(body)) return body;
  const content = [...(body?.content || [])];
  const totalPages = Number(body?.totalPages ?? 1);
  for (let page = 1; page < totalPages; page += 1) {
    const response = await fetchPage({ page, size });
    let pageBody = response?.data?.data ?? response?.data;
    if (pageBody && typeof pageBody === 'object' && 'success' in pageBody && 'data' in pageBody) pageBody = pageBody.data;
    content.push(...(Array.isArray(pageBody) ? pageBody : pageBody?.content || []));
  }
  return content;
}

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('sirhgp-token');
  if (token) {
    cfg.headers = {
      ...cfg.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sirhgp-token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get('/auth/profile'),
  changePassword: (id, params) => api.patch(`/employers/${id}/change-password`, null, { params }),
  register: (data) => api.post('/auth/register', data),
  registerEntreprise: (data) => api.post('/auth/register-entreprise', data),
};

export const employerApi = {
  getAll: (params) => api.get('/employers', { params }),
  getById: (id) => api.get(`/employers/${id}`),
  getStats: (id) => api.get(`/employers/${id}/stats`),
  create: (data) => api.post('/employers', data),
  update: (id, data) => api.put(`/employers/${id}`, data),
  toggleActif: (id) => api.patch(`/employers/${id}/toggle-actif`),
  delete: (id) => api.delete(`/employers/${id}`),
  organigramme: () => api.get('/employers/organigramme'),
  leads: () => api.get('/employers/leads'),
  managers: () => api.get('/employers/managers'),
  changePassword: (id, data) => api.patch(`/employers/${id}/change-password`, null, {
    params: { ancienMotDePasse: data.ancienMotDePasse, nouveauMotDePasse: data.nouveauMotDePasse },
  }),
};

export const roleApi = {
  getAll: (params) => api.get('/roles', { params }),
  filtres: () => api.get('/roles/filtres'),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  addPermission: (roleId, permId) => api.post(`/roles/${roleId}/permissions/${permId}`),
  removePermission: (roleId, permId) => api.delete(`/roles/${roleId}/permissions/${permId}`),
  setPermissions: (roleId, ids) => api.put(`/roles/${roleId}/permissions`, ids),
  delete: (id) => api.delete(`/roles/${id}`),
};

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

export const actionApi = {
  getAll: (params) => api.get('/actions', { params }),
  getById: (id) => api.get(`/actions/${id}`),
  create: (data) => api.post('/actions', data),
  update: (id, data) => api.put(`/actions/${id}`, data),
  delete: (id) => api.delete(`/actions/${id}`),
};

export const auditApi = {
  getAll: (params) => api.get('/audit', { params }),
  anomalies: () => api.get('/audit/anomalies'),
  export: (params) => api.get('/audit/export', { params, responseType: 'blob' }),
  getById: (id) => api.get(`/audit/${id}`),
  search: (params) => api.get('/audit/search', { params }),
  getByUser: (userId, params) => api.get(`/audit/user/${userId}`, { params }),
  getByEntity: (entityType, entityId, params) => api.get(`/audit/entity/${entityType}/${entityId}`, { params }),
  getStats: (params) => api.get('/audit/stats', { params }),
  getActionTypes: () => api.get('/audit/action-types'),
};

export const departementApi = {
  getAll: (params) => api.get('/departements', { params }),
  getById: (id) => api.get(`/departements/${id}`),
  create: (data) => api.post('/departements', data),
  update: (id, data) => api.put(`/departements/${id}`, data),
  addPoste: (deptId, posteId) => api.post(`/departements/${deptId}/postes/${posteId}`),
  removePoste: (deptId, posteId) => api.delete(`/departements/${deptId}/postes/${posteId}`),
  delete: (id) => api.delete(`/departements/${id}`),
};

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
  stats: () => api.get('/postes/stats'),
  delete: (id) => api.delete(`/postes/${id}`),
};

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
  getReporting: (id) => api.get(`/projets/${id}/reporting`),
  delete: (id) => api.delete(`/projets/${id}`),
};

export const tacheApi = {
  getAll: (params) => api.get('/taches', { params }),
  getById: (id) => api.get(`/taches/${id}`),
  getByProjet: (projetId) => api.get(`/taches/projet/${projetId}`),
  getByAssignee: (employerId) => api.get(`/taches/assignee/${employerId}`),
  monEtat: () => api.get('/taches/mon-etat'),
  create: (data) => api.post('/taches', data),
  update: (id, data) => api.put(`/taches/${id}`, data),
  changeStatut: (id, statut) => api.patch(`/taches/${id}/statut`, null, { params: { statut } }),
  changeVisibilite: (id, visibilite) => api.patch(`/taches/${id}/visibilite`, null, { params: { visibilite } }),
  delete: (id) => api.delete(`/taches/${id}`),
};

export const commentaireApi = {
  getByTache: (tacheId) => api.get(`/commentaires/tache/${tacheId}`),
  getById: (id) => api.get(`/commentaires/${id}`),
  create: (data) => api.post('/commentaires', data),
  update: (id, contenu) => api.put(`/commentaires/${id}`, contenu, { headers: { 'Content-Type': 'text/plain' } }),
  delete: (id) => api.delete(`/commentaires/${id}`),
  deleteByTache: (tacheId) => api.delete(`/commentaires/tache/${tacheId}`),
};

export const documentApi = {
  getAll: (params) => api.get('/documents', { params }),
  getMyDocuments: (params) => api.get('/documents/me', { params }),
  getMetadata: (id) => api.get(`/documents/${id}/metadata`),
  getReceived: (employerId) => api.get(`/documents/received/${employerId}`),
  getSent: (employerId) => api.get(`/documents/sent/${employerId}`),
  upload: (data, file) => {
    const formData = new FormData();
    formData.append('document', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    formData.append('fichier', file);
    return api.post('/documents/upload', formData);
  },
  uploadMyCv: (nom, file) => {
    const formData = new FormData();
    formData.append('nom', nom);
    formData.append('fichier', file);
    return api.post('/documents/me/cv', formData);
  },
  uploadJustificatif: (file, nom) => {
    const formData = new FormData();
    if (nom) formData.append('nom', nom);
    formData.append('fichier', file, file.name);
    return api.post('/documents/permission-justificatif', formData);
  },
  transfer: (id, data) => api.post(`/documents/${id}/transfer`, data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}`),
};

export const factureApi = {
  getAll: (params) => api.get('/factures', { params }),
  getById: (id) => api.get(`/factures/${id}`),
  getByProjet: (projetId) => api.get(`/factures/by-projet/${projetId}`),
  create: (data) => api.post('/factures', data),
  update: (id, data) => api.put(`/factures/${id}`, data),
  changeStatut: (id, statut) => api.patch(`/factures/${id}/statut`, null, { params: { statut } }),
  convertir: (id, type) => api.post(`/factures/${id}/convertir`, null, { params: { type } }),
  enregistrerPaiement: (id, data) => api.post(`/factures/${id}/paiements`, data),
  getPaiements: (id) => api.get(`/factures/${id}/paiements`),
  getJournalVente: () => api.get('/factures/journal-vente'),
  getBalanceAgee: () => api.get('/factures/balance-agee'),
  valider: (id) => api.post(`/factures/${id}/valider`),
  pdf: (id) => api.get(`/factures/${id}/pdf`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/factures/${id}`),
};

// ─── Dossiers de facturation (refonte interface) ─────────────────────────────
// Cycle séquentiel 3 étapes : PROFORMA (PDF reçu) → BON DE COMMANDE (saisie +
// PDF généré) → FACTURE RÉGULIÈRE (après paiement) → clôture.
export const facturationCycleApi = {
  getAll: () => api.get('/facturation-cycles'),
  getById: (id) => api.get(`/facturation-cycles/${id}`),
  create: (data) => api.post('/facturation-cycles', data),
  // Étape 1 — upload du PDF proforma
  uploadProforma: (id, file) => {
    const fd = new FormData();
    fd.append('fichier', file);
    return api.post(`/facturation-cycles/${id}/proforma`, fd);
  },
  // Étape 2 — bon de commande (saisie + PDF)
  genererBonCommande: (id, data) => api.post(`/facturation-cycles/${id}/bon-commande`, data),
  pdfBonCommande: (id) => api.get(`/facturation-cycles/${id}/bon-commande/pdf`, { responseType: 'blob' }),
  // Étape 3 — facture régulière (saisie ou PDF reçu)
  creerFactureFinale: (id, data) => api.post(`/facturation-cycles/${id}/facture-finale`, data),
  uploadFactureFinalePdf: (id, file) => {
    const fd = new FormData();
    fd.append('fichier', file);
    return api.post(`/facturation-cycles/${id}/facture-finale/pdf`, fd);
  },
  // Encaissement de la régulière
  enregistrerPaiement: (id, data) => api.post(`/facturation-cycles/${id}/paiements`, data),
  getPaiements: (id) => api.get(`/facturation-cycles/${id}/paiements`),
  // Fin de cycle
  cloturer: (id) => api.post(`/facturation-cycles/${id}/cloturer`),
  delete: (id) => api.delete(`/facturation-cycles/${id}`),
};

export const evenementApi = {
  getAll: (params) => api.get('/evenements', { params }),
  getById: (id) => api.get(`/evenements/${id}`),
  getByRange: (params) => api.get('/evenements/range', { params }),
  getByParticipant: (participantId) => api.get(`/evenements/participant/${participantId}`),
  getByProjet: (projetId) => api.get(`/evenements/projet/${projetId}`),
  create: (data) => api.post('/evenements', data),
  update: (id, data) => api.put(`/evenements/${id}`, data),
  delete: (id) => api.delete(`/evenements/${id}`),
};

export const sucursalApi = {
  getAll: (params) => api.get('/sucursales', { params }),
  getById: (id) => api.get(`/sucursales/${id}`),
  create: (entrepriseId, data) => api.post('/sucursales', data, { params: { entrepriseId } }),
  update: (id, data) => api.put(`/sucursales/${id}`, data),
  toggleStatut: (id) => api.patch(`/sucursales/${id}/statut`),
  assignManager: (id, managerId) => api.patch(`/sucursales/${id}/manager`, null, { params: { managerId } }),
  delete: (id) => api.delete(`/sucursales/${id}`),
};

export const evaluationApi = {
  getAll: (params) => api.get('/evaluations', { params }),
  getById: (id) => api.get(`/evaluations/${id}`),
  create: (data) => api.post('/evaluations', data),
  kpi: (employeId) => api.get(`/evaluations/kpi/${employeId}`),
  changeStatut: (id, statut) => api.patch(`/evaluations/${id}/statut`, null, { params: { statut } }),
};

export const paieApi = {
  heuresEmploye: (id, mois, annee) => api.get(`/paie/employes/${id}/heures/${mois}/${annee}`),
  heures: (params) => api.get('/paie/heures', { params }),
  genererUnitaire: (data) => api.post('/paie/bulletins/generer', data),
  bulletins: (params) => api.get('/paie/bulletins', { params }),
  updateBulletin: (id, data) => api.put(`/paie/bulletins/${id}`, data),
  deleteBulletin: (id) => api.delete(`/paie/bulletins/${id}`),
  generer: (mois, annee) => api.post(`/paie/generer/${mois}/${annee}`),
  pdf: (id) => api.get(`/paie/bulletins/${id}/pdf`, { responseType: 'blob' }),
};

export const entrepriseApi = {
  getAll: (params) => api.get('/entreprises', { params }),
  getById: (id) => api.get(`/entreprises/${id}`),
  getSuperAdminStats: () => api.get('/entreprises/super-admin/stats'),
  getAdmins: (id) => api.get(`/entreprises/${id}/admins`),
  create: (data) => api.post('/entreprises', data),
  update: (id, data) => api.put(`/entreprises/${id}`, data),
  toggleAdminStatut: (id, adminId) => api.patch(`/entreprises/${id}/admins/${adminId}/statut`),
  createAdmin: (id, data) => api.post(`/entreprises/${id}/admins`, data),
  changeAdminRole: (id, adminId, role) => api.patch(`/entreprises/${id}/admins/${adminId}/role`, null, { params: { role } }),
  resetAdminPassword: (id, adminId) => api.post(`/entreprises/${id}/admins/${adminId}/reset-password`),
  updatePointageConfig: (id, data) => api.patch(`/entreprises/${id}/pointage-config`, data),
  toggleStatut: (id) => api.patch(`/entreprises/${id}/statut`),
  delete: (id) => api.delete(`/entreprises/${id}`),
};

export const plateformeApi = {
  health: () => api.get('/plateforme/health'),
  getConfig: () => api.get('/plateforme/config'),
  putConfig: (data) => api.put('/plateforme/config', data),
  versions: () => api.get('/plateforme/versions'),
  backups: () => api.get('/plateforme/backups'),
  requestBackup: () => api.post('/plateforme/backups'),
  updateBackupStatut: (id, statut) => api.patch(`/plateforme/backups/${id}/statut`, null, { params: { statut } }),
  utilisateurs: (id) => api.get(`/plateforme/entreprises/${id}/utilisateurs`),
  quotas: () => api.get('/plateforme/quotas'),
  upsertQuota: (data) => api.put('/plateforme/quotas', data),
  deleteQuota: (id) => api.delete(`/plateforme/quotas/${id}`),
  flags: () => api.get('/plateforme/feature-flags'),
  createFlag: (data) => api.post('/plateforme/feature-flags', data),
  updateFlag: (key, data) => api.put(`/plateforme/feature-flags/${encodeURIComponent(key)}`, data),
  deleteFlag: (key) => api.delete(`/plateforme/feature-flags/${encodeURIComponent(key)}`),
};

export const impersonateApi = {
  start: (employerId) => api.post('/impersonate', { employerId }),
  me: () => api.get('/impersonate/me'),
  logout: () => api.post('/impersonate/logout'),
};

export const offreApi = {
  getAll: (params) => api.get('/recrutement/offres', { params }),
  getById: (id) => api.get(`/recrutement/offres/${id}`),
  create: (data) => api.post('/recrutement/offres', data),
  update: (id, data) => api.put(`/recrutement/offres/${id}`, data),
  changeStatut: (id, statut) => api.patch(`/recrutement/offres/${id}/statut`, null, { params: { statut } }),
  delete: (id) => api.delete(`/recrutement/offres/${id}`),
};

export const candidatureApi = {
  getAll: (params) => api.get('/recrutement/candidatures', { params }),
  getByOffre: (offreId) => api.get(`/recrutement/candidatures/offre/${offreId}`),
  create: (data) => api.post('/recrutement/candidatures', data),
  createAvecCv: (data, file) => {
    const formData = new FormData();
    formData.append('candidature', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    formData.append('cv', file);
    return api.post('/recrutement/candidatures/avec-cv', formData);
  },
  uploadCv: (id, file) => {
    const formData = new FormData();
    formData.append('cv', file);
    return api.post(`/recrutement/candidatures/${id}/cv`, formData);
  },
  changeStatut: (id, statut) => api.patch(`/recrutement/candidatures/${id}/statut`, null, { params: { statut } }),
  evaluer: (id, data) => api.patch(`/recrutement/candidatures/${id}/decision`, data),
  embaucher: (id, data) => api.post(`/recrutement/candidatures/${id}/embaucher`, data),
  delete: (id) => api.delete(`/recrutement/candidatures/${id}`),
};

export const pointageApi = {
  clockIn: () => api.post('/pointages/clock-in'),
  clockOut: () => api.post('/pointages/clock-out'),
  corrigerDepart: (id, heure) => api.patch(`/pointages/${id}/depart`, null, { params: { heure } }),
  aujourdhui: () => api.get('/pointages/aujourdhui'),
  periode: (params) => api.get('/pointages/periode', { params }),
};

export const demandePermissionApi = {
  create: (data) => api.post('/demandes-permission', data),
  mes: () => api.get('/demandes-permission/mes'),
  aValider: () => api.get('/demandes-permission/a-valider'),
  decider: (id, statut, commentaire) => api.patch(`/demandes-permission/${id}/decision`, null, { params: { statut, commentaire } }),
  annuler: (id) => api.patch(`/demandes-permission/${id}/annuler`),
};

export default api;

export const secretariatApi = { employes: () => api.get('/secretariat/employes') };
