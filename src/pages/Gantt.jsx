// Gantt.jsx — Diagramme de Gantt avec dépendances (3.2)
import { useState, useMemo } from 'react';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { tacheApi, projetApi } from '../Api';
import { Card, Flex } from '../components/ui';
import { STATUTS, STATUT_CONFIG } from '../components/tasks/taskConstants';
import { CalendarRange, Link2 } from 'lucide-react';

const DAY_W = 34;          // largeur d'un jour en px
const ROW_H = 42;          // hauteur d'une ligne de tâche
const LABEL_W = 210;       // largeur colonne libellés

const fmt = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// Dates de début / fin effectives d'une tâche (avec fallbacks)
function taskDates(t) {
  const start = t.dateDebut
    ? t.dateDebut.slice(0, 10)
    : t.dateEcheance ? fmt(addDays(new Date(t.dateEcheance), -3)) : null;
  const end = t.dateFin
    ? t.dateFin.slice(0, 10)
    : t.dateEcheance || (start ? fmt(addDays(new Date(start), 2)) : null);
  if (!start || !end) return null;
  let s = start, e = end;
  if (e < s) e = s; // sécurité inversion
  return { start: s, end: e };
}

export default function Gantt() {
  const [tasks, setTasks] = useState([]);
  const [projets, setProjets] = useState([]);
  const [projetFiltre, setProjetFiltre] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [ts, ps] = await Promise.all([
        tacheApi.getAll({ page: 0, size: 500 }).catch(() => null),
        projetApi.getAll({ size: 100 }).catch(() => null),
      ]);
      const td = Array.isArray(ts?.data) ? ts.data : (ts?.data?.data || ts?.data?.content || []);
      const pd = Array.isArray(ps?.data) ? ps.data : (ps?.data?.data || ps?.data?.content || []);
      setTasks(Array.isArray(td) ? td : []);
      setProjets(Array.isArray(pd) ? pd : (pd?.content || []));
    } catch (e) {
      console.error('Erreur chargement Gantt:', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };
  useDeferredTask(load, 'mount');

  const tasksFiltrees = useMemo(
    () => tasks.filter(t => !projetFiltre || String(t.projet?.id || t.projetId) === String(projetFiltre)),
    [tasks, projetFiltre]
  );

  // Fenêtre temporelle globale
  const { minDate, nbJours } = useMemo(() => {
    const dates = tasksFiltrees.map(taskDates).filter(Boolean);
    if (dates.length === 0) {
      const now = new Date();
      const s = fmt(addDays(now, -7)), e = fmt(addDays(now, 21));
      return { minDate: s, nbJours: dayDiff(s, e) + 1 };
    }
    let min = dates[0].start, max = dates[0].end;
    for (const d of dates) { if (d.start < min) min = d.start; if (d.end > max) max = d.end; }
    min = fmt(addDays(new Date(min), -2));
    max = fmt(addDays(new Date(max), 2));
    return { minDate: min, nbJours: dayDiff(min, max) + 1 };
  }, [tasksFiltrees]);

  const jours = useMemo(() => {
    const arr = [];
    const today = fmt(new Date());
    for (let i = 0; i < nbJours; i++) {
      const d = addDays(new Date(minDate), i);
      const ds = fmt(d);
      arr.push({ date: ds, num: d.getDate(), weekend: [0, 6].includes(d.getDay()), today: ds === today });
    }
    return arr;
  }, [minDate, nbJours]);

  const todayX = dayDiff(minDate, fmt(new Date())) * DAY_W + DAY_W / 2;

  // Positions des barres + index par id (pour les flèches)
  const rows = useMemo(() => tasksFiltrees.map((t, i) => {
    const dt = taskDates(t);
    if (!dt) return null;
    const s = dayDiff(minDate, dt.start);
    const e = dayDiff(minDate, dt.end);
    return {
      task: t,
      x: s * DAY_W,
      w: Math.max(DAY_W, (e - s + 1) * DAY_W - 4),
      top: i * ROW_H,
      depIds: (t.dependances || []).map(d => d.id),
    };
  }).filter(Boolean), [tasksFiltrees, minDate]);

  const rowById = useMemo(() => Object.fromEntries(rows.map(r => [r.task.id, r])), [rows]);

  // Flèches de dépendance (coudes SVG)
  const fleches = useMemo(() => {
    const list = [];
    for (const r of rows) {
      for (const depId of r.depIds) {
        const dep = rowById[depId];
        if (!dep) continue;
        const x1 = dep.x + dep.w, y1 = dep.top + ROW_H / 2;   // fin du prédécesseur
        const x2 = r.x, y2 = r.top + ROW_H / 2;               // début du successeur
        const mx = x1 + Math.max(10, (x2 - x1) / 2);
        list.push({
          x1, y1, x2, y2, mx,
          bloquante: dep.task.statut !== 'TERMINEE',
          key: `${depId}-${r.task.id}`,
        });
      }
    }
    return list;
  }, [rows, rowById]);

  const chartW = nbJours * DAY_W;
  const chartH = rows.length * ROW_H;
  const depBloquantes = fleches.filter(f => f.bloquante).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gantt</h1>
          <p className="text-sm text-gray-500">Planification des tâches et chaînes de dépendances</p>
        </div>
        <div className="flex items-center gap-3">
          {depBloquantes > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
              <Link2 size={13} /> {depBloquantes} dépendance(s) bloquante(s)
            </span>
          )}
          <select value={projetFiltre} onChange={(e) => setProjetFiltre(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Tous les projets</option>
            {projets.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </div>
      </div>

      <Flex wrap gap={4} align="center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {STATUTS.map(s => (
          <Flex key={s} align="center" gap={4}>
            <span style={{ width: 14, height: 8, borderRadius: 4, background: STATUT_CONFIG[s].color }} />
            {STATUT_CONFIG[s].label}
          </Flex>
        ))}
        <Flex align="center" gap={4}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#ef4444" strokeWidth="2" /></svg>
          dépendance bloquante
        </Flex>
        <Flex align="center" gap={4}>
          <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#10b981" strokeWidth="2" /></svg>
          dépendance OK
        </Flex>
      </Flex>

      {loading ? (
        <Card style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>Chargement du planning…</Card>
      ) : rows.length === 0 ? (
        <Card style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
          Aucune tâche planifiable. Créez des tâches avec des dates (échéance ou début/fin).
        </Card>
      ) : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflow:'auto', maxHeight: 'calc(100vh - 330px)' }}>
            <div style={{ width: LABEL_W + chartW, minWidth: '100%' }}>
              {/* En-tête jours */}
              <div style={{ display:'flex', position:'sticky', top:0, zIndex:10, background:'var(--bg-surface)', borderBottom:'1px solid var(--border-muted)' }}>
                <div style={{ width: LABEL_W, flexShrink: 0, padding:'8px 12px', fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'flex', alignItems:'center', gap:8, borderRight:'1px solid var(--border-muted)' }}>
                  <CalendarRange size={14} /> Tâche
                </div>
                <div style={{ display:'flex' }}>
                  {jours.map(j => (
                    <div key={j.date}
                      style={{ width: DAY_W, flexShrink: 0, textAlign:'center', padding:'6px 0', fontSize:10, borderRight:'1px solid var(--border-muted)',
                        background: j.today ? 'var(--color-primary-light)' : (j.weekend ? 'var(--bg-muted)' : 'transparent'),
                        color: j.today ? 'var(--color-primary)' : (j.weekend ? 'var(--text-muted)' : 'var(--text-muted)'), fontWeight: j.today ? 700 : 400 }}>
                      {j.num}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', position:'relative' }}>
                {/* Libellés */}
                <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid var(--border-muted)' }}>
                  {rows.map(r => (
                    <div key={r.task.id} style={{ height: ROW_H, padding:'0 12px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid var(--border-muted)', background:'var(--bg-muted)' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e=>e.currentTarget.style.background='var(--bg-muted)'}
                      title={`${r.task.titre} — ${STATUT_CONFIG[r.task.statut]?.label || r.task.statut}`}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUT_CONFIG[r.task.statut]?.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.task.titre}</span>
                    </div>
                  ))}
                </div>

                {/* Grille + barres + flèches */}
                <div style={{ width: chartW, height: chartH, position: 'relative' }}>
                  {jours.map((j, i) => (
                    <div key={j.date}
                      style={{
                        position: 'absolute', left: i * DAY_W, top: 0, bottom: 0, width: DAY_W,
                        background: j.weekend ? 'rgba(0,0,0,0.03)' : 'transparent',
                        borderRight: '1px solid rgba(0,0,0,0.04)',
                      }} />
                  ))}
                  <div style={{
                    position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2,
                    background: '#3b82f6', opacity: 0.5, zIndex: 1,
                  }} title="Aujourd'hui" />

                  {rows.map(r => {
                    const cfg = STATUT_CONFIG[r.task.statut] || STATUT_CONFIG.A_FAIRE;
                    const retard = r.task.estEnRetard;
                    return (
                      <div key={r.task.id}
                        title={`${r.task.titre} — ${cfg.label}${retard ? ' (en retard)' : ''}`}
                        style={{
                          position: 'absolute', left: r.x + 2, top: r.top + 8,
                          width: r.w, height: ROW_H - 16,
                          background: cfg.color,
                          borderRadius: 8,
                          boxShadow: retard ? 'inset 0 0 0 2px #ef4444' : '0 1px 3px rgba(0,0,0,0.25)',
                          display: 'flex', alignItems: 'center', paddingLeft: 8,
                          color: '#fff', fontSize: 11, fontWeight: 600,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}>
                        {r.task.titre}
                      </div>
                    );
                  })}

                  <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 2 }}
                    width={chartW} height={chartH}>
                    <defs>
                      <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#6b7280" />
                      </marker>
                    </defs>
                    {fleches.map(f => (
                      <path key={f.key}
                        d={`M ${f.x1} ${f.y1} H ${f.mx} V ${f.y2} H ${f.x2 + 4}`}
                        fill="none"
                        stroke={f.bloquante ? '#ef4444' : '#10b981'}
                        strokeWidth={1.5}
                        markerEnd="url(#arrowhead)" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

