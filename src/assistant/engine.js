// ============================================================
//  Moteur de l'Assistant SIRHGP
// ------------------------------------------------------------
//  Analyse une instruction en langage naturel, la traduit en
//  { resource, action, parameters }, valide, puis exécute via
//  les services frontend EXISTANTS (src/Api.js).
//  Aucun appel HTTP direct : tout passe par les Api déjà en place.
// ============================================================

import {
  RESOURCES, REF_SOURCES, STATUT_ALIASES, NAV_ROUTES,
} from './registry';
import { projetApi } from '../Api';

/* ---------- Utilitaires ---------- */

const norm = (s) => (s || '').toLowerCase().trim();

/** Extrait la liste réelle depuis une réponse paginée ou brute. */
export function extractList(res) {
  const d = res?.data?.data ?? res?.data;
  return Array.isArray(d) ? d : d?.content || [];
}

/** Charge toutes les occurrences d'une ressource via son Api existante. */
async function loadAll(resourceKey) {
  const src = REF_SOURCES[resourceKey];
  const res = await src.api({ page: 0, size: 300 });
  return extractList(res);
}

/**
 * Retrouve une entité par son nom dans une liste (matching progressif :
   exact > commence par > contient). Retourne { entity, matches }.
 */
function findEntity(list, nameKey, query) {
  const q = norm(query);
  if (!q) return { entity: null, matches: list };
  const exact = list.find(e => norm(e[nameKey]) === q);
  if (exact) return { entity: exact, matches: [exact] };
  const starts = list.filter(e => norm(e[nameKey]).startsWith(q));
  if (starts.length === 1) return { entity: starts[0], matches: starts };
  const contains = list.filter(e => norm(e[nameKey]).includes(q));
  if (contains.length === 1) return { entity: contains[0], matches: contains };
  return { entity: null, matches: starts.length ? starts : contains };
}

/** Détecte la ressource mentionnée dans l'instruction. */
function detectResource(text) {
  const t = norm(text);
  let best = null, bestLen = 0;
  for (const r of Object.values(RESOURCES)) {
    for (const kw of r.keywords) {
      // mot entier uniquement pour éviter les faux positifs
      const re = new RegExp(`(^|[^a-zà-ÿ])${kw}([^a-zà-ÿ]|$)`, 'i');
      if (re.test(t) && kw.length > bestLen) { best = r; bestLen = kw.length; }
    }
  }
  return best;
}

/** Détecte l'action demandée. */
export function detectAction(text) {
  const t = norm(text);
  if (/\b(ouvre|ouvrir|vas sur|va sur|affiche (la )?(page|liste)|montre (la )?(page|liste))\b/.test(t) && /\b(liste|page)\b/.test(t)) return 'navigate';
  if (/\b(ouvre|ouvrir)\b/.test(t) && !/\b(detail|fiche)\b/.test(t)) return 'navigate';
  if (/\b(supprime|supprimer|efface)\b/.test(t)) return 'delete';
  if (/\bdésactive\b|\bdesactive\b/.test(t)) return 'deactivate';
  if (/(?<!dés)(?<!des)\bactive\b/.test(t)) return 'activate';
  if (/\b(affecte|rattache|assigne)\b.*\b(au projet|au departement|au département)\b/.test(t)) return 'assign';
  if (/\b(statut|statut de|passe)\b/.test(t) && /\ben\b/.test(t)) return 'changeStatus';
  if (/\b(termine|terminer|clôture|cloture)\b/.test(t)) return 'complete';
  if (/\b(crée|cree|créer|creer|ajoute|ajouter|nouveau|nouvelle)\b/.test(t)) return 'create';
  if (/\b(liste|lister|affiche|montre|recherche|cherche|trouve|combien)\b/.test(t)) return 'list';
  return 'help';
}

/** Extrait un nom cité : « nommé X », « appelée X », guillemets, ou après le déterminant. */
export function extractName(text) {
  const patterns = [
    /nomm[eé]e?\s+((?:[A-ZÀ-Ÿ][\wÀ-ÿ'-]*(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]*)*))/,
    /appell[eé]e?\s+((?:[A-ZÀ-Ÿ][\wÀ-ÿ'-]*(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]*)*))/,
    /[«"']([^»"']+)[»"']/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

/* Résolution générique d'une référence par nom → entité réelle du backend */
async function resolveRef(refKey, value) {
  const list = await loadAll(refKey);
  const src = REF_SOURCES[refKey];
  for (const nk of src.nameKeys) {
    const { entity, matches } = findEntity(list, nk, value);
    if (entity) return entity;
    if (matches.length > 1) {
      const err = new Error(`Plusieurs ${refKey} correspondent à « ${value} ».`);
      err.code = 'AMBIGUOUS'; err.matches = matches.slice(0, 6); err.nameKey = nk;
      throw err;
    }
  }
  const err = new Error(`« ${value} » ne correspond à aucun ${refKey} existant.`);
  err.code = 'NOT_FOUND'; err.options = list.slice(0, 8).map(e => e[src.nameKeys[0]]);
  throw err;
}

/* Vérification de permission côté front (le backend reste la vérité ultime) */
function checkRole(ctx, minRole) {
  if (!minRole) return true;
  return ctx.hasMinRole ? ctx.hasMinRole(minRole) : false;
}

const deny = (minRole) => ({
  messages: [{ kind: 'error', text: `⛔ Votre rôle ne permet pas cette action (minimum requis : ${minRole}). Le backend vérifiera à nouveau vos droits.` }],
});

/* ---------- Handlers d'actions ---------- */

async function handleNavigate(text, ctx) {
  const t = norm(text);
  for (const nav of NAV_ROUTES) {
    if (nav.keywords.some(kw => t.includes(kw))) {
      ctx.navigate?.(nav.to);
      return { messages: [{ kind: 'success', text: `📂 ${nav.label}`, links: [{ label: `Ouvrir ${nav.label}`, to: nav.to }] }] };
    }
  }
  return { messages: [{ kind: 'text', text: 'Je n’ai pas reconnu la page. Pages : Employés, Départements, Postes, Projets, Tâches, Factures, Événements, Documents, Rôles, Permissions, Audit.' }] };
}

async function handleList(resource, text, ctx) {
  if (!checkRole(ctx, resource.minRole?.read)) return deny(resource.minRole.read);
  const list = await loadAll(resource.key);
  let filtered = list;
  const name = extractName(text);
  const searchMatch = text.match(/(?:contenant|nomm[eé]s?|appell[eé]s?)\s+([\wÀ-ÿ' -]+)/i);
  const term = name || (searchMatch ? searchMatch[1].trim() : null);
  if (term) filtered = list.filter(e => norm(e[resource.nameKey]).includes(norm(term)));
  if (!filtered.length) return { messages: [{ kind: 'text', text: `Aucun résultat (${resource.plural}). Total : ${list.length}.` }] };
  return {
    messages: [{
      kind: 'list',
      text: `${filtered.length} ${resource.plural}${term ? ` pour « ${term} »` : ''} :`,
      items: filtered.slice(0, 6).map(e => e[resource.nameKey] ?? e.id),
      more: filtered.length > 6 ? `… et ${filtered.length - 6} autres` : null,
      links: [{ label: `Ouvrir ${resource.plural}`, to: resource.route }],
    }],
  };
}

/* Création interactive : champ par champ, refs vérifiées via le backend */
function firstMissing(spec, params) {
  return spec.fields.find(f => params[f.key] === undefined || params[f.key] === null || params[f.key] === '');
}
function askNextField(spec, params) {
  const f = firstMissing(spec, params);
  if (!f) return null;
  return { kind: 'text', text: `👉 Il me manque ${f.label}${f.example ? ` (ex : ${f.example})` : ''}` };
}

async function handleCreate(resource, text, ctx) {
  const spec = resource.create;
  if (!spec) {
    return { messages: [{ kind: 'text', text: `La création de ${resource.article} se fait depuis le formulaire dédié (champs métier spécifiques).`, links: [{ label: `Ouvrir ${resource.plural}`, to: resource.route }] }] };
  }
  if (!checkRole(ctx, resource.minRole.create)) return deny(resource.minRole.create);

  const params = {};
  const name = extractName(text);
  if (name) {
    const nf = spec.fields.find(f => ['name', 'nom', 'titre'].includes(f.key));
    if (nf && !nf.ref) params[nf.key] = name;
  }
  const missing = firstMissing(spec, params);
  if (missing) {
    return {
      pending: { action: 'create', resource: resource.key, params, awaiting: 'field' },
      messages: [{ kind: 'text', text: spec.intro }, askNextField(spec, params)],
    };
  }
  return executeCreate(resource, params);
}

async function executeCreate(resource, params) {
  const spec = resource.create;
  try {
    // Résolution des références contre les vraies données backend
    for (const f of spec.fields) {
      if (f.ref && params[f.key]) {
        const entity = await resolveRef(f.ref, params[f.key]);
        params[f.key] = entity.id; // ID réel trouvé côté backend
      }
    }
    const payload = spec.build(params);
    const res = await resource.api.create(payload);
    const dto = res?.data?.data ?? res?.data;
    return { messages: [{ kind: 'success', text: spec.success(dto), links: [{ label: `Voir les ${resource.plural}`, to: resource.route }] }] };
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      const f = spec.fields.find(x => x.ref && params[x.key]);
      const opts = err.options?.length ? `\nSuggestions existantes : ${err.options.join(', ')}` : '';
      return {
        pending: { action: 'create', resource: resource.key, params: { ...params, [f?.key]: undefined }, awaiting: 'field' },
        messages: [{ kind: 'error', text: `${err.message}${opts}\n👉 Merci de préciser ${f ? f.label : 'la référence'}.` }],
      };
    }
    throw err;
  }
}

/* Suppression / activation / clôture — toujours avec confirmation explicite */
async function handleMutate(resource, action, text, ctx) {
  const minRole = resource.minRole?.mutate;
  if (!minRole || !checkRole(ctx, minRole)) return deny(minRole || 'ADMIN');

  const list = await loadAll(resource.key);
  let name = extractName(text);
  if (!name) {
    const m = text.match(new RegExp(`(?:${resource.plural}|${resource.label})\\s+([\\wÀ-ÿ' -]+)`, 'i'));
    if (m) name = m[1]?.trim();
  }
  if (!name) {
    return { pending: { action, resource: resource.key, awaiting: 'entityName' },
             messages: [{ kind: 'text', text: `Quel(le) ${resource.label.toLowerCase()} est concerné(e) ? Donnez-moi son nom.` }] };
  }
  const { entity, matches } = findEntity(list, resource.nameKey, name);
  if (!entity) {
    if (matches.length > 1) return { messages: [{ kind: 'text', text: `Plusieurs correspondances : ${matches.slice(0, 5).map(m => m[resource.nameKey]).join(', ')}. Précisez le nom complet.` }] };
    return { messages: [{ kind: 'error', text: `« ${name} » ne correspond à aucun ${resource.label.toLowerCase()} existant.` }] };
  }

  if ((action === 'activate' || action === 'deactivate') && !resource.api.toggleActif) {
    return { messages: [{ kind: 'text', text: `L’activation/désactivation n’est disponible que pour les employés (bouton dédié sur ${resource.route}).` }] };
  }
  if (action === 'complete' && !resource.terminedValue) {
    return { messages: [{ kind: 'text', text: 'La clôture par statut s’applique aux tâches et projets.' }] };
  }

  const executor = async () => {
    if (action === 'delete') await resource.api.delete(entity.id);
    else if (action === 'deactivate' || action === 'activate') await resource.api.toggleActif(entity.id);
    else if (action === 'complete') await resource.api.changeStatut(entity.id, resource.terminedValue);
  };
  const labels = {
    delete: `⚠️ Vous êtes sur le point de **supprimer** : ${resource.label} « ${entity[resource.nameKey]} ». Cette opération peut être irréversible.`,
    deactivate: `⚠️ Désactiver l’employé « ${entity[resource.nameKey]} » ? Il ne pourra plus se connecter.`,
    activate: `Réactiver l’employé « ${entity[resource.nameKey]} » ?`,
    complete: `Marquer « ${entity[resource.nameKey]} » comme terminé(e) ?`,
  };
  return {
    pending: { action, resource: resource.key, entityId: entity.id, entityName: entity[resource.nameKey], awaiting: 'confirm', executor },
    messages: [{ kind: 'confirm', text: labels[action] }],
  };
}

/* Changement de statut : « statut du projet X en EN_COURS » */
function normalizeStatus(rawStatus, resource) {
  const t = norm(rawStatus).replace(/^(en|au)\s+/, '');
  if (/termin/.test(t)) return resource.terminedValue;
  return STATUT_ALIASES[t] || t.toUpperCase();
}

async function handleChangeStatus(resource, text, ctx) {
  const minRole = resource.minRole?.mutate;
  if (!minRole || !checkRole(ctx, minRole)) return deny(minRole || 'MANAGER');
  if (!resource.statuses) return { messages: [{ kind: 'text', text: `Le changement de statut n’est pas disponible pour les ${resource.plural}.` }] };

  const m = text.match(/(?:statut)\s*(?:de|du|de la|de l')?\s*([\wÀ-ÿ' -]+?)\s+(?:en|vers|à)\s+([\wÀ-ÿ' -]+)/i)
        || text.match(/\bpasse\s+(?:le |la )?[\wÀ-ÿ]+\s+([\wÀ-ÿ' -]+?)\s+en\s+([\wÀ-ÿ' -]+)/i);
  if (!m) return { messages: [{ kind: 'text', text: 'Formulez ainsi : « statut de <nom> en <statut> ». Statuts valides : ' + resource.statuses.join(', ') + '.' }] };

  const target = normalizeStatus(m[2], resource);
  if (!target || !resource.statuses.includes(target)) {
    return { messages: [{ kind: 'error', text: `Statut « ${m[2]} » invalide. Valides : ${resource.statuses.join(', ')}.` }] };
  }

  const list = await loadAll(resource.key);
  const { entity } = findEntity(list, resource.nameKey, m[1].trim());
  if (!entity) return { messages: [{ kind: 'error', text: `« ${m[1].trim()} » introuvable parmi les ${resource.plural}.` }] };

  const executor = async () => { await resource.api.changeStatut(entity.id, target); };
  return {
    pending: { action: 'changeStatus', resource: resource.key, entityId: entity.id, entityName: entity[resource.nameKey], awaiting: 'confirm', executor },
    messages: [{ kind: 'confirm', text: `Passer « ${entity[resource.nameKey]} » au statut ${target} ?` }],
  };
}

/* Affectation : « affecte Jean Dupont au projet Refonte RH » */
async function handleAssign(text, ctx) {
  if (!checkRole(ctx, 'MANAGER')) return deny('MANAGER');
  const empM = text.match(/affecte\s+(?:l['’]employ[eé]e?\s*)?([\wÀ-ÿ' -]+?)\s+au\s+projet\s+([\wÀ-ÿ' -]+)/i);
  if (!empM) return { messages: [{ kind: 'text', text: 'Formulez ainsi : « affecte <employé> au projet <projet> ».' }] };

  const employers = await loadAll('employer');
  const { entity: emp } = findEntity(employers, 'name', empM[1].trim());
  if (!emp) return { messages: [{ kind: 'error', text: `Employé « ${empM[1].trim()} » introuvable.` }] };

  const projets = await loadAll('projet');
  const { entity: proj } = findEntity(projets, 'nom', empM[2].trim());
  if (!proj) return { messages: [{ kind: 'error', text: `Projet « ${empM[2].trim()} » introuvable.` }] };

  const executor = async () => { await projetApi.addMembre(proj.id, emp.id); };
  return {
    pending: { action: 'assign', awaiting: 'confirm', executor },
    messages: [{ kind: 'confirm', text: `Affecter **${emp.name}** au projet « ${proj.nom} » ?` }],
  };
}

/* ---------- Point d'entrée principal ---------- */

export async function handleInstruction(text, ctx, pendingState) {
  // 1) Suite d'une conversation en cours : confirmation
  if (pendingState?.awaiting === 'confirm') {
    const t = norm(text);
    if (/^(oui|confirm\w*|ok|valide\w*|vas-y|go)\b/.test(t)) {
      await pendingState.executor();
      const done = {
        delete: `🗑️ « ${pendingState.entityName || 'Élément'} » supprimé.`,
        deactivate: `🔒 Employé « ${pendingState.entityName} » désactivé.`,
        activate: `🔓 Employé « ${pendingState.entityName} » réactivé.`,
        complete: `✅ « ${pendingState.entityName} » terminé.`,
        changeStatus: '✅ Statut mis à jour.',
        assign: '✅ Membre affecté au projet.',
      }[pendingState.action] || '✅ Opération effectuée.';
      const route = pendingState.resource ? RESOURCES[pendingState.resource]?.route : null;
      return { messages: [{ kind: 'success', text: done, links: route ? [{ label: 'Ouvrir la page', to: route }] : undefined }] };
    }
    return { messages: [{ kind: 'text', text: '❌ Opération annulée.' }] };
  }

  // 2) Suite : champ manquant ou nom d'entité attendu
  if (pendingState?.awaiting === 'field') {
    const resource = RESOURCES[pendingState.resource];
    const spec = resource.create;
    const f = pendingState.retryField
      ? spec.fields.find(x => x.key === pendingState.retryField)
      : firstMissing(spec, pendingState.params);
    let val = text.trim();
    if (f.ref) {
      try {
        const entity = await resolveRef(f.ref, val);
        val = entity.id;
      } catch (err) {
        if (err.code === 'NOT_FOUND') {
          const opts = err.options?.length ? `\nSuggestions existantes : ${err.options.join(', ')}` : '';
          return { pending: pendingState, messages: [{ kind: 'error', text: `${err.message}${opts}\n👉 Réessayez pour ${f.label}.` }] };
        }
        if (err.code === 'AMBIGUOUS') {
          return { pending: pendingState, messages: [{ kind: 'text', text: `${err.message}\nOptions : ${err.matches.map(m => m[err.nameKey]).join(' | ')}` }] };
        }
        throw err;
      }
    }
    pendingState.params[f.key] = val;
    pendingState.retryField = undefined;
    const next = askNextField(spec, pendingState.params);
    if (next) return { pending: pendingState, messages: [next] };
    return executeCreate(resource, pendingState.params);
  }

  if (pendingState?.awaiting === 'entityName') {
    const resource = RESOURCES[pendingState.resource];
    return handleMutate(resource, pendingState.action, `${resource.label} ${text.trim()}`, ctx);
  }

  // 3) Nouvelle instruction libre
  const action = detectAction(text);

  if (/^(bonjour|salut|hello|aide|help|que peux-tu)/i.test(norm(text))) {
    return { messages: [{ kind: 'text', text: '🤖 Assistant SIRHGP — je pilote la plateforme via les API existantes.\nExemples :\n• « Liste les employés »\n• « Crée un employé nommé Jean Dupont »\n• « Ouvre les projets »\n• « Désactive Jean Dupont »\n• « Statut de la tâche X en EN_COURS »\n• « Affecte Marie au projet SIRHGP »' }] };
  }

  switch (action) {
    case 'navigate':     return handleNavigate(text, ctx);
    case 'create':       return detectResource(text) ? handleCreate(detectResource(text), text, ctx)
                              : { messages: [{ kind: 'text', text: 'Créer quoi ? (employé, département, poste, projet, tâche…)' }] };
    case 'list':         return detectResource(text) ? handleList(detectResource(text), text, ctx)
                              : { messages: [{ kind: 'text', text: 'Lister quoi ? (employés, départements, postes, projets, tâches, factures, événements, documents…)' }] };
    case 'delete':       return detectResource(text) ? handleMutate(detectResource(text), 'delete', text, ctx)
                              : { messages: [{ kind: 'text', text: 'Supprimer quoi ?' }] };
    case 'deactivate':   return handleMutate(RESOURCES.employer, 'deactivate', text, ctx);
    case 'activate':     return handleMutate(RESOURCES.employer, 'activate', text, ctx);
    case 'complete':     return handleMutate(detectResource(text) || RESOURCES.tache, 'complete', text, ctx);
    case 'changeStatus': return detectResource(text) ? handleChangeStatus(detectResource(text), text, ctx)
                              : { messages: [{ kind: 'text', text: 'Changer le statut de quoi ? (projet, tâche, facture)' }] };
    case 'assign':       return handleAssign(text, ctx);
    default: {
      const r = detectResource(text);
      if (r) return handleList(r, text, ctx);
      return { messages: [{ kind: 'text', text: 'Je peux créer, lister, modifier ou supprimer des ressources SIRHGP via les API existantes. Tapez « aide » pour des exemples.' }] };
    }
  }
}

/* Transforme une erreur API backend en message compréhensible */
export function apiErrorToMessage(err) {
  const status = err.response?.status;
  const backendMsg = err.response?.data?.message || err.response?.data?.error || err.message;
  const base = {
    400: 'Requête invalide',
    401: 'Session expirée — reconnectez-vous',
    403: 'Action non autorisée par vos droits',
    404: 'Ressource introuvable',
    409: 'Conflit avec les données existantes',
    500: 'Erreur serveur',
  }[status] || err.message || 'Erreur inattendue';
  return backendMsg && status ? `${base} : ${backendMsg}` : base;
}