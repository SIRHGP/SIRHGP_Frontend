// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/Authcontext';
import { ThemeProvider } from './contexts/Themecontext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employes from './pages/Employes';
import Projets from './pages/Projets';
import Taches from './pages/Taches';
import Factures from './pages/Factures';
import Evenements from './pages/Evenements';
import Documents from './pages/Documents';
import Departements from './pages/Departements';
import Postes from './pages/Postes';
import Profil from './pages/Profil';
import Parametres from './pages/Parametres';
import Roles from './pages/admin/Roles';
import Permissions from './pages/admin/Permissions';
import Actions from './pages/admin/Actions';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="employes" element={<Employes />} />
                <Route path="departements" element={<Departements />} />
                <Route path="postes" element={<Postes />} />
                <Route path="projets" element={<Projets />} />
                <Route path="taches" element={<Taches />} />
                <Route path="factures" element={<Factures />} />
                <Route path="evenements" element={<Evenements />} />
                <Route path="documents" element={<Documents />} />
                <Route path="profil" element={<Profil />} />
                <Route path="parametres" element={<Parametres />} />
                <Route path="admin/roles" element={<Roles />} />
                <Route path="admin/permissions" element={<Permissions />} />
                <Route path="admin/actions" element={<Actions />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}