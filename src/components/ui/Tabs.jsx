import { Badge } from './Badge';

/** Tabs — navigation par onglets. tabs = [{ key, label, icon?, count? }]. */
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-default)', marginBottom: 24, overflowX: 'auto' }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            color: active === tab.key ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${active === tab.key ? 'var(--color-primary)' : 'transparent'}`,
            marginBottom: -1, transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
          }}>
          {tab.icon}{tab.label}
          {tab.count !== undefined && <Badge variant={active === tab.key ? 'primary' : 'default'} size="sm">{tab.count}</Badge>}
        </button>
      ))}
    </div>
  );
}

/** FormRow — grille de colonnes pour les formulaires. */
export function FormRow({ children, cols = 2, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, ...style }}>
      {children}
    </div>
  );
}

/** Divider — séparateur horizontal avec libellé optionnel. */
export function Divider({ label, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0', ...style }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
      {label && <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
    </div>
  );
}