import { AlertCircle, ChevronDown, Search } from 'lucide-react';

const baseField = {
  width: '100%', padding: '10px 14px',
  borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'var(--font-sans)',
  background: 'var(--bg-surface)', color: 'var(--text-primary)',
  transition: 'all var(--transition-fast)', outline: 'none', boxSizing: 'border-box',
};
const fieldBorder = (error) => ({ border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border-default)'}` });
const fieldBox = (error) => ({ ...baseField, ...fieldBorder(error) });

function FieldLabel({ label, required, error }) {
  if (!label) return null;
  return (
    <label style={{ fontSize: 13, fontWeight: 600, color: error ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
      {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
    </label>
  );
}
function FieldError({ error }) {
  if (!error) return null;
  return <span style={{ fontSize: 12, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12}/>{error}</span>;
}
function FieldHint({ hint }) {
  if (!hint) return null;
  return <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</span>;
}

/**
 * Input standardisé SIRHGP.
 * @property {string} label
 * @property {string} error
 * @property {node}   leftIcon / rightIcon
 * @property {string} hint   Texte d'aide sous le champ
 */
export function Input({ label, error, hint, leftIcon, rightIcon, type='text', style, required, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <FieldLabel label={label} required={required} error={error} />
      <div style={{ position: 'relative' }}>
        {leftIcon && <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', display:'flex' }}>{leftIcon}</span>}
        <input
          type={type}
          style={{ ...fieldBox(error), padding: leftIcon ? '10px 14px 10px 40px' : '10px 14px', paddingRight: rightIcon ? 40 : 14 }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--border-default)'}
          {...props}
        />
        {rightIcon && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', display:'flex' }}>{rightIcon}</span>}
      </div>
      <FieldError error={error} />
      {!error && <FieldHint hint={hint} />}
    </div>
  );
}

/** Textarea standardisé. */
export function Textarea({ label, error, style, required, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <FieldLabel label={label} required={required} error={error} />
      <textarea
        style={{ ...fieldBox(error), resize: 'vertical', minHeight: 100 }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={e => e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--border-default)'}
        {...props}
      />
      <FieldError error={error} />
    </div>
  );
}
/** Normalise une option (objet ou primitive). */
function normalizeOpt(o) {
  if (o === null || o === undefined) return null;
  if (typeof o !== 'object') return { value: String(o), label: String(o) };
  const rawVal = o.value;
  const val = rawVal != null ? (typeof rawVal === 'object' ? String(rawVal.id ?? '') : String(rawVal)) : '';
  const lbl = o.label != null ? String(o.label) : val;
  return { value: val, label: lbl };
}

/**
 * Select standardisé (options primitives ou {value,label}).
 */
export function Select({ label, error, options = [], style, value, onChange, placeholder = 'Sélectionner...', required, ...props }) {
  const normalized = options.map(normalizeOpt).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <FieldLabel label={label} required={required} error={error} />
      <div style={{ position: 'relative' }}>
        <select
          value={value ?? ''}
          onChange={onChange}
          style={{ ...fieldBox(error), padding: '9px 36px 9px 12px', appearance: 'none', cursor: 'pointer' }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          {...props}
        >
          {/* placeholder=null → pas d'option vide (utile quand une option réelle a value='') */}
          {placeholder != null && <option value="" disabled>{placeholder}</option>}
          {normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      </div>
      <FieldError error={error} />
    </div>
  );
}

/** SearchInput — Input avec icône loupe intégrée. */
export function SearchInput({ value, onChange, placeholder='Rechercher...', style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...fieldBox(), padding: '9px 12px 9px 38px' }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
      />
    </div>
  );
}

/** Checkbox — case à cocher standard. */
export function Checkbox({ label, checked, onChange, disabled, style }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed':'pointer', fontSize:14, color:'var(--text-primary)', ...style }}>
      <input
        type="checkbox" checked={checked} onChange={e => onChange?.(e.target.checked)} disabled={disabled}
        style={{ width:16,height:16,accentColor:'var(--color-primary)',cursor:'pointer' }}
      />
      {label}
    </label>
  );
}

/** Switch (toggle) standardisé. */
export function Switch({ checked, onChange, disabled, label, style }) {
  return (
    <button
      type="button"
      role="switch" aria-checked={checked} aria-label={label}
      onClick={() => !disabled && onChange?.(!checked)} disabled={disabled}
      style={{
        width:44, height:24, borderRadius:'var(--radius-full)', border:'none', cursor:'pointer',
        background: checked ? 'var(--color-primary)' : 'var(--border-strong)', position:'relative',
        transition:'background var(--transition-fast)', opacity: disabled ? 0.5 : 1, ...style,
      }}
    >
      <span style={{
        position:'absolute', top:2, left:0, transform:`translateX(${checked ? 22 : 2}px)`,
        width:20, height:20, borderRadius:'50%', background:'#fff', boxShadow:'var(--shadow-sm)', transition:'transform var(--transition-fast)',
      }} />
    </button>
  );
}

/** RadioGroup — options verticales ou horizontales. */
export function RadioGroup({ name, options = [], value, onChange, direction='horizontal', disabled, style }) {
  return (
    <div style={{ display:'flex', flexDirection: direction === 'vertical' ? 'column' : 'row', gap:14, ...style }}>
      {options.map(o => {
        const active = String(o.value) === String(value);
        return (
          <label key={o.value} style={{ display:'inline-flex', alignItems:'center', gap:8, cursor: disabled?'not-allowed':'pointer', fontSize:14, color: active?'var(--text-primary)':'var(--text-secondary)' }}>
            <input
              type="radio" name={name} value={o.value} checked={active} disabled={disabled}
              onChange={() => onChange?.(o.value)}
              style={{ width:16,height:16,accentColor:'var(--color-primary)' }}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}