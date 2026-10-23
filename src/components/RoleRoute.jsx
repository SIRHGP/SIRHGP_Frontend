//
// Règles appliquées dans cet ordre :
//   1. profil en cours de chargement → rien n'est rendu (Layout affiche déjà l'écran de chargement) ;
//   2. visiteur non connecté          → /login ;
//   3. rôle absent de `FEATURES[feature]` → redirection vers SON portail (`portailFor`)
//      accompagnée d'un message explicite. Le portail d'un rôle est toujours
//      autorisé pour ce rôle (cf. tests de cohérence ci-dessous), donc aucune
//      boucle de redirection n'est possible ;
//   4. rôle autorisé → la route est rendue.
//
// Cohérence `portailFor` × `FEATURES` (à revérifier si la matrice change) :
//   SUPER_ADMIN → /admin/entreprises (`entreprises`) · ADMIN|MANAGER|LEAD → /dashboard
//   (`dashboard`) · STAFF|STAGIAIRE → /timesheet (`timesheet`).
//
// ⚠️ Cette garde est une garde d'ergonomie et de périmètre visuel, pas une
// mesure de sécurité : toute route protégée ici reste protégée par le backend
// (`SecurityConfig` + `@PreAuthorize`) qui renvoie 403 au rôle non autorisé.
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/Authcontext';
import { canAccess, portailFor } from '../roles';

export default function RoleRoute({ feature, children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  const connecte = !!user;
  const autorise = connecte && canAccess(user, feature);

  // Message unique : `id` dédié → react-hot-toast remplace le toast au lieu
  // d'en empiler un par rendu (StrictMode double les effets en développement).
  useEffect(() => {
    if (connecte && !autorise) {
      toast.error(
        `Accès refusé — « ${feature} » n'est pas dans le périmètre du rôle ${user.roleName}.`,
        { id: 'role-route-refus' }
      );
    }
  }, [connecte, autorise, feature, pathname, user?.roleName]);

  if (loading) return null;
  if (!connecte) return <Navigate to="/login" replace />;
  if (!autorise) return <Navigate to={portailFor(user.roleName)} replace />;

  return children;
}
