// src/roles.js — Source unique de vérité pour le scoping des interfaces par rôle.
// Hiérarchie : SUPER_ADMIN > ADMIN > MANAGER > LEAD > STAFF > STAGIAIRE
//   - SUPER_ADMIN = opérateur de plateforme → gère les ENTREPRISES, pas les opérations RH.
//   - ADMIN       = portail Dashboard, tout le RH de SON entreprise.
//   - MANAGER     = Dashboard + son équipe (employés, évals, tâches).
//   - STAFF / STAGIAIRE = portail Timesheet (pointage) + ses données.

export const ROLE_HIERARCHY = ['STAGIAIRE', 'SECRETAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];

/**
 * Matrice : feature → rôles autorisés.
 * Un rôle ABSENT de la liste n'a PAS accès (SUPER_ADMIN inclus).
 *
 * ⚠️ Cette matrice n'est pas la sécurité : elle pilote la garde de route
 * (`RoleRoute`) et les menus. La vérité d'autorisation reste `SecurityConfig`
 * (`hasRole` / `hasAnyRole`) + `@PreAuthorize` côté backend — un rôle écarté ici
 * reçoit de toute façon un 403 de l'API.
 *
 * Chaque entrée est commentée avec le matcher backend correspondant
 * (vérifié le 24/09/2026) et le portail/l'écran qui la consomme.
 */
export const FEATURES = {
  // ── Portails & transverse ───────────────────────────────────────────────
  dashboard:    ['ADMIN', 'MANAGER', 'LEAD'],   // /api/dashboard/** = ADMIN, MANAGER, LEAD
  profil:       ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'], // /api/auth/profile + self → tous les rôles (LEAD était absent — corrigé 24/09/2026)
  parametres:   ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'], // préférences personnelles (thème, notifications) : aucun appel API d'entreprise → tous les rôles (était ADMIN seul — corrigé 24/09/2026)

  // ── Plateforme (SUPER_ADMIN uniquement) ─────────────────────────────────
  entreprises:  ['SUPER_ADMIN'],           // /admin/entreprises — GET /api/entreprises/** = SA + ADMIN, mutations SA ; /admins/** = SA
  entreprisesDetail: ['SUPER_ADMIN', 'ADMIN'], // detail : le SUPER_ADMIN gère tout, l'ADMIN configure le pointage de SON entreprise
  plateforme:   ['SUPER_ADMIN'],           // /admin/plateforme — /api/plateforme/** = SUPER_ADMIN
  sucursales:   ['SUPER_ADMIN', 'ADMIN'],  // lecture élargie backend (SA/ADMIN/MANAGER/LEAD, scope service) ; mutations = ADMIN
  audit:        ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LEAD'],
  roles:        ['SUPER_ADMIN'],          // API d'administration complète réservée à SUPER_ADMIN ; /filtres est un contrat distinct
  permissions:  ['SUPER_ADMIN'],          // /api/permissions/** = SUPER_ADMIN
  actions:      ['SUPER_ADMIN'],          // /api/actions/** = SUPER_ADMIN

  employes:     ['ADMIN', 'MANAGER', 'LEAD', 'SECRETAIRE'],  // secrétaire : liste de pointage limitée à sa succursale
  departements: ['ADMIN', 'MANAGER', 'LEAD'],
  postes:       ['ADMIN', 'MANAGER', 'LEAD'],
  paie:         ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LEAD', 'STAFF', 'STAGIAIRE', 'SECRETAIRE'], // consultation et téléchargement limités au périmètre du rôle
  recrutement:  ['ADMIN', 'MANAGER', 'LEAD'],
  organigramme: ['STAGIAIRE', 'STAFF', 'MANAGER', 'ADMIN'],
  evaluations:  ['LEAD', 'MANAGER', 'ADMIN'],
  timesheet:    ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'], // pointage personnel du départ

  // ── Projets & travail ───────────────────────────────────────────────────
  projets:      ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'], // lecture/création limitée secrétaire
  taches:       ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'], // lecture/création limitée secrétaire
  gantt:        ['STAFF', 'LEAD', 'MANAGER', 'ADMIN'],
  factures:     ['MANAGER', 'ADMIN'],                  // Factures et cycles : accès réservé aux gestionnaires
  evenements:   ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'], // consultation/création limitée secrétaire
  documents:    ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'], // consultation/création limitée secrétaire
};

/** Le portail d'accueil (redirection post-login et garde des routes). */
export const portailFor = (roleName) => {
  switch (roleName) {
    case 'SUPER_ADMIN': return '/admin/entreprises';
    case 'SECRETAIRE': return '/employes';
    case 'ADMIN':
    case 'MANAGER':
    case 'LEAD':        return '/dashboard';
    default:            return '/timesheet';
  }
};

export const canAccess = (user, feature) => {
  if (!user?.roleName) return false;
  const allowed = FEATURES[feature];
  if (!allowed) return true; // feature non répertoriée = ouverte
  return allowed.includes(user.roleName);
};
