/**
 * Breadcrumbs — fil d'Ariane.
 * items : ['Dashboard', 'RH', 'Employés'] — le dernier est actif.
 */
export function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
      {items.map((b, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span>/</span>}
          <span style={{ color: i === items.length - 1 ? 'var(--text-secondary)' : undefined }}>{b}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * PageHeader — en-tête de page standardisé.
 * @property {string} title
 * @property {string} subtitle
 * @property {array}  breadcrumbs
 * @property {node}   children  (actions alignées à droite)
 */
export function PageHeader({ title, subtitle, children, breadcrumbs }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>{subtitle}</p>}
        </div>
        {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>}
      </div>
    </div>
  );
}