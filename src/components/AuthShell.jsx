// components/AuthShell.jsx — Shell partagé des pages publiques (landing, login, inscription)
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/useTheme';

const PANEL_STATS = [
  { value:'14', label:'Modules' },
  { value:'5', label:'Rôles' },
  { value:'100%', label:'Traçable' },
];

export default function AuthShell({ children }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg-base)' }}>
      {/* Panneau gauche — branding */}
      <div id="login-brand-panel" style={{
        display:'none', flex:'1', position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg, #2563EB, #1D4ED8)',
        color:'#fff', padding:48,
      }}>
        <div style={{ position:'absolute', inset:0, opacity:0.18, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'15%', left:'10%', width:320, height:320, borderRadius:'50%', background:'#14B8A6', filter:'blur(40px)' }} />
          <div style={{ position:'absolute', bottom:'10%', right:'15%', width:280, height:280, borderRadius:'50%', background:'#fff', filter:'blur(60px)' }} />
        </div>
        <div style={{ position:'relative', zIndex:2, height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:44, height:44, borderRadius:'var(--radius-lg)',
              background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-display)', fontWeight:800, fontSize:18,
            }}>SG</div>
            <div>
              <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, margin:0 }}>SIRHGP</p>
              <p style={{ fontSize:12, opacity:0.8, margin:0 }}>RH &amp; Gestion de Projets</p>
            </div>
          </div>
          <div style={{ maxWidth:420 }}>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:36, lineHeight:1.2, marginBottom:16, marginTop:0 }}>
              Gérez vos équipes et vos projets en toute fluidité.
            </h1>
            <p style={{ fontSize:17, opacity:0.9, lineHeight:1.6 }}>
              La plateforme tout-en-un pour piloter vos ressources humaines, suivre vos projets et garder une trace de chaque action.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginTop:36 }}>
              {PANEL_STATS.map(s => (
                <div key={s.label} style={{ borderRadius:'var(--radius-lg)', background:'rgba(255,255,255,0.1)', backdropFilter:'blur(8px)', padding:16 }}>
                  <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, margin:0 }}>{s.value}</p>
                  <p style={{ fontSize:12, opacity:0.85, marginTop:2 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize:12, opacity:0.7, margin:0 }}>© {new Date().getFullYear()} SIRHGP. Tous droits réservés.</p>
        </div>
      </div>

      {/* Panneau droit — contenu */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:-200, right:-200, width:600, height:600, borderRadius:'50%', background:'var(--color-primary)', opacity:0.05 }} />
          <div style={{ position:'absolute', bottom:-100, left:-150, width:400, height:400, borderRadius:'50%', background:'var(--color-accent)', opacity:0.05 }} />
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:'radial-gradient(circle at 1px 1px, var(--border-default) 1px, transparent 0)',
            backgroundSize:'32px 32px', opacity:0.4,
          }}/>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:20, position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:38, height:38, borderRadius:'var(--radius-md)',
              background:'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-display)', fontWeight:800, color:'#fff', fontSize:14,
            }}>SG</div>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, color:'var(--text-primary)' }}>SIRHGP</span>
          </div>
          <button onClick={toggleTheme} title="Changer le thème" style={{ border:'none', background:'var(--bg-surface)', cursor:'pointer', color:'var(--text-muted)', padding:9, borderRadius:'var(--radius-md)', display:'flex', boxShadow:'var(--shadow-soft)' }}>
            {isDark ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
        </div>

        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Carte centrée utilisée dans AuthShell (même style que la carte de connexion). */
export function AuthCard({ children, maxWidth = 420 }) {
  return (
    <div style={{ width:'100%', maxWidth, background:'var(--bg-surface)', borderRadius:'var(--radius-2xl)', boxShadow:'var(--shadow-elevated)', padding:40, border:'1px solid var(--border-default)', animation:'slideUp 0.4s ease' }}>
      {children}
    </div>
  );
}
