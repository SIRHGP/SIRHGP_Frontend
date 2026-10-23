import { useState } from 'react';
import { ChevronDown, ChevronRight, Mail, User } from 'lucide-react';
import { Badge, Avatar } from '../ui';

/* Nœud de l'arbre : carte employé + enfants repliables */
function Node({ emp, childrenMap, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const enfants = childrenMap.get(emp.id) || [];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: '3px solid var(--color-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 14px', marginBottom: 8,
        boxShadow: 'var(--shadow-xs)',
        minWidth: 240,
      }}>
        <Avatar name={emp.name || 'U'} size={30} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {emp.name}
            {emp.actif === false && <Badge variant="danger" size="sm">Inactif</Badge>}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={10} />{emp.posteName || 'Sans poste'}</span>
            {emp.departementNom && <span>{emp.departementNom}</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Mail size={10} />{emp.email}</span>
          </p>
        </div>
      </div>

      {enfants.length > 0 && (
        <div style={{ marginLeft: 20, paddingLeft: 18, borderLeft: '2px solid var(--border-muted)' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-muted)', marginBottom: 6,
            }}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {open ? 'Masquer' : `Afficher (${enfants.length})`}
          </button>
          {open && enfants
            .slice()
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
            .map(e => <Node key={e.id} emp={e} childrenMap={childrenMap} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

/**
 * OrgTree — arbre hiérarchique d'une liste d'employés.
 * @param {object[]} data        employés (avec managerId / name / posteName / departementNom)
 * @param {boolean}  loading
 */
export default function OrgTree({ data = [], loading = false }) {
  const childrenMap = new Map();
  data.forEach(e => {
    const parentId = e.managerId;
    if (parentId && data.some(x => x.id === parentId)) {
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId).push(e);
    }
  });
  const racines = data.filter(e =>
    !e.managerId || !data.some(x => x.id === e.managerId)
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div style={{ overflowX: 'auto', padding: '8px 4px' }}>
      {loading
        ? <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Chargement de l'organigramme…</div>
        : racines.length === 0
          ? <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
              Aucun employé dans ce département (ou aucun rattaché à un supérieur).
            </div>
          : racines.map(r => <Node key={r.id} emp={r} childrenMap={childrenMap} />)}
    </div>
  );
}