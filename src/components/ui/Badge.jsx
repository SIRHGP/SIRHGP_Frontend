/**
 * Badge standardisé SIRHGP.
 * Variantes : default | primary | accent | success | warning | danger | info
 * @property {boolean} dot   Affiche un point coloré avant le texte
 * @property {string}  size  sm | md
 */
const badgeColors = {
  default: { bg: 'var(--bg-muted)',          color: 'var(--text-secondary)' },
  primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  accent:  { bg: 'var(--color-accent-light)', color: 'var(--color-accent)' },
  success: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-light)', color: '#B45309' },
  danger:  { bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' },
  info:    { bg: 'var(--color-info-light)',    color: 'var(--color-info)' },
  cyan:    { bg: 'var(--color-accent-light)',  color: 'var(--color-accent)' },
};

export function Badge({ children, variant='default', size='md', dot=false, style }) {
  const c = badgeColors[variant] || badgeColors.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '3px 9px' : '4px 11px',
      borderRadius: 'var(--radius-full)', fontSize: size === 'sm' ? 11 : 12, fontWeight: 600,
      background: c.bg, color: c.color, whiteSpace: 'nowrap', ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}