import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search, AlertCircle, CheckCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

const s = {
  btn: (variant='primary', size='md', disabled=false) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 'var(--radius-md)', transition: 'all var(--transition-fast)',
    opacity: disabled ? 0.6 : 1,
    padding: size === 'sm' ? '6px 14px' : size === 'lg' ? '12px 24px' : '9px 18px',
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    ...(variant === 'primary' ? {
      background: 'var(--color-primary)', color: '#fff',
    } : variant === 'secondary' ? {
      background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-default)',
    } : variant === 'danger' ? {
      background: 'var(--color-danger)', color: '#fff',
    } : variant === 'ghost' ? {
      background: 'transparent', color: 'var(--text-secondary)',
    } : variant === 'outline' ? {
      background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)',
    } : variant === 'success' ? {
      background: 'var(--color-success)', color: '#fff',
    } : {}),
  }),
};

export function Button({ children, variant='primary', size='md', disabled, loading, onClick, type='button', style, className }) {
  return (
    <button
      type={type} disabled={disabled || loading} onClick={onClick}
      style={{ ...s.btn(variant, size, disabled || loading), ...style }}
      className={className}
      onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.filter = 'brightness(0.92)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
    >
      {loading && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
      {children}
    </button>
  );
}

export function Input({ label, error, leftIcon, rightIcon, type='text', style, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {leftIcon && <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', display:'flex' }}>{leftIcon}</span>}
        <input
          type={type}
          style={{
            width: '100%', padding: leftIcon ? '9px 12px 9px 38px' : '9px 12px',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'var(--font-sans)',
            background: 'var(--bg-surface)', color: 'var(--text-primary)',
            transition: 'border-color var(--transition-fast)', outline: 'none',
            paddingRight: rightIcon ? 38 : 12, boxSizing: 'border-box',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--border-default)'}
          {...props}
        />
        {rightIcon && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', display:'flex' }}>{rightIcon}</span>}
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--color-danger)', display:'flex', alignItems:'center', gap:4 }}><AlertCircle size={12}/>{error}</span>}
    </div>
  );
}

export function Textarea({ label, error, style, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
      <textarea
        style={{
          width: '100%', padding: '9px 12px',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'var(--font-sans)',
          background: 'var(--bg-surface)', color: 'var(--text-primary)',
          resize: 'vertical', minHeight: 100, outline: 'none', boxSizing: 'border-box',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={e => e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--border-default)'}
        {...props}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  );
}

function normalizeOpt(o) {
  if (o === null || o === undefined) return null;
  if (typeof o !== 'object') return { value: String(o), label: String(o) };
  const rawVal = o.value;
  const val = rawVal != null
    ? (typeof rawVal === 'object' ? String(rawVal.id ?? '') : String(rawVal))
    : '';
  const rawLabel = o.label;
  const lbl = rawLabel != null ? String(rawLabel) : val;
  return { value: val, label: lbl };
}

export function Select({ label, error, options = [], style, value, onChange, placeholder = 'Sélectionner...' }) {
  const normalized = options.map(normalizeOpt).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <select
          value={value ?? ''}
          onChange={onChange}
          style={{
            width: '100%', padding: '9px 36px 9px 12px', appearance: 'none',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'var(--font-sans)',
            background: 'var(--bg-surface)',
            color: (value !== '' && value != null) ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer', outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
        >
          <option value="" disabled>{placeholder}</option>
          {normalized.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  );
}

export function Card({ children, style, padding=24, shadow=true, hover=false }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-default)', padding,
      boxShadow: shadow ? 'var(--shadow-sm)' : 'none',
      transition: hover ? 'all var(--transition-base)' : undefined,
      ...style,
    }}
    onMouseEnter={hover ? e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } : undefined}
    onMouseLeave={hover ? e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } : undefined}
    >
      {children}
    </div>
  );
}

const badgeColors = {
  default: { bg: 'var(--bg-muted)',          color: 'var(--text-secondary)' },
  primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  success: { bg: 'var(--color-success-light)', color: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-light)', color: '#92400E' },
  danger:  { bg: 'var(--color-danger-light)',  color: 'var(--color-danger)' },
  info:    { bg: 'var(--color-info-light)',    color: 'var(--color-info)' },
  cyan:    { bg: 'var(--color-accent-light)',  color: 'var(--color-accent)' },
};

export function Badge({ children, variant='default', size='md', dot=false, style }) {
  const c = badgeColors[variant] || badgeColors.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '2px 8px' : '3px 10px',
      borderRadius: 'var(--radius-full)', fontSize: size === 'sm' ? 11 : 12, fontWeight: 500,
      background: c.bg, color: c.color, ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}

export function Avatar({ name='?', size=36, src, color }) {
  const colors = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899'];
  const bg = color || colors[(name.charCodeAt(0) || 0) % colors.length];
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (src) return <img src={src} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt={name} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-display)',
    }}>{initials}</div>
  );
}

export function Spinner({ size=24, color='var(--color-primary)' }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid var(--border-default)`,
      borderTopColor: color, borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  );
}

export function Skeleton({ width='100%', height=16, radius='var(--radius-sm)', style }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-muted) 25%, var(--border-default) 50%, var(--bg-muted) 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', ...style,
    }} />
  );
}

export function Empty({ title='Aucun résultat', description, icon }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
      {icon && <div style={{ marginBottom: 16, opacity: 0.4 }}>{icon}</div>}
      <p style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>{title}</p>
      {description && <p style={{ fontSize: 14 }}>{description}</p>}
    </div>
  );
}

const alertStyles = {
  success: { bg: 'var(--color-success-light)', border: 'var(--color-success)', color: '#065F46', Icon: CheckCircle },
  warning: { bg: 'var(--color-warning-light)', border: 'var(--color-warning)', color: '#92400E', Icon: AlertTriangle },
  danger:  { bg: 'var(--color-danger-light)',  border: 'var(--color-danger)',  color: '#991B1B', Icon: AlertCircle },
  info:    { bg: 'var(--color-info-light)',    border: 'var(--color-info)',    color: '#4C1D95', Icon: Info },
};

export function Alert({ variant='info', title, children, onClose }) {
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

export function Modal({ open, onClose, title, children, width=560, footer }) {
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
        width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        animation: 'scaleIn 0.2s ease',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel='Confirmer', variant='danger', loading }) {
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

export function Table({ columns=[], data=[], loading, emptyText='Aucune donnée', onRowClick, keyField='id' }) {
  if (loading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3,4,5].map(i => <Skeleton key={i} height={44} radius="var(--radius-md)" />)}
    </div>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '10px 16px', textAlign: col.align || 'left', fontWeight: 600, fontSize: 12,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>{emptyText}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row[keyField] ?? i}
              style={{ borderBottom: '1px solid var(--border-muted)', transition: 'background var(--transition-fast)', cursor: onRowClick ? 'pointer' : undefined }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding: '12px 16px', color: 'var(--text-primary)', whiteSpace: col.nowrap ? 'nowrap' : undefined, textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 0' }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 0}
        style={{ padding: '6px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', cursor: page === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: page === 0 ? 0.5 : 1 }}>
        ‹
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{
            padding: '6px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
            background: p === page ? 'var(--color-primary)' : 'var(--bg-surface)',
            color: p === page ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer', fontWeight: p === page ? 600 : 400, fontSize: 14,
          }}>{p + 1}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}
        style={{ padding: '6px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>
        ›
      </button>
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon, color='var(--color-primary)', trend, loading }) {
  return (
    <Card hover style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>{title}</p>
          {loading ? <Skeleton height={32} width={80} style={{ marginBottom: 6 }} /> : (
            <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</p>
          )}
          {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{subtitle}</p>}
          {trend !== undefined && (
            <p style={{ fontSize: 12, color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        {icon && (
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function SearchInput({ value, onChange, placeholder='Rechercher...', style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px 9px 38px', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'var(--font-sans)',
          background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none',
          transition: 'border-color var(--transition-fast)', boxSizing: 'border-box',
        }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
      />
    </div>
  );
}

export function Tabs({ tabs=[], active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-default)', marginBottom: 24 }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            color: active === tab.key ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${active === tab.key ? 'var(--color-primary)' : 'transparent'}`,
            marginBottom: -1, transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
          {tab.icon}{tab.label}
          {tab.count !== undefined && <Badge variant={active === tab.key ? 'primary' : 'default'} size="sm">{tab.count}</Badge>}
        </button>
      ))}
    </div>
  );
}

export function FormRow({ children, cols=2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  );
}

export function Divider({ label, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0', ...style }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
      {label && <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
      <Spinner size={32} />
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Chargement...</p>
    </div>
  );
}

export function PageHeader({ title, subtitle, children, breadcrumbs }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {breadcrumbs && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          {breadcrumbs.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span>/</span>}
              <span style={{ color: i === breadcrumbs.length - 1 ? 'var(--text-secondary)' : undefined }}>{b}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>{subtitle}</p>}
        </div>
        {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>}
      </div>
    </div>
  );
}