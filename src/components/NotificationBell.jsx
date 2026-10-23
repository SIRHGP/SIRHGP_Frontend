// components/NotificationBell.jsx
import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

function timeAgo(iso) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: fr });
  } catch {
    return '';
  }
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const escapeHandler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escapeHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escapeHandler);
    };
  }, []);

  /* Ancre du dropdown : le panneau s'aligne sur le bord droit du bouton cloche. */
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', width: 38, height: 38,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          background: open ? 'var(--bg-muted)' : 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-secondary)',
          transition: 'background var(--transition-fast)',
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'var(--color-danger)', color: '#fff',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-surface)',
            padding: '0 3px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        /* Centre de notifications : menu déroulant ancré sous la cloche (pattern dropdown du Header) */
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 480, maxWidth: 'calc(100vw - 32px)', maxHeight: 520,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 200,
          animation: 'slideDown 0.15s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-muted)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '1px 7px',
                  borderRadius: 'var(--radius-full)',
                  background: '#EF444420', color: '#EF4444',
                }}>
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Tout marquer comme lu"
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: 'var(--color-primary)', fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <Check size={12} /> Tout lire
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Vider"
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <Bell size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Aucune notification
                </p>
              </div>
            ) : notifications.map(notif => (
              // Icone unique : cloche neutre partout (aucune icone par type, aucun emoji).
              <div
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 16px',
                    borderBottom: '1px solid var(--border-muted)',
                    background: notif.read ? 'transparent' : '#64748B08',
                    cursor: 'pointer',
                    borderLeft: notif.read ? 'none' : '3px solid #64748B',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : '#64748B08'}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#64748B18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: '#64748B',
                  }}>
                    <Bell size={16} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: notif.read ? 400 : 700,
                      color: 'var(--text-primary)', margin: 0,
                    }}>
                      {notif.title}
                    </p>
                    <p style={{
                      fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {notif.body}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', opacity: 0.7 }}>
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>

                  {!notif.read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#64748B', flexShrink: 0, marginTop: 4,
                    }} />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}