const AVATAR_COLORS = ['#2563EB','#14B8A6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899'];

/**
 * Avatar standardisé SIRHGP — affiche les initiales avec fond coloré déterministe.
 * @property {string} name  Nom complet (pour les initiales)
 * @property {number} size  Taille en px (défaut 36)
 * @property {string} src   URL d'image optionnelle
 * @property {string} color Couleur forcée optionnelle
 */
export function Avatar({ name = '?', size = 36, src, color }) {
  const bg = color || AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, overflow: 'hidden',
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           : initials}
    </div>
  );
}

/**
 * Groupe d'avatars superposés (ex: équipe d'un projet).
 * @param {string[]} names
 * @param {number} max   Nb max affiché avant "+n"
 * @param {number} size
 */
export function AvatarGroup({ names = [], max = 4, size = 28 }) {
  const visible = names.slice(0, max);
  const remaining = names.length - max;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((n, i) => (
        <div key={n + i} title={n} style={{ marginLeft: i === 0 ? 0 : -8, display: 'inline-flex' }}>
          <Avatar name={n} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div style={{
          width: size, height: size, borderRadius: '50%', background: 'var(--bg-muted)',
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.34, fontWeight: 600, marginLeft: -8, border: '2px solid var(--bg-surface)',
        }}>+{remaining}</div>
      )}
    </div>
  );
}