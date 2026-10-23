import React from 'react';
import { Card, PageHeader, IconBox } from '../components/ui';
import { useTheme } from '../contexts/useTheme';
import { Sun, Moon, Monitor, Bell, Globe } from 'lucide-react';

function Section({ title, icon: _SectionIcon, children }) {
  return (
    <Card style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:16, borderBottom:'1px solid var(--border-default)' }}>
        <IconBox icon={_SectionIcon ? React.createElement(_SectionIcon, { size: 18 }) : null} color="var(--color-primary)" />
        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16 }}>{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border-muted)' }}>
      <div>
        <p style={{ fontWeight:500, fontSize:14 }}>{label}</p>
        {desc && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{desc}</p>}
      </div>
      <button onClick={onChange} style={{
        width:44, height:24, borderRadius:12, border:'none', cursor:'pointer',
        background:checked?'var(--color-primary)':'var(--border-strong)', position:'relative', transition:'background 0.2s',
      }}>
        <div style={{ position:'absolute', top:2, left:checked?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
      </button>
    </div>
  );
}

export default function Parametres() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Personnalisez votre expérience"/>
      <div style={{ maxWidth:720 }}>
        <Section title="Apparence" icon={Monitor}>
          <p style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:12 }}>Thème</p>
          <div style={{ display:'flex', gap:10 }}>
            {[
              { key:'light', label:'Clair', icon:Sun },
              { key:'dark',  label:'Sombre', icon:Moon },
            ].map(({ key, label, icon:_ThemeIcon }) => (
              <button key={key} onClick={() => { if(theme!==key) toggleTheme(); }}
                style={{
                  flex:1, padding:'16px 12px', border:`2px solid ${theme===key?'var(--color-primary)':'var(--border-default)'}`,
                  borderRadius:'var(--radius-lg)', background:theme===key?'var(--color-primary-light)':'var(--bg-muted)',
                  cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                  transition:'all var(--transition-fast)',
                }}>
                {_ThemeIcon && React.createElement(_ThemeIcon, { size: 20, style: { color:theme===key?'var(--color-primary)':'var(--text-muted)' } })}
                <span style={{ fontSize:13, fontWeight:600, color:theme===key?'var(--color-primary)':'var(--text-secondary)' }}>{label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Notifications" icon={Bell}>
          <Toggle label="Notifications email" desc="Recevoir les alertes par email" checked={true} onChange={()=>{}}/>
          <Toggle label="Rappels d'événements" desc="Rappels avant les réunions" checked={true} onChange={()=>{}}/>
          <Toggle label="Alertes projets en retard" desc="Notifier quand un projet dépasse la date" checked={false} onChange={()=>{}}/>
        </Section>

        <Section title="Langue & Région" icon={Globe}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:500, color:'var(--text-secondary)', marginBottom:6 }}>Langue</p>
              <select style={{ padding:'9px 12px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:14, width:'100%' }}>
                <option>Français</option>
                <option>English</option>
              </select>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:500, color:'var(--text-secondary)', marginBottom:6 }}>Devise</p>
              <select style={{ padding:'9px 12px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:14, width:'100%' }}>
                <option>XAF — Franc CFA</option>
                <option>EUR — Euro</option>
                <option>USD — Dollar US</option>
              </select>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

