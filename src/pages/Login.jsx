import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/Authcontext';
import { useTheme } from '../contexts/Themecontext';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function Login() {
  const { user, login } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [form, setForm] = useState({ email:'', password:'' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace/>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      toast.success('Bienvenue !');
    } catch (err) {
       const message = err.response?.data?.message || 
                    err.response?.data?.data?.message || 
                    'Identifiants incorrects';
    setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width:'100%', padding:'12px 14px 12px 44px',
    border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)',
    fontSize:15, fontFamily:'var(--font-sans)', background:'var(--bg-muted)',
    color:'var(--text-primary)', outline:'none', transition:'all var(--transition-fast)',
  };

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg-base)', position:'relative', overflow:'hidden',
    }}>
      <Toaster position="top-center"/>
      {/* Background decoration */}
      <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:-200, right:-200, width:600, height:600, borderRadius:'50%', background:'var(--color-primary)', opacity:0.04 }}/>
        <div style={{ position:'absolute', bottom:-100, left:-150, width:400, height:400, borderRadius:'50%', background:'var(--color-accent)', opacity:0.04 }}/>
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'radial-gradient(circle at 1px 1px, var(--border-default) 1px, transparent 0)',
          backgroundSize:'32px 32px', opacity:0.5,
        }}/>
      </div>

      <div style={{ width:'100%', maxWidth:420, padding:'0 20px', position:'relative', animation:'slideUp 0.4s ease' }}>
        {/* Card */}
        <div style={{ background:'var(--bg-surface)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-xl)', padding:'40px', border:'1px solid var(--border-default)' }}>
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <div style={{
              width:56, height:56, borderRadius:'var(--radius-lg)', background:'var(--color-primary)',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px',
              boxShadow:'0 8px 24px rgba(37,99,235,0.35)',
            }}>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#fff', fontSize:24 }}>S</span>
            </div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.5px', marginBottom:8 }}>
              SIRHGP
            </h1>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>Système d'Information RH & Gestion de Projets</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                Adresse email
              </label>
              <div style={{ position:'relative' }}>
                <Mail size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="vous@sirhgp.cm"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor='var(--color-primary)'; e.currentTarget.style.background='var(--bg-surface)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor='var(--border-default)'; e.currentTarget.style.background='var(--bg-muted)'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom:error?16:24 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                Mot de passe
              </label>
              <div style={{ position:'relative' }}>
                <Lock size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
                <input
                  type={showPwd?'text':'password'} required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight:46 }}
                  onFocus={e => { e.currentTarget.style.borderColor='var(--color-primary)'; e.currentTarget.style.background='var(--bg-surface)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor='var(--border-default)'; e.currentTarget.style.background='var(--bg-muted)'; }}
                />
                <button type="button" onClick={() => setShowPwd(s=>!s)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}>
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom:16, padding:'10px 14px', background:'var(--color-danger-light)', borderRadius:'var(--radius-md)', color:'var(--color-danger)', fontSize:13, display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(239,68,68,0.2)' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width:'100%', padding:'13px', border:'none', borderRadius:'var(--radius-md)',
                background:'var(--color-primary)', color:'#fff', fontSize:15, fontWeight:600,
                cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center',
                justifyContent:'center', gap:10, opacity:loading?0.8:1,
                boxShadow:'0 4px 14px rgba(37,99,235,0.4)', transition:'all var(--transition-fast)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background='var(--color-primary-dark)'; }}
              onMouseLeave={e => e.currentTarget.style.background='var(--color-primary)'}
            >
              {loading ? <><Loader2 size={18} style={{ animation:'spin 0.8s linear infinite' }}/> Connexion...</> : 'Se connecter'}
            </button>
          </form>

          {/* Demo hint */}
          <div style={{ marginTop:20, padding:'10px 14px', background:'var(--bg-muted)', borderRadius:'var(--radius-md)', fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
            <strong>Démo :</strong> superadmin@sirhgp.cm / SuperAdmin123!
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <button onClick={toggleTheme} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13 }}>
            {isDark ? '☀ Mode clair' : '🌙 Mode sombre'}
          </button>
        </div>
      </div>
    </div>
  );
}