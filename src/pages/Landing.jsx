// pages/Landing.jsx — Point d'entrée public : choix entre créer une entreprise ou rejoindre la sienne
import { Navigate } from 'react-router-dom';
import { Building2, LogIn, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';
import { portailFor } from '../roles';
import AuthShell, { AuthCard } from '../components/AuthShell';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

// Utilisateur connecté → son portail selon le rôle (/ est la landing publique)
  if (user) return <Navigate to={portailFor(user.roleName)} replace/>;

  const primaryButton = {
    width:'100%', padding:'13px', border:'none', borderRadius:'var(--radius-md)',
    background:'var(--color-primary)', color:'#fff', fontSize:15, fontWeight:600,
    cursor:'pointer', display:'flex', alignItems:'center',
    justifyContent:'center', gap:10,
    boxShadow:'0 4px 14px rgba(37,99,235,0.4)', transition:'all var(--transition-fast)',
  };
  const secondaryButton = {
    width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
    padding:'12px', borderRadius:'var(--radius-md)', border:'1px solid var(--border-default)',
    background:'transparent', color:'var(--text-secondary)', fontSize:14, fontWeight:600, cursor:'pointer',
    transition:'background var(--transition-fast)',
  };

  return (
    <AuthShell>
      <AuthCard>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:'var(--text-primary)', marginBottom:8, letterSpacing:'-0.5px' }}>
          Bienvenue sur SIRHGP
        </h2>
        <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:28, lineHeight:1.6 }}>
          Gérez vos ressources humaines et vos projets. Que souhaitez-vous faire ?
        </p>

        <button type="button" onClick={() => navigate('/register')} style={primaryButton}
          onMouseEnter={e => e.currentTarget.style.background='var(--color-primary-dark)'}
          onMouseLeave={e => e.currentTarget.style.background='var(--color-primary)'}>
          <Building2 size={18}/>
          Créer une nouvelle entreprise
          <ArrowRight size={18}/>
        </button>

        <div style={{ margin:'24px 0', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, height:1, background:'var(--border-default)' }} />
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>ou</span>
          <div style={{ flex:1, height:1, background:'var(--border-default)' }} />
        </div>

        <button type="button" onClick={() => navigate('/login')} style={secondaryButton}
          onMouseEnter={e => e.currentTarget.style.background='var(--bg-muted)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <LogIn size={16} style={{ color:'var(--color-primary)' }}/>
          Rejoindre votre entreprise
        </button>

        <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', margin:'20px 0 0' }}>
          Déjà un compte ? Connectez-vous pour accéder à votre espace.
        </p>
      </AuthCard>
    </AuthShell>
  );
}