// Header.jsx — version corrigée
import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Sun, Moon, Settings, LogOut, User } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useAuth } from '../../contexts/Authcontext';
import NotificationBell from '../NotificationBell';
import { Avatar } from '../ui';

const BREADCRUMBS = {
  '/':                  ['Tableau de bord'],
  '/employes':          ['RH', 'Employés'],
  '/departements':      ['RH', 'Départements'],
  '/postes':            ['RH', 'Postes'],
  '/projets':           ['Projets', 'Liste'],
  '/taches':            ['Projets', 'Tâches'],
  '/factures':          ['Factures'],
  '/evenements':        ['Événements'],
  '/documents':         ['Documents'],
  '/profil':            ['Mon profil'],
  '/parametres':        ['Paramètres'],
  '/admin/roles':       ['Admin', 'Rôles'],
  '/admin/permissions': ['Admin', 'Permissions'],
  '/admin/actions':     ['Admin', 'Actions'],
};

export default function Header({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();    
  const { user, logout }       = useAuth();
  const location               = useLocation();
  const [dropOpen, setDropOpen] = useState(false);

  const crumbs = BREADCRUMBS[location.pathname] || ['Page'];

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 16,
      boxShadow: 'var(--shadow-xs)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>

      {/* Bouton menu mobile */}
      <button
        onClick={onMenuClick}
        className="mobile-menu-btn"
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: 8,
          borderRadius: 'var(--radius-md)',
          display: 'none', alignItems: 'center',
        }}
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>/</span>
            )}
            <span style={{
              fontSize: 14,
              fontWeight: i === crumbs.length - 1 ? 600 : 400,
              color: i === crumbs.length - 1
                ? 'var(--text-primary)'
                : 'var(--text-muted)',
            }}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {/* Actions droite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Toggle thème */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 8,
            borderRadius: 'var(--radius-md)',
            display: 'flex', transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* ✅ Cloche notifications — l'ancienne Bell hardcodée est supprimée */}
        <NotificationBell />

        {/* Dropdown utilisateur */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
          >
            <Avatar name={user?.name || 'U'} size={28} />
            <div style={{ textAlign: 'left' }}>
              <p style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--text-primary)', lineHeight: 1.2,
              }}>
                {user?.name?.split(' ')[0]}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {user?.roleName}
              </p>
            </div>
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 200,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden', zIndex: 200,
              animation: 'slideDown 0.15s ease',
            }}>

              {/* Infos utilisateur */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-default)',
              }}>
                <p style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--text-primary)',
                }}>
                  {user?.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {user?.email}
                </p>
              </div>

              {/* Liens */}
              {[
                { label: 'Mon profil', icon: User,     to: '/profil'     },
                { label: 'Paramètres', icon: Settings, to: '/parametres' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setDropOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px',
                    color: 'var(--text-secondary)',
                    fontSize: 14, textDecoration: 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}

              {/* Déconnexion */}
              <div style={{ borderTop: '1px solid var(--border-default)' }}>
                <button
                  onClick={() => { setDropOpen(false); logout(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px',
                    color: 'var(--color-danger)',
                    fontSize: 14, border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
