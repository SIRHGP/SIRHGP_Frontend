import { useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Dropdown — menu déroulant standardisé.
 * @property {string}  label       Texte du bouton déclencheur
 * @property {node}    icon        Icône du bouton
 * @property {object[]} items       [{ label, icon?, onClick?, danger? }]
 * @property {string}  align       left | right (alignement du menu)
 * @property {boolean} disabled
 */
export function Dropdown({ label, icon, items = [], align = 'right', disabled, size = 'md' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        type="button" disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: size === 'sm' ? '6px 12px' : '9px 14px',
          border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)',
          color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)', transition: 'all var(--transition-fast)', opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'var(--bg-muted)')}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
      >
        {icon}
        {label}
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', zIndex: 300, minWidth: 180,
          [align]: 0,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-elevated)', padding: 6, animation: 'scaleIn 0.15s ease',
        }}>
          {items.map((item, i) => item.divider ? (
            <div key={'d' + i} style={{ height: 1, background: 'var(--border-muted)', margin: '4px 0' }} />
          ) : (
            <button
              key={i} type="button"
              onClick={() => { setOpen(false); item.onClick?.(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, background: 'transparent',
                color: item.danger ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: 500, textAlign: 'left',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'var(--color-danger-light)' : 'var(--bg-muted)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {items.length === 0 && <div style={{ padding: 8, fontSize: 13, color: 'var(--text-muted)' }}>Aucune action</div>}
        </div>
      )}
    </div>
  );
}