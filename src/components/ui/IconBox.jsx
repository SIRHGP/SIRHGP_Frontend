/**
 * IconBox — tuile d'icône standardisée SIRHGP.
 * Fond clair dérivé automatiquement de la couleur de l'icône.
 *
 * @property {node}   icon   Composant icône lucide (ex: <Users size={16}/>)
 * @property {string} color  Couleur de l'icône (hex ou variable CSS) — définit aussi le fond
 * @property {number} size   Taille de la tuile en px (défaut 36)
 * @property {string} bg     Fond forcé optionnel (sinon dérivé de `color`)
 *
 * <IconBox icon={<Building2 size={16}/>} color="var(--color-primary)" />
 */
const LIGHT_BG_MAP = {
  'var(--color-primary)': 'var(--color-primary-light)',
  'var(--color-accent)':  'var(--color-accent-light)',
  'var(--color-success)': 'var(--color-success-light)',
  'var(--color-warning)': 'var(--color-warning-light)',
  'var(--color-danger)':  'var(--color-danger-light)',
  'var(--color-info)':    'var(--color-info-light)',
};

export function IconBox({ icon, color = 'var(--color-primary)', size = 36, bg, style, radius = 'var(--radius-md)' }) {
  const background = bg || LIGHT_BG_MAP[color] || (color?.startsWith('var') ? 'var(--bg-muted)' : `${color}1a`);
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color,
      ...style,
    }}>
      {icon}
    </div>
  );
}