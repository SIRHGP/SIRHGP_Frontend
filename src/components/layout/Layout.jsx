import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AssistantPanel from '../assistant/AssistantPanel';
import { AssistantProvider } from '../../contexts/AssistantContext';
import { useAuth } from '../../contexts/Authcontext';
import { impersonateApi } from '../../Api';
import { Spinner } from '../ui/index';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const stopImpersonation = async () => {
    try { await impersonateApi.logout(); } catch { /* jeton déjà expiré */ }
    const sa = localStorage.getItem('sirhgp-sa-token');
    localStorage.removeItem('sirhgp-impersonation');
    localStorage.removeItem('sirhgp-sa-token');
    if (sa) localStorage.setItem('sirhgp-token', sa);
    window.location.href = '/admin/entreprises';
  };

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:48, height:48, borderRadius:'var(--radius-lg)', background:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#fff', fontSize:20 }}>S</span>
        </div>
        <Spinner size={32} style={{ margin:'0 auto' }}/>
        <p style={{ color:'var(--text-muted)', marginTop:16, fontSize:14 }}>Chargement de SIRHGP...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace/>;

  return (
    <AssistantProvider>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
        <Toaster
          position="top-right"
          containerStyle={{ top: 80, right: 16 }}
          toastOptions={{
            style: { background:'var(--bg-surface)', color:'var(--text-primary)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', fontSize:14 },
            duration: 3000,
          }}
        />

        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          {typeof window !== 'undefined' && localStorage.getItem('sirhgp-impersonation') && (
            <div style={{
              background:'#B45309', color:'#fff', padding:'8px 16px',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              fontSize:13, fontWeight:600, flexShrink:0,
            }}>
              <span>
                Impersonation active — cible : {JSON.parse(localStorage.getItem('sirhgp-impersonation') || '{}').cibleNom}
                {' '}(lecture seule, 15 min) · réel : {JSON.parse(localStorage.getItem('sirhgp-impersonation') || '{}').impersonatorNom}
              </span>
              <button
                onClick={stopImpersonation}
                style={{ border:'1px solid #fff', background:'transparent', color:'#fff',
                  borderRadius:'var(--radius-md)', padding:'4px 10px', cursor:'pointer', fontSize:12 }}
              >
                Quitter l'impersonation
              </button>
            </div>
          )}
          {user?.motDePasseTemporaire && (
            <div style={{ background:'#D97706', color:'#fff', padding:'6px 16px', fontSize:13, flexShrink:0 }}>
              Mot de passe temporaire actif — changez-le dans votre profil dès maintenant.
            </div>
          )}
          <Header onMenuClick={() => setMobileOpen(true)}/>
          <main style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'var(--bg-base)' }}>
            <div style={{ maxWidth:1400, margin:'0 auto', animation:'fadeIn 0.2s ease' }}>
              <Outlet/>
            </div>
          </main>

          <footer style={{
            padding:'12px 32px', background:'var(--bg-surface)', borderTop:'1px solid var(--border-default)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            fontSize:12, color:'var(--text-muted)', flexShrink:0,
          }}>
            <span>SIRHGP &copy; {new Date().getFullYear()} — Système d'Information RH & Gestion de Projets</span>
            <span>v1.0.0</span>
          </footer>
        </div>

        {/* Assistant SIRHGP — flottant, présent sur toutes les pages */}
        <AssistantPanel/>
      </div>
    </AssistantProvider>
  );
}