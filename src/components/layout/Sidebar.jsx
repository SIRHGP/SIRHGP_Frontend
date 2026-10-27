// Sidebar.jsx — version corrigée avec séparation des droits cohérente

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, FileText,
  Calendar, File, Settings, ChevronLeft, ChevronRight,
  Shield, Building2, Briefcase, Zap, LogOut, ChevronDown, X, Activity,
  Bot, Sparkles, Network, UserPlus, Clock, ClipboardList, CalendarRange,
  MapPin, Globe
} from 'lucide-react';
import { useAuth } from '../../contexts/Authcontext';
import { useAssistant } from '../../contexts/AssistantContext';
import { Avatar } from '../../components/ui/index';

// RÈGLES D'ACCÈS PAR RÔLE
// Chaque entrée peut avoir :
//   roles     → tableau de rôles autorisés (si absent = tout le monde)
//   minRole   → niveau minimum (SUPER_ADMIN > ADMIN > MANAGER > STAFF > STAGIAIRE)
//   Les enfants héritent des règles du parent (si le parent est caché, les enfants aussi)

const ROLE_HIERARCHY = ['STAGIAIRE', 'SECRETAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];

const MENU = [
  {
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['ADMIN', 'MANAGER', 'LEAD'],
  },
  {
    label: 'Ressources humaines',
    icon: Users,
    roles: ['ADMIN', 'MANAGER', 'LEAD', 'STAFF', 'STAGIAIRE', 'SECRETAIRE'], // les enfants non autorisés restent filtrés par leur propre `roles`
    children: [
      {
        label: 'Employés',
        icon: Users,
        path: '/employes',
        roles: ['ADMIN', 'MANAGER', 'LEAD', 'SECRETAIRE'], // secrétaire : liste de présence de sa succursale
      },
      {
        label: 'Structure',
        icon: Building2,
        path: '/departements',
        roles: ['ADMIN', 'MANAGER', 'LEAD'],
      },
      {
        label: 'Paie',
        icon: FileText,
        path: '/paie',
        roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LEAD', 'STAFF', 'STAGIAIRE', 'SECRETAIRE'], // accès borné par le backend au périmètre du rôle
      },
      {
        label: 'Recrutement',
        icon: UserPlus,
        path: '/recrutement',
        roles: ['ADMIN', 'MANAGER', 'LEAD'],
      },
      {
        label: 'Timesheet',
        icon: Clock,
        path: '/timesheet',
        roles: ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'],
      },
      {
        label: 'Évaluations',
        icon: ClipboardList,
        path: '/evaluations',
        roles: ['LEAD', 'MANAGER', 'ADMIN'],
      },
    ]
  },
  {
    label: 'Gestion de projets',
    icon: FolderKanban,
    roles: ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'],
    children: [
      {
        label: 'Projets',
        icon: FolderKanban,
        path: '/projets',
        roles: ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'],
      },
      {
        label: 'Tâches',
        icon: CheckSquare,
        path: '/taches',
        roles: ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'],
      },
      {
        label: 'Gantt',
        icon: CalendarRange,
        path: '/gantt',
        roles: ['STAFF', 'MANAGER', 'ADMIN'],
      },
    ]
  },
  {
    label: 'Factures',
    icon: FileText,
    path: '/factures',
    roles: ['MANAGER', 'ADMIN'],
  },
  {
    label: 'Événements',
    icon: Calendar,
    path: '/evenements',
    roles: ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'],
  },
  {
    label: 'Documents',
    icon: File,
    path: '/documents',
    roles: ['STAGIAIRE', 'STAFF', 'LEAD', 'MANAGER', 'ADMIN', 'SECRETAIRE'],
  },
  {
    label: 'Administration',
    icon: Shield,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    children: [
      { label: 'Entreprises', icon: Building2, path: '/admin/entreprises', roles: ['SUPER_ADMIN'] },
      { label: 'Plateforme', icon: Sparkles, path: '/admin/plateforme', roles: ['SUPER_ADMIN'] },
      { label: 'Rôles', icon: Shield, path: '/admin/roles', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Permissions', icon: Zap, path: '/admin/permissions', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Actions', icon: Settings, path: '/admin/actions', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Audit & Traçabilité', icon: Activity, path: '/admin/audit', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LEAD'] },
    ]
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const { toggleAssistant } = useAssistant();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  // ── Utilitaires de rôle ──────────────────────────────────────────────────
  const getRoleLevel = (roleName) => ROLE_HIERARCHY.indexOf(roleName ?? '');
  const userLevel = getRoleLevel(user?.roleName);

  /**
   * Vérifie si l'utilisateur courant peut voir un élément de menu.
   * Priorité : roles (liste exacte) > minRole (niveau minimum)
   */
  const canSee = (item) => {
    if (!user) return false;

    // Liste de rôles explicite → vérification exacte
    if (item.roles) {
      return item.roles.includes(user.roleName);
    }

    // Niveau minimum requis
    if (item.minRole) {
      return userLevel >= getRoleLevel(item.minRole);
    }

    // Aucune restriction → visible par tous
    return true;
  };

  /**
   * Filtre récursif des enfants d'un groupe.
   * Un enfant sans restriction est visible si le parent l'est.
   */
  const filterChildren = (children) =>
    children?.filter(child => canSee(child)) ?? [];

  const toggleGroup = (label) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const isActive = (path) => location.pathname === path;
  const isGroupActive = (children) =>
    children?.some(c => location.pathname === c.path);

  // ── Styles ───────────────────────────────────────────────────────────────
  const sidebarStyle = {
    width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
    minHeight: '100vh',
    background: 'var(--bg-sidebar)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width var(--transition-base)',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    zIndex: 20,
  };

  // ── Rendu d'un élément ───────────────────────────────────────────────────
  const renderItem = (item) => {
    if (!canSee(item)) return null;

    // ── Groupe avec enfants ──
    if (item.children) {
      const allowedChildren = filterChildren(item.children);
      if (allowedChildren.length === 0) return null; // groupe vide → caché

      const groupActive = isGroupActive(allowedChildren);
      const open = openGroups[item.label] ?? groupActive;

      if (collapsed) {
        return (
          <div key={item.label} style={{ position: 'relative', margin: '2px 8px' }}>
            <div style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              background: groupActive ? 'var(--bg-sidebar-active)' : 'transparent',
              display: 'flex',
              justifyContent: 'center',
              color: groupActive ? '#fff' : 'var(--text-sidebar)',
            }}>
              <item.icon size={20} />
            </div>
          </div>
        );
      }

      return (
        <div key={item.label} style={{ margin: '2px 0' }}>
          <button
            onClick={() => toggleGroup(item.label)}
            style={{
              width: 'calc(100% - 16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: groupActive ? '#fff' : 'var(--text-sidebar)',
              borderRadius: 'var(--radius-md)',
              margin: '1px 8px',
            }}
          >
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              fontWeight: groupActive ? 600 : 400,
            }}>
              <item.icon size={18} />
              {item.label}
            </span>
            <ChevronDown
              size={14}
              style={{
                transform: open ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform var(--transition-fast)',
              }}
            />
          </button>

          {open && (
            <div style={{ paddingLeft: 16 }}>
              {allowedChildren.map(child => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  onClick={onMobileClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 12px',
                    margin: '1px 8px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    color: isActive(child.path) ? '#fff' : 'var(--text-sidebar)',
                    background: isActive(child.path) ? 'var(--bg-sidebar-active)' : 'transparent',
                    fontWeight: isActive(child.path) ? 600 : 400,
                    textDecoration: 'none',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive(child.path))
                      e.currentTarget.style.background = 'var(--bg-sidebar-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive(child.path))
                      e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <child.icon size={16} />
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ── Lien simple ──
    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: collapsed ? '12px' : '9px 12px',
          margin: '1px 8px',
          borderRadius: 'var(--radius-md)',
          color: isActive(item.path) ? '#fff' : 'var(--text-sidebar)',
          background: isActive(item.path) ? 'var(--bg-sidebar-active)' : 'transparent',
          fontWeight: isActive(item.path) ? 600 : 400,
          fontSize: 14,
          textDecoration: 'none',
          transition: 'background var(--transition-fast)',
          justifyContent: collapsed ? 'center' : undefined,
        }}
        onMouseEnter={e => {
          if (!isActive(item.path))
            e.currentTarget.style.background = 'var(--bg-sidebar-hover)';
        }}
        onMouseLeave={e => {
          if (!isActive(item.path))
            e.currentTarget.style.background = 'transparent';
        }}
      >
        <item.icon size={20} />
        {!collapsed && <span>{item.label}</span>}
        {isActive(item.path) && !collapsed && (
          <div style={{
            marginLeft: 'auto',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--color-primary)',
          }} />
        )}
      </NavLink>
    );
  };

  // ── Badge rôle coloré dans le footer ────────────────────────────────────
  const ROLE_COLORS = {
    SUPER_ADMIN: '#8B5CF6',
    SECRETAIRE: '#EC4899',
    ADMIN: '#2563EB',
    MANAGER: '#10B981',
    STAFF: '#F59E0B',
    STAGIAIRE: '#6B7280',
  };

  // ── Badge de périmètre (hiérarchie entreprise → succursale → département) ─
  // ADMIN voit son entreprise, MANAGER sa succursale, LEAD son département,
  // SUPER_ADMIN la plateforme entière. Champs portés par user (login/profile).
  const scopeInfo = (() => {
    if (!user) return null;
    const iconStyle = { color: 'var(--color-primary-light, #93C5FD)', flexShrink: 0 };
    const role = user.roleName;
    if (role === 'SUPER_ADMIN') {
      return { label: 'Périmètre', value: user.entrepriseNom || 'Toutes les entreprises', icon: <Globe size={15} style={iconStyle} /> };
    }
    if (role === 'MANAGER') {
      return { label: 'Succursale', value: user.sucursalName || user.entrepriseNom, icon: <MapPin size={15} style={iconStyle} /> };
    }
    if (role === 'LEAD') {
      return {
        label: 'Département',
        value: user.departementNom || user.departementName || user.sucursalName || user.entrepriseNom,
        icon: <Briefcase size={15} style={iconStyle} />,
      };
    }
    return { label: 'Entreprise', value: user.entrepriseNom, icon: <Building2 size={15} style={iconStyle} /> };
  })();

  const content = (
    <div style={sidebarStyle}>
      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 12,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 18,
              color: '#fff',
              letterSpacing: '-0.5px',
            }}>SIRHGP</p>
            <p style={{
              fontSize: 10,
              color: 'var(--text-sidebar)',
              opacity: 0.6,
              marginTop: 2,
            }}>Système RH & Projets</p>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: '#fff',
              fontSize: 14,
            }}>S</span>
          </div>
        )}
        <button
          onClick={onMobileClose}
          style={{
            display: 'none',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--text-sidebar)',
            padding: 4,
          }}
          className="mobile-close"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Badge de périmètre de l'utilisateur connecté ── */}
      {scopeInfo?.value && (
        collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <div
              title={`${scopeInfo.label} : ${scopeInfo.value}`}
              style={{
                width: 30, height: 30,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {scopeInfo.icon}
            </div>
          </div>
        ) : (
          <div style={{
            margin: '0 12px 12px', padding: '7px 10px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {scopeInfo.icon}
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-sidebar)', opacity: 0.5,
              }}>{scopeInfo.label}</p>
              <p style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{scopeInfo.value}</p>
            </div>
          </div>
        )
      )}

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 0 16px' }}>
        {!collapsed && (
          <p style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-sidebar)',
            opacity: 0.4,
            padding: '8px 20px 4px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>Navigation</p>
        )}
        {MENU.map(renderItem)}
      </nav>

      {/* ── Assistant SIRHGP (remplace l'ancien bloc d'aide statique) ── */}
      {!collapsed && (
        <div style={{ padding: '0 12px 12px', flexShrink: 0 }}>
          <div style={{
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            padding: 16, color: '#fff',
            boxShadow: 'var(--shadow-soft)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Bot size={18} />
              <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, margin:0 }}>
                Assistant SIRHGP
              </p>
            </div>
            <p style={{ fontSize:12, opacity:0.85, lineHeight:1.5, margin:'6px 0 12px' }}>
              Créez, recherchez et pilotez la plateforme en langage naturel.
            </p>
            <button
              onClick={toggleAssistant}
              style={{
                width: '100%', border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.16)',
                color: '#fff', padding: '9px 0', borderRadius: 'var(--radius-md)',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                backdropFilter: 'blur(4px)', transition: 'background var(--transition-fast)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.26)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
            >
              <Sparkles size={13} />
              Ouvrir l’assistant
            </button>
          </div>
        </div>
      )}

      {/* ── Footer utilisateur ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: collapsed ? '12px 8px' : '12px',
      }}>
        {!collapsed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px',
            borderRadius: 'var(--radius-md)',
          }}>
            <Avatar name={user?.name || 'U'} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{user?.name}</p>
              {/* Badge rôle coloré */}
              <span style={{
                display: 'inline-block',
                marginTop: 2,
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 7px',
                borderRadius: 'var(--radius-full)',
                background: (ROLE_COLORS[user?.roleName] || '#6B7280') + '30',
                color: ROLE_COLORS[user?.roleName] || '#6B7280',
                letterSpacing: '0.04em',
              }}>
                {user?.roleName === 'SECRETAIRE' ? 'Secrétaire' : user?.roleName}
              </span>
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--text-sidebar)',
                opacity: 0.6,
                padding: 6,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar name={user?.name || 'U'} size={36} />
          </div>
        )}

        <button
          onClick={onToggle}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '7px',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.04)',
            cursor: 'pointer',
            color: 'var(--text-sidebar)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Réduire</span></>
          }
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', flexShrink: 0 }} className="sidebar-desktop">
        {content}
      </div>
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={onMobileClose}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ ...sidebarStyle, width: 'var(--sidebar-width)' }}>
              {content.props.children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
