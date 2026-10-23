// App.jsx
// NOTE: '/' redirige vers /login (page de connexion = point d'entrée par défaut).
// La page d'accueil publique (Landing) reste accessible via /landing.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/Authcontext';
import { useAuth } from './contexts/Authcontext';
import { ThemeProvider } from './contexts/Themecontext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/layout/Layout';
import RoleRoute from './components/RoleRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Login from './pages/Login';
import RegisterEntreprise from './pages/RegisterEntreprise';
import Dashboard from './pages/Dashboard';
import Employes from './pages/Employes';
import SecretariatPointage from './pages/SecretariatPointage';
import Departements from './pages/Departements';
import Postes from './pages/Postes';
import Paie from './pages/Paie';
import Recrutement from './pages/Recrutement';
import Timesheet from './pages/Timesheet';
import Evaluations from './pages/Evaluations';
import Organigramme from './pages/Organigramme';
import Projets from './pages/Projets';
import Taches from './pages/Taches';
import Gantt from './pages/Gantt';
import Factures from './pages/Factures';
import Evenements from './pages/Evenements';
import Documents from './pages/Documents';
import Profil from './pages/Profil';
import Parametres from './pages/Parametres';
import Entreprises from './pages/admin/Entreprises';
import EntrepriseDetail from './pages/admin/EntrepriseDetail';
import Sucursales from './pages/admin/Sucursales';
import Roles from './pages/admin/Roles';
import Permissions from './pages/admin/Permissions';
import Actions from './pages/admin/Actions';
import Audit from './pages/admin/Audit';
import Plateforme from './pages/admin/Plateforme';
import NotFound from './pages/NotFound';

function EmployesAccueil() {
  const { user } = useAuth();
  return user?.roleName === 'SECRETAIRE' ? <SecretariatPointage /> : <Employes />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* Routes publiques */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<RegisterEntreprise />} />
                <Route path="/landing" element={<Landing />} />

                {/* Routes protégées : RoleRoute contrôle le rôle, Layout l'authentification */}
                <Route element={<Layout />}>
                  <Route index element={<RoleRoute feature="dashboard"><Dashboard /></RoleRoute>} />
                  <Route path="dashboard" element={<RoleRoute feature="dashboard"><Dashboard /></RoleRoute>} />
                  <Route path="employes" element={<RoleRoute feature="employes"><EmployesAccueil /></RoleRoute>} />
                  <Route path="departements" element={<RoleRoute feature="departements"><Departements /></RoleRoute>} />
                  <Route path="postes" element={<RoleRoute feature="postes"><Postes /></RoleRoute>} />
                  <Route path="paie" element={<RoleRoute feature="paie"><Paie /></RoleRoute>} />
                  <Route path="recrutement" element={<RoleRoute feature="recrutement"><Recrutement /></RoleRoute>} />
                  <Route path="timesheet" element={<RoleRoute feature="timesheet"><Timesheet /></RoleRoute>} />
                  <Route path="evaluations" element={<RoleRoute feature="evaluations"><Evaluations /></RoleRoute>} />
                  <Route path="organigramme" element={<RoleRoute feature="organigramme"><Organigramme /></RoleRoute>} />
                  <Route path="projets" element={<RoleRoute feature="projets"><Projets /></RoleRoute>} />
                  <Route path="taches" element={<RoleRoute feature="taches"><Taches /></RoleRoute>} />
                  <Route path="gantt" element={<RoleRoute feature="gantt"><Gantt /></RoleRoute>} />
                  <Route path="factures" element={<RoleRoute feature="factures"><Factures /></RoleRoute>} />
                  <Route path="evenements" element={<RoleRoute feature="evenements"><Evenements /></RoleRoute>} />
                  <Route path="documents" element={<RoleRoute feature="documents"><Documents /></RoleRoute>} />
                  <Route path="profil" element={<RoleRoute feature="profil"><Profil /></RoleRoute>} />
                  <Route path="parametres" element={<RoleRoute feature="parametres"><Parametres /></RoleRoute>} />
                  <Route path="admin/entreprises" element={<RoleRoute feature="entreprises"><Entreprises /></RoleRoute>} />
                  <Route path="admin/entreprises/:id" element={<RoleRoute feature="entreprisesDetail"><EntrepriseDetail /></RoleRoute>} />
                  <Route path="admin/sucursales" element={<RoleRoute feature="sucursales"><Sucursales /></RoleRoute>} />
                  <Route path="admin/roles" element={<RoleRoute feature="roles"><Roles /></RoleRoute>} />
                  <Route path="admin/permissions" element={<RoleRoute feature="permissions"><Permissions /></RoleRoute>} />
                  <Route path="admin/actions" element={<RoleRoute feature="actions"><Actions /></RoleRoute>} />
                  <Route path="admin/audit" element={<RoleRoute feature="audit"><Audit /></RoleRoute>} />
                  <Route path="admin/plateforme" element={<RoleRoute feature="plateforme"><Plateforme /></RoleRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
