// pages/RegisterEntreprise.jsx — Inscription : création d'une entreprise + son compte administrateur
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/Authcontext';
import { authApi } from '../Api';
import { Input, Select, Button, Alert } from '../components/ui';
import { TYPE_OPTIONS } from './admin/entreprises.meta';
import { portailFor } from '../roles';
import toast, { Toaster } from 'react-hot-toast';
import AuthShell, { AuthCard } from '../components/AuthShell';

export default function RegisterEntreprise() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [signup, setSignup] = useState({
    entrepriseNom:'', type:'PME', secteurActivite:'', ville:'', telephone:'',
    adminNom:'', adminEmail:'', motDePasse:'',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Utilisateur connecté → son portail selon le rôle
  if (user) return <Navigate to={portailFor(user.roleName)} replace/>;

  const setSignupField = (k) => (e) => setSignup(s => ({ ...s, [k]: e.target.value }));

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await authApi.registerEntreprise(signup);
      toast.success('Entreprise créée ! Connectez-vous.');
      // Redirection vers la connexion avec l'email admin prérempli
      navigate('/login', { state: { email: signup.adminEmail } });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création de l\'entreprise');
      setLoading(false);
    }
  };

  return (
    <div>
      <Toaster position="top-center"/>
      <AuthShell>
        <AuthCard maxWidth={460}>
          <button type="button" onClick={() => navigate('/')}
            style={{ display:'flex', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13, padding:0, marginBottom:12 }}>
            <ArrowLeft size={15}/> Retour à l'accueil
          </button>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--text-primary)', marginBottom:8, letterSpacing:'-0.5px' }}>Créer une entreprise</h2>
          <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:24 }}>L'entreprise et son compte administrateur seront créés ensemble.</p>

          <form onSubmit={handleSignup} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input
              label="Nom de l'entreprise"
              required
              leftIcon={<Building2 size={16}/>}
              value={signup.entrepriseNom}
              onChange={setSignupField('entrepriseNom')}
              placeholder="ex: SIRHGP SARL"
            />
            <Select
              label="Type d'entreprise"
              value={signup.type}
              onChange={setSignupField('type')}
              placeholder={null}
              options={TYPE_OPTIONS}
            />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Secteur d'activité" value={signup.secteurActivite} onChange={setSignupField('secteurActivite')} placeholder="ex: Informatique"/>
              <Input label="Ville" value={signup.ville} onChange={setSignupField('ville')} placeholder="ex: Yaoundé"/>
            </div>
            <Input label="Téléphone" type="tel" value={signup.telephone} onChange={setSignupField('telephone')} placeholder="ex: +237 6XX XXX XXX"/>

            <div style={{ height:1, background:'var(--border-default)', margin:'6px 0' }}/>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)', margin:0, textTransform:'uppercase', letterSpacing:'0.5px' }}>
              <Shield size={12} style={{ verticalAlign:'-2px', marginRight:4, color:'var(--color-primary)' }}/>Compte administrateur
            </p>

            <Input label="Nom complet" required value={signup.adminNom} onChange={setSignupField('adminNom')} placeholder="ex: Jean Kamga"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Input label="Email" type="email" name="username" autoComplete="username" required value={signup.adminEmail} onChange={setSignupField('adminEmail')} placeholder="admin@entreprise.cm"/>
              <Input label="Mot de passe" type="password" autoComplete="new-password" required minLength={8} value={signup.motDePasse} onChange={setSignupField('motDePasse')} placeholder="8 caractères min."/>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Button type="submit" disabled={loading} loading={loading} style={{ width:'100%', padding:'13px', marginTop:4, fontSize:15 }} rightIcon={<ArrowRight size={18}/>}>
              {loading ? 'Création...' : "Créer l'entreprise"}
            </Button>
          </form>
        </AuthCard>
      </AuthShell>
    </div>
  );
}
