import { Skeleton, Empty } from './Feedback';

/**
 * Table — tableau de données standardisé.
 * columns : [{ key, label, align?, nowrap?, render?(val, row) }]
 * les pages passent 'loading', 'emptyText', 'onRowClick', 'keyField'.
 */
export function Table({ columns = [], data = [], loading, emptyText = 'Aucune donnée', onRowClick, keyField = 'id', emptyIcon }) {
  if (loading) return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3,4,5].map(i => <Skeleton key={i} height={44} radius="var(--radius-md)" />)}
    </div>
  );
  if (!data || data.length === 0) return (
    <Empty title={emptyText} description="Aucun enregistrement à afficher." icon={emptyIcon} />
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table-card" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
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
          {data.map((row, i) => (
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

/**
 * Pagination — navigation par pages avec ellipses.
 * @param {number} page         Index courant (0-based)
 * @param {number} totalPages
 * @param {function} onChange   (pageIndex) => void
 */
export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const maxVisible = 7;
  let pages = [];
  if (totalPages <= maxVisible) {
    pages = Array.from({ length: totalPages }, (_, i) => i);
  } else {
    pages.push(0);
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages - 2, page + 1);
    if (start > 1) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 2) pages.push('...');
    pages.push(totalPages - 1);
  }
  const btnBase = (active) => ({
    padding: '6px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-primary)' : 'var(--bg-surface)',
    color: active ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
    fontWeight: active ? 600 : 400, fontSize: 14,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <button onClick={() => onChange(page - 1)} disabled={page <= 0}
        style={{ ...btnBase(false), cursor: page <= 0 ? 'not-allowed' : 'pointer', opacity: page <= 0 ? 0.5 : 1 }}>‹</button>
      {pages.map((p, i) => p === '...'
        ? <span key={'e' + i} style={{ color: 'var(--text-muted)', padding: '0 2px' }}>…</span>
        : <button key={p} onClick={() => onChange(p)} style={btnBase(p === page)}>{p + 1}</button>
      )}
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}
        style={{ ...btnBase(false), cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>›</button>
    </div>
  );
}