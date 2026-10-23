// check-role-guard.cjs — Contrôles statiques de la garde de route P0-03 (5.9).
// Lancé par `node check-role-guard.cjs` depuis SIRHGP_Frontend (aucun framework de
// test frontend retenu) : vérifie que la matrice `FEATURES` de src/roles.js, les
// routes gardées d'App.jsx et le menu de la Sidebar restent cohérents.
//
// Invariants contrôlés :
//   1. chaque `feature="…"` d'App.jsx existe dans FEATURES ;
//   2. le portail de chaque rôle (`portailFor`) est autorisé pour ce rôle
//      (sinon boucle de redirection) ;
//   3. aucun élément de menu de la Sidebar n'est visible pour un rôle que la
//      garde de route refuserait (parité menu ↔ garde).
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
const rolesSrc = read('roles.js');
const appSrc = read('App.jsx');
const sidebarSrc = path.join('components', 'layout', 'Sidebar.jsx');

const erreurs = [];

// ── 1. FEATURES : `cle: ['ROLE', …]` ──────────────────────────────────────────
const bloc = rolesSrc.match(/export const FEATURES = \{([\s\S]*?)\n\};/);
if (!bloc) { console.error('FEATURES introuvable dans roles.js'); process.exit(1); }
const FEATURES = {};
for (const ligne of bloc[1].split('\n')) {
  const m = ligne.match(/^\s*([A-Za-z_][\w]*)\s*:\s*\[([^\]]*)\]/);
  if (!m) continue;
  FEATURES[m[1]] = [...m[2].matchAll(/'([A-Z_]+)'/g)].map(x => x[1]);
}
const ROLE_HIERARCHY = [...(rolesSrc.match(/export const ROLE_HIERARCHY = \[([^\]]*)\]/)?.[1] || '')
  .matchAll(/'([A-Z_]+)'/g)].map(x => x[1]);

// ── 2. App.jsx : route → feature ──────────────────────────────────────────────
const routeFeature = {};
for (const m of appSrc.matchAll(/<Route path="([^"]+)" element=\{<RoleRoute feature="([^"]+)"/g)) {
  routeFeature['/' + m[1]] = m[2];
  if (!FEATURES[m[2]]) erreurs.push(`App.jsx : la feature « ${m[2]} » (route /${m[1]}) n'existe pas dans FEATURES`);
}

// ── 3. Portails : portailFor(role) doit être autorisé pour ce rôle ────────────
const portail = { SUPER_ADMIN: '/admin/entreprises', ADMIN: '/dashboard', MANAGER: '/dashboard', LEAD: '/dashboard' };
for (const role of ROLE_HIERARCHY) {
  const cible = portail[role] || '/timesheet';
  const feature = routeFeature[cible];
  if (!feature) { erreurs.push(`Portail de ${role} (/…${cible}) sans route gardée correspondante`); continue; }
  if (!FEATURES[feature]?.includes(role)) {
    erreurs.push(`Boucle de redirection : le portail de ${role} (${cible} → ${feature}) refuse ce rôle`);
  }
}

// ── 4. Sidebar : un item visible ne doit jamais être refusé par la garde ──────
let menuVerifies = 0;
for (const m of read(sidebarSrc).matchAll(/path:\s*'(\/[^']+)',\s*(?:\/\/[^\n]*\s*)?roles:\s*\[([^\]]*)\]/g)) {
  const feature = routeFeature[m[1]];
  const affiches = [...m[2].matchAll(/'([A-Z_]+)'/g)].map(x => x[1]);
  menuVerifies++;
  if (!feature) { erreurs.push(`Sidebar : ${m[1]} n'est pas gardé dans App.jsx (feature inconnue)`); continue; }
  for (const role of affiches) {
    if (!FEATURES[feature].includes(role)) {
      erreurs.push(`Sidebar : ${m[1]} est affiché au rôle ${role} mais RoleRoute (feature ${feature}) le refuse`);
    }
  }
}

// Garde-fous : si les extractions ne trouvent plus rien, le contrôle est vide de sens.
if (Object.keys(FEATURES).length === 0) erreurs.push('FEATURES vide (extraction obsolète ?)');
if (Object.keys(routeFeature).length === 0) erreurs.push('Aucune route gardée détectée dans App.jsx (extraction obsolète ?)');
if (menuVerifies === 0) erreurs.push('Aucun item de menu détecté dans Sidebar.jsx (extraction obsolète ?)');

console.log(`FEATURES : ${Object.keys(FEATURES).length} features · routes gardées : ${Object.keys(routeFeature).length} · items de menu : ${menuVerifies} · rôles : ${ROLE_HIERARCHY.length}`);
if (erreurs.length) {
  console.error('\nECHEC — incohérences détectées :');
  erreurs.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK — matrice FEATURES, routes gardées (App.jsx) et menu (Sidebar) cohérents.');
