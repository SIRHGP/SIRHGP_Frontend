import { Skeleton } from './Feedback';

/**
 * Card — conteneur surfacé standard SIRHGP.
 * @property {boolean} hover    Élévation au survol
 * @property {boolean} shadow   Ombrage (défaut true)
 * @property {number|string} padding
 */
export function Card({ children, style, padding=24, shadow=true, hover=false }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-default)', padding,
        boxShadow: shadow ? 'var(--shadow-card)' : 'none',
        transition: 'all var(--transition-base)', ...style,
      }}
      onMouseEnter={hover ? e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-elevated)'; } : undefined}
      onMouseLeave={hover ? e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = shadow ? 'var(--shadow-card)' : 'none'; } : undefined}
    >
      {children}
    </div>
  );
}

/** Grille de statistiques — colonnes uniformes. */
export function StatsGrid({ children, cols, style }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 16, marginBottom: 24, ...style,
    }}>
      {children}
    </div>
  );
}

/**
 * StatCard — carte statistique avec icône teintée et tendance.
 * @property {string} color Couleur (hex) pour l'icône/tendance
 * @property {number} trend Valeur négative/positive (tendance)
 */
export function StatCard({ title, value, subtitle, icon, color='var(--color-primary)', trend, loading, onClick, active }) {
  const clickable = !!onClick;
  return (
    <Card hover
      style={{
        flex: 1, minWidth: 0, cursor: clickable ? 'pointer' : undefined,
        borderColor: clickable && active ? 'var(--color-primary)' : undefined,
        boxShadow: clickable && active ? 'var(--shadow-card)' : undefined,
      }}
      shadow={!active}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }} onClick={clickable ? onClick : undefined}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>{title}</p>
          {loading ? <Skeleton height={32} width={80} style={{ marginBottom: 6 }} /> : (
            <p style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</p>
          )}
          {trend !== undefined && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
              fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              background: trend >=0 ?'var(--color-success-light)' : 'var(--color-danger-light)',
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {subtitle && <p style={{ fontSize:12, color:'var(--text-muted)',marginTop:6 }}>{subtitle}</p>}
        </div>
        <div onClick={clickable ? onClick : undefined}>
          {icon && (
            <div style={{ width:48,height:48,borderRadius:'var(--radius-lg)',background:color+'1a',display:'flex',alignItems:'center',justifyContent:'center',color,flexShrink:0,border:`1px solid ${color}22` }}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}