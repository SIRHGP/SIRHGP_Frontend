# SIRHGP Frontend

Système d'Information RH & Gestion de Projets — Frontend React.

## 🚀 Démarrage

```bash
# Installer les dépendances
yarn install

# Lancer le serveur de développement
yarn dev
```

Le serveur de développement tourne sur `http://localhost:5000` et proxy les appels `/api` vers `http://localhost:8080` (backend Spring Boot). `BACKEND_PORT` permet de remplacer le port du backend.

## 🛠️ Stack technique

- **React 19** + **Vite 8**
- **React Router 7** — navigation
- **Axios** — appels API
- **Recharts** — graphiques
- **date-fns** — manipulation de dates
- **lucide-react** — icônes
- **react-hot-toast** — notifications toast

## 📁 Structure du projet

```
src/
├── Api.js              # Configuration Axios + endpoints API
├── App.jsx             # Routes principales
├── components/         # Composants réutilisables
│   ├── layout/         # Layout, Sidebar, Header
│   └── ui/             # Composants UI (Button, Card, Modal, etc.)
├── constants/          # Constantes (types de notifications, etc.)
├── contexts/           # Contextes React (Auth, Theme, Notifications)
├── hooks/              # Hooks personnalisés (useApi, useMutation, etc.)
└── pages/              # Pages de l'application
    └── admin/          # Pages d'administration (Rôles, Permissions, Actions)
```

## 🔐 Rôles et permissions

- **SUPER_ADMIN** — administration de la plateforme, sans accès RH direct
- **ADMIN** — gestion de son entreprise
- **MANAGER** — gestion de sa succursale
- **LEAD** — accès limité à ses départements
- **SECRETAIRE** — pointage des arrivées et accès transverse limité à sa succursale
- **STAFF** — accès à ses données personnelles et modules autorisés
- **STAGIAIRE** — accès personnel restreint

## 🌍 Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_API_URL` | URL de base de l'API | `/api` (proxy Vite) |

## Déploiement sur Vercel

Connecte le dépôt `SIRHGP_Frontend` à Vercel en gardant la racine du projet à la racine du dépôt. Vercel détecte Vite ; les commandes sont `npm run build` et le dossier de sortie `dist`. Le fichier `vercel.json` configure le fallback SPA nécessaire aux routes React Router.

Dans les variables d'environnement Vercel (Production et Preview), définis `VITE_API_URL` avec l'URL publique du backend suivie de `/api`, par exemple `https://api.exemple.com/api`. Cette URL n'est pas connue/configurée dans le dépôt actuellement. Sans backend publiquement accessible et `CORS_ORIGINS` configuré côté backend pour le domaine Vercel, l'interface sera déployée mais les appels API ne fonctionneront pas. `VITE_API_URL` est incorporée au bundle visible par les navigateurs : n'y place aucun secret.

Le frontend n'a pas besoin d'un Dockerfile pour Vercel ; Docker Compose local démarre uniquement l'API et MySQL. Pour les détails Docker backend, voir le README du dépôt `SIRHGP_Backend`.

## 📦 Scripts

```bash
yarn dev       # Serveur de développement
yarn build     # Build de production
yarn preview   # Prévisualisation du build
yarn lint      # Lint ESLint
