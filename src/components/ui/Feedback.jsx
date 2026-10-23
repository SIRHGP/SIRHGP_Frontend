import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const alertStyles = {
  success: { bg: 'var(--color-success-light)', border: 'var(--color-success)', color: '#065F46', Icon: CheckCircle },
  warning: { bg: 'var(--color-warning-light)', border: 'var(--color-warning)', color: '#92400E', Icon: AlertTriangle },
  danger:  { bg: 'var(--color-danger-light)',  border: 'var(--color-danger)',  color: '#991B1B', Icon: AlertCircle },
  info:    { bg: 'var(--color-info-light)',    border: 'var(--color-info)',    color: '#4C1D95', Icon: Info },
};

/** Spinner — indicateur de chargement. */
export function Spinner({ size = 24, color = 'var(--color-primary)', style }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid var(--border-default)`,
      borderTopColor: color, animation: 'spin 0.7s linear infinite', ...style,
    }} />
  );
}

/** Skeleton — placeholder de chargement (bloc grisé animé). */
export function Skeleton({ width = '100%', height = 16, radius = 'var(--radius-sm)', style }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-muted) 25%, var(--border-default) 50%, var(--bg-muted) 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', ...style,
    }} />
  );
}

/** Empty — état vide réutilisable. */
export function Empty({ title = 'Aucun résultat', description, icon, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
      {icon && <div style={{ marginBottom: 16, opacity: 0.4 }}>{icon}</div>}
      <p style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>{title}</p>
      {description && <p style={{ fontSize: 14 }}>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

/**
 * Alert — message d'information contextuel.
 * Variantes : success | warning | danger | info
 */
export function Alert({ variant = 'info', title, children, onClose }) {
  const { bg, border, color, Icon } = alertStyles[variant] || alertStyles.info;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Icon size={18} style={{ color: border, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        {title && <p style={{ fontWeight: 600, color, fontSize: 14, marginBottom: 4 }}>{title}</p>}
        <div style={{ fontSize: 13, color }}>{children}</div>
      </div>
      {onClose && <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color, padding: 2 }}><X size={16} /></button>}
    </div>
  );
}

/** LoadingPage — écran de chargement plein pour les pages. */
export function LoadingPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
      <Spinner size={32} />
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Chargement...</p>
    </div>
  );
}

/**
 * Progress — barre de progression standardisée.
 * @property {number} value     0-100
 * @property {string} color     Couleur (hex / var)
 * @property {string} size     sm | md (hauteur)
 * @property {boolean} showLabel  Affiche le pourcentage
 */
export function Progress({ value = 0, color = 'var(--color-primary)', size = 'md', showLabel, style }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div style={{ width: '100%', ...style }}>
      <div style={{ height: size === 'sm' ? 6 : 10, background: 'var(--bg-muted)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${clamped}%`, background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
      </div>
      {showLabel && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4, display: 'inline-block' }}>{clamped}%</span>}
    </div>
  );
}