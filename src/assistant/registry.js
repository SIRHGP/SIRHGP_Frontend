// ============================================================
//  Registre des commandes de l'Assistant SIRHGP
// ------------------------------------------------------------
//  Chaque entrée reflète STRICTEMENT une capacité existante du
//  backend, telle qu'exposée par src/Api.js. Aucun endpoint
//  fictif : l'assistant réutilise uniquement les fonctions déjà
//  consommées par les pages de la plateforme.
// ============================================================

import {
  employerApi, roleApi, departementApi, posteApi,
  projetApi, tacheApi, factureApi, evenementApi, documentApi,
} from '../Api';

/* Statuts réellement acceptés par les endpoints PATCH /statut */
export const STATUTS = {
  projet: ['PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE', 'ANNULE', 'EN_RETARD'],
  tache: ['A_FAIRE', 'EN_COURS', 'EN_REVUE', 'TERMINEE', 'BLOQUEE'],
  facture: ['BROUILLON', 'EN_ATTENTE', 'PAYEE', 'PARTIELLEMENT_PAYEE'],
};

/* Alias français → valeur de statut exacte attendue par le backend */
export const STATUT_ALIASES = {
  'planifie': 'PLANIFIE', 'planifié': 'PLANIFIE',
  'en cours': 'EN_COURS',
  'suspendu': 'SUSPENDU',
  'annule': 'ANNULE', 'annulé': 'ANNULE',
  'en retard': 'EN_RETARD',
  'a faire': 'A_FAIRE', 'à faire': 'A_FAIRE',
  'en revue': 'EN_REVUE',
  'bloquee': 'BLOQUEE', 'bloquée': 'BLOQUEE',
  'brouillon': 'BROUILLON',
  'en attente': 'EN_ATTENTE',
  'payee': 'PAYEE', 'payée': 'PAYEE',
  'partiellement payee': 'PARTIELLEMENT_PAYEE', 'partiellement payée': 'PARTIELLEMENT_PAYEE',
};

/* Résolutions de références : quelle API charger pour retrouver un ID */
export const REF_SOURCES = {
  employer: { api: employerApi.getAll, nameKeys: ['name'] },
  role:     { api: roleApi.getAll,     nameKeys: ['name'] },
  departement: { api: departementApi.getAll, nameKeys: ['name'] },
  poste:    { api: posteApi.getAll,    nameKeys: ['name'] },
  projet:   { api: projetApi.getAll,   nameKeys: ['nom'] },
  tache:    { api: tacheApi.getAll,    nameKeys: ['titre'] },
  facture:  { api: factureApi.getAll,  nameKeys: ['codeFacture', 'nom'] },
  evenement:{ api: evenementApi.getAll,nameKeys: ['titre', 'nom'] },
};

export const RESOURCES = {
  employer: {
    key: 'employer', label: 'Employé', plural: 'employés',
    article: 'un employé', keywords: ['employe', 'employé', 'employer', 'salarie', 'salarié', 'collaborateur'],
    route: '/employes', api: employerApi,
    nameKey: 'name',
    minRole: { read: 'LEAD', create: 'ADMIN', mutate: 'ADMIN' },
    create: {
      intro: 'Je vais créer un employé. J’ai besoin des informations suivantes :',
      fields: [
        { key: 'name',        label: 'le nom complet',            example: 'Jean Dupont' },
        { key: 'email',       label: 'l’adresse email',           example: 'jean.dupont@sirhgp.cm' },
        { key: 'motDePasse',  label: 'un mot de passe provisoire',example: '********', secret: true },
        { key: 'dateEmbauche',label: 'la date d’embauche (AAAA-MM-JJ)', example: '2026-01-15' },
        { key: 'posteId',     label: 'le poste',                  example: 'Développeur Backend', ref: 'poste' },
        { key: 'roleId',      label: 'le rôle',                   example: 'STAFF',               ref: 'role' },
      ],
      build: (p) => ({
        name: p.name, email: p.email, motDePasse: p.motDePasse,
        dateEmbauche: p.dateEmbauche || null,
        posteId: Number(p.posteId), roleId: Number(p.roleId),
      }),
      success: (dto) => `✅ Employé créé : ${dto?.name || ''}${dto?.email ? ` (${dto.email})` : ''}`,
    },
  },

  departement: {
    key: 'departement', label: 'Département', plural: 'départements',
    article: 'un département', keywords: ['departement', 'département', 'dept', 'direction'],
    route: '/departements', api: departementApi,
    nameKey: 'name',
    minRole: { read: 'LEAD', create: 'ADMIN', mutate: 'ADMIN' },
    create: {
      intro: 'Je vais créer un département.',
      fields: [
        { key: 'name',        label: 'le nom du département',      example: 'Informatique & Systèmes' },
        { key: 'description', label: 'une description (optionnel)', example: 'Développement et maintenance du SI' },
      ],
      build: (p) => ({ name: p.name, description: p.description || null }),
      success: (dto) => `✅ Département créé : ${dto?.name || ''}`,
    },
  },
};

RESOURCES.poste = {
  key: 'poste', label: 'Poste', plural: 'postes',
  article: 'un poste', keywords: ['poste', 'postes', 'fonction'],
  route: '/postes', api: posteApi,
  nameKey: 'name',
  minRole: { read: 'STAFF', create: 'ADMIN', mutate: 'ADMIN' },
  create: {
    intro: 'Je vais créer un poste. J’ai besoin de :',
    fields: [
      { key: 'name',          label: 'le nom du poste', example: 'Développeur Backend' },
      { key: 'description',   label: 'une description (optionnel)', example: 'Développement des API' },
      { key: 'departementId', label: 'le département',    example: 'Informatique', ref: 'departement' },
      { key: 'roleId',        label: 'le rôle associé',   example: 'STAFF',        ref: 'role' },
    ],
    build: (p) => ({
      name: p.name, description: p.description || null,
      departementId: Number(p.departementId), roleId: Number(p.roleId),
    }),
    success: (dto) => `✅ Poste créé : ${dto?.name || ''}`,
  },
};

RESOURCES.projet = {
  key: 'projet', label: 'Projet', plural: 'projets',
  article: 'un projet', keywords: ['projet', 'projets'],
  route: '/projets', api: projetApi,
  nameKey: 'nom',
  minRole: { read: 'STAFF', create: 'MANAGER', mutate: 'MANAGER' },
  create: {
    intro: 'Je vais créer un projet. J’ai besoin de :',
    fields: [
      { key: 'nom',           label: 'le nom du projet',        example: 'Refonte Plateforme RH' },
      { key: 'codeProjet',    label: 'le code projet',          example: 'PROJ-RH-001' },
      { key: 'dateDebut',     label: 'la date de début (AAAA-MM-JJ)', example: '2026-01-10' },
      { key: 'dateFinPrevue', label: 'la date de fin prévue (AAAA-MM-JJ)', example: '2026-06-30' },
      { key: 'chefProjetId',  label: 'le chef de projet',       example: 'Karim Marchand', ref: 'employer' },
    ],
    build: (p) => ({
      nom: p.nom, codeProjet: String(p.codeProjet || '').toUpperCase(),
      dateDebut: p.dateDebut, dateFinPrevue: p.dateFinPrevue,
      chefProjetId: Number(p.chefProjetId),
      statut: 'PLANIFIE',
    }),
    success: (dto) => `✅ Projet créé : ${dto?.nom || ''} (${dto?.codeProjet || ''})`,
  },
  statuses: STATUTS.projet,
  terminedValue: 'TERMINE',
};

RESOURCES.tache = {
  key: 'tache', label: 'Tâche', plural: 'tâches',
  article: 'une tâche', keywords: ['tache', 'tâche', 'taches', 'tâches'],
  route: '/taches', api: tacheApi,
  nameKey: 'titre',
  minRole: { read: 'STAFF', create: 'MANAGER', mutate: 'MANAGER' },
  create: {
    intro: 'Je vais créer une tâche. J’ai besoin de :',
    fields: [
      { key: 'titre',       label: 'le titre de la tâche', example: 'Rédiger le cahier des charges' },
      { key: 'projetId',    label: 'le projet rattaché',   example: 'Refonte Plateforme RH', ref: 'projet' },
      { key: 'assigneeId',  label: 'la personne assignée', example: 'Lucas Moreau', ref: 'employer' },
      { key: 'priorite',    label: 'la priorité (BASSE/MOYENNE/HAUTE/URGENTE)', example: 'MOYENNE' },
    ],
    build: (p) => ({
      titre: p.titre,
      projetId: Number(p.projetId),
      assigneeId: p.assigneeId ? Number(p.assigneeId) : null,
      priorite: (p.priorite || 'MOYENNE').toUpperCase(),
      statut: 'A_FAIRE',
    }),
    success: (dto) => `✅ Tâche créée : ${dto?.titre || ''}`,
  },
  statuses: STATUTS.tache,
  terminedValue: 'TERMINEE',
};

/* Lecture + navigation uniquement : créations nécessitant un
   formulaire métier dédié (fichier, visibilité, lignes…) →
   l'assistant redirige vers la page réelle sans inventer de payload. */
RESOURCES.facture = {
  key: 'facture', label: 'Facture', plural: 'factures',
  article: 'une facture', keywords: ['facture', 'factures'],
  route: '/factures', api: factureApi, nameKey: 'codeFacture',
  minRole: { read: 'MANAGER', mutate: 'MANAGER' },
  statuses: STATUTS.facture, terminedValue: 'PAYEE',
};
RESOURCES.evenement = {
  key: 'evenement', label: 'Événement', plural: 'événements',
  article: 'un événement', keywords: ['evenement', 'événement', 'evenements', 'événements'],
  route: '/evenements', api: evenementApi, nameKey: 'titre',
  minRole: { read: 'STAFF', mutate: 'ADMIN' },
};
RESOURCES.document = {
  key: 'document', label: 'Document', plural: 'documents',
  article: 'un document', keywords: ['document', 'documents', 'fichier'],
  route: '/documents', api: documentApi, nameKey: 'nom',
  minRole: { read: 'STAFF', mutate: 'ADMIN' },
};
RESOURCES.role = {
  key: 'role', label: 'Rôle', plural: 'rôles',
  article: 'un rôle', keywords: ['role', 'rôle', 'roles', 'rôles'],
  route: '/admin/roles', api: roleApi, nameKey: 'name',
  minRole: { read: 'SUPER_ADMIN', mutate: 'SUPER_ADMIN' },
};

/* Navigation : mots-clés → routes existantes du front */
export const NAV_ROUTES = [
  { keywords: ['tableau de bord', 'dashboard', 'accueil'], to: '/', label: 'Tableau de bord' },
  { keywords: RESOURCES.employer.keywords, to: '/employes', label: 'Liste des employés' },
  { keywords: RESOURCES.departement.keywords, to: '/departements', label: 'Liste des départements' },
  { keywords: ['poste', 'postes'], to: '/postes', label: 'Liste des postes' },
  { keywords: ['projet', 'projets'], to: '/projets', label: 'Liste des projets' },
  { keywords: ['tache', 'tâche', 'taches', 'tâches'], to: '/taches', label: 'Liste des tâches' },
  { keywords: ['facture', 'factures'], to: '/factures', label: 'Liste des factures' },
  { keywords: ['evenement', 'événement', 'evenements', 'événements'], to: '/evenements', label: 'Liste des événements' },
  { keywords: ['document', 'documents'], to: '/documents', label: 'Liste des documents' },
  { keywords: ['profil'], to: '/profil', label: 'Mon profil' },
  { keywords: ['parametre', 'paramètre', 'parametres', 'paramètres'], to: '/parametres', label: 'Paramètres' },
  { keywords: ['permission', 'permissions'], to: '/admin/permissions', label: 'Gestion des permissions' },
  { keywords: ['audit', 'journal', 'tracabilite', 'traçabilité'], to: '/admin/audit', label: 'Audit & Traçabilité' },
];
