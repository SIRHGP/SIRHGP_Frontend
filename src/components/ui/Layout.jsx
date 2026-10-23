// components/ui/Layout.jsx — Helpers de mise en page standardisés SIRHGP.

/**
 * Flex — conteneur flexbox standardisé.
 * @property {string} direction  row | column
 * @property {string} justify    flex-start | space-between | center | flex-end
 * @property {string} align      center | flex-start | flex-end
 * @property {number|string} gap
 * @property {boolean} wrap
 */
export function Flex({ children, direction = 'row', justify, align, gap = 8, wrap, style }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: direction,
      justifyContent: justify,
      alignItems: align,
      gap,
      flexWrap: wrap ? 'wrap' : undefined,
      ...style,
    }}>
      {children}
    </div>
  );
}

/** SectionTitle — titre de section standardisé (remplace les h3 stylés en dur). */
export function SectionTitle({ children, style }) {
  return (
    <h3 style={{
      margin: '0 0 16px', fontWeight: 700, fontSize: 16,
      color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
      ...style,
    }}>
      {children}
    </h3>
  );
}

/**
 * InfoRow — paire libellé/valeur alignée (fiches, détails).
 * Affiche '—' si la valeur est vide.
 */
export function InfoRow({ label, value }) {
  const v = (value === undefined || value === null || value === '') ? '—' : value;
  return (
    <Flex justify="space-between" gap={12}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 14 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right', fontSize: 14 }}>{v}</span>
    </Flex>
  );
}

/** KeyText — bloc titre + description (cartes d'information). */
export function KeyText({ title, children, style }) {
  return (
    <div style={style}>
      <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px', color: 'var(--text-primary)' }}>{title}</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{children}</p>
    </div>
  );
}