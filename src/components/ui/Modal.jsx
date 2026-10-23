import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/**
 * Modal — boîte de dialogue modale standardisée.
 * @property {boolean} open
 * @property {function} onClose
 * @property {string} title
 * @property {node} footer
 * @property {number|string} width  Largeur max (px), défaut 560
 */
export function Modal({ open, onClose, title, children, width = 560, footer, size, } ) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)',
        width: '100%', maxWidth: size ?? width, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        animation: 'scaleIn 0.2s ease',
      }}>
        {(title || onClose) && (
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
            <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>
        )}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)' }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Confirm — Modal de confirmation avec boutons Annuler/Confirmer. */
export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', variant = 'danger', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirmer'} width={400}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      }
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

/**
 * Drawer — panneau latéral coulissant (droite par défaut).
 */
export function Drawer({ open, onClose, title, children, footer, width = 420, position = 'right' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  const isLeft = position === 'left';
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, bottom: 0, width, zIndex: 1001, maxWidth: '100vw',
        [isLeft ? 'left' : 'right']: 0,
        background: 'var(--bg-surface)', boxShadow: 'var(--shadow-elevated)', display: 'flex', flexDirection: 'column',
        animation: isLeft ? 'slideLeft 0.25s ease' : 'slideIn 0.25s ease',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)' }}>{footer}</div>}
      </div>
    </>
  );
}