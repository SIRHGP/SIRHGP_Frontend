import { Loader2 } from 'lucide-react';

/**
 * Composant Button standardisé SIRHGP.
 *
 * Variantes : primary | secondary | danger | ghost | outline | success
 * Tailles    : sm | md | lg
 * Props : loading, leftIcon, rightIcon, disabled, onClick, type, className, style
 *
 * <Button variant="primary" leftIcon={<Plus size={16}/>}>Ajouter</Button>
 */
export function Button({
  children, variant='primary', size='md', disabled, loading, loadingText,
  onClick, type='button', style, className, leftIcon, rightIcon, ...rest
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 600, cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 'var(--radius-md)', transition: 'all var(--transition-fast)',
    opacity: disabled || loading ? 0.6 : 1, boxShadow: 'var(--shadow-soft)',
    padding: size === 'sm' ? '6px 14px' : size === 'lg' ? '12px 24px' : '9px 18px',
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    ...(variant === 'primary'   ? { background: 'var(--color-primary)', color: '#fff' }
      : variant === 'secondary' ? { background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', boxShadow: 'none' }
      : variant === 'danger'    ? { background: 'var(--color-danger)', color: '#fff' }
      : variant === 'ghost'     ? { background: 'transparent', color: 'var(--text-secondary)', boxShadow: 'none' }
      : variant === 'outline'   ? { background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', boxShadow: 'none' }
      : variant === 'success'   ? { background: 'var(--color-success)', color: '#fff' }
      : {}),
  };
  return (
    <button
      type={type || 'button'}
      disabled={disabled || loading}
      onClick={onClick}
      style={{ ...base, ...style }}
      className={className}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.filter = 'brightness(0.92)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
      {...rest}
    >
      {loading && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
      {!loading && leftIcon}
      {loading && loadingText ? <span>{loadingText}</span> : children}
      {!loading && rightIcon}
    </button>
  );
}