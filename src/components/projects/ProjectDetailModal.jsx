import { useEffect, useState } from 'react';
import { Users, CheckSquare, Lock } from 'lucide-react';
import { projetApi, tacheApi } from '../../Api';
import { Modal, Button, Badge, Avatar, Card, Progress, Tabs, Input, Select } from '../ui';
import TaskDetailModal from '../tasks/TaskDetailModal';
import { STATUTS, STATUT_CONFIG, PRIORITE_CONFIG } from '../tasks/taskConstants';
import { projectPeople, filterProjectTasks } from './projectDetailUtils';

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 };
const row = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 };
const date = value => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR') : 'Non renseignée';
const unwrap = response => response.data?.data ?? response.data;
const projectStatuses = { PLANIFIE: 'Planifié', EN_COURS: 'En cours', SUSPENDU: 'Suspendu', TERMINE: 'Terminé', ANNULE: 'Annulé', EN_RETARD: 'En retard' };

export default function ProjectDetailModal({ projectId, onClose }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState('overview');
  const [person, setPerson] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([projetApi.getById(projectId), tacheApi.getByProjet(projectId)])
      .then(([p, t]) => {
        if (!active) return;
        const taskData = unwrap(t);
        setProject(unwrap(p));
        setTasks(Array.isArray(taskData) ? taskData : taskData?.content || []);
      })
      .catch(() => { if (active) setError('Impossible de charger ce projet ou ses tâches. Vérifiez vos droits et réessayez.'); });
    return () => { active = false; };
  }, [projectId, attempt]);

  const people = projectPeople(project || {}, tasks);
  const members = people.filter(p => p.kind !== 'Intervenant sur une tâche');
  const visible = filterProjectTasks(tasks, person, status, search);
  const showPerson = id => { setPerson(String(id)); setTab('tasks'); };

  return (
    <>
      <Modal open={!selectedTask} onClose={onClose} title="Détails du projet" width={1000}
        footer={<Button variant="secondary" onClick={onClose}>Fermer</Button>}>
        {error ? <div role="alert"><p>{error}</p><Button onClick={() => { setError(''); setAttempt(n => n + 1); }}>Réessayer</Button></div>
          : !project ? <p role="status">Chargement du projet et des tâches…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={row}><h2 style={{ margin: 0 }}>{project.nom}</h2><Badge>{projectStatuses[project.statut] || project.statut}</Badge></div>
              <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>{project.codeProjet || 'Sans code'}</p>
            </div>
            <Tabs active={tab} onChange={setTab} tabs={[
              { key: 'overview', label: 'Vue d’ensemble' },
              { key: 'team', label: 'Équipe', icon: <Users size={16} />, count: members.length },
              { key: 'tasks', label: 'Tâches consultables', icon: <CheckSquare size={16} />, count: tasks.length },
            ]} />
            {tab === 'overview' && (
              <>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{project.description || 'Aucune description renseignée.'}</p>
                <Card><div style={row}><Avatar name={project.chefProjet?.name || '?'} size={40} /><div><strong>Chef de projet : {project.chefProjet?.name || 'Non désigné'}</strong><p style={{ color: 'var(--text-muted)' }}>{project.chefProjet?.posteName || 'Poste non renseigné'}</p></div></div></Card>
                <div style={grid}>
                  {[
                    ['Personnes rattachées', members.length], ['Total des tâches', project.nombreTaches],
                    ['Terminées', project.nombreTachesTerminees], ['En cours', project.nombreTachesEnCours],
                    ['En retard', project.nombreTachesEnRetard],
                  ].map(([label, value]) => <Card key={label}><p style={{ color: 'var(--text-muted)' }}>{label}</p><strong style={{ fontSize: 24 }}>{value ?? '—'}</strong></Card>)}
                </div>
                <div><p style={{ marginBottom: 8 }}>Progression globale : <strong>{project.progression ?? 0}%</strong></p><Progress value={project.progression ?? 0} /></div>
                <div style={grid}>{[['Début', project.dateDebut], ['Fin prévue', project.dateFinPrevue], ['Fin réelle', project.dateFinReelle]].map(([label, value]) => <div key={label}><strong>{label}</strong><p>{date(value)}</p></div>)}</div>
              </>
            )}
            <p style={{ ...row, color: 'var(--text-muted)', fontSize: 13 }}>
              <Lock size={15} /> {tasks.length} tâche(s) consultable(s) par vous. Les indicateurs globaux incluent toutes les tâches du projet ; les listes et compteurs par personne respectent la confidentialité.
            </p>
            {tab === 'team' && (
              <>
                <div style={row}>
                  <Button variant="secondary" onClick={() => showPerson('')}>Toute l’équipe</Button>
                  <span>{members.length} personne(s) rattachée(s) · {people.length - members.length} intervenant(s) supplémentaire(s)</span>
                </div>
                {people.length === 0 && <p>Aucune personne rattachée à ce projet.</p>}
                <div style={grid}>
                  {people.map(p => (
                    <Card key={p.id}>
                      <div style={row}><Avatar name={p.name || '?'} size={36} /><strong>{p.name || 'Nom non renseigné'}</strong></div>
                      <p style={{ marginTop: 10 }}><Badge>{p.kind}</Badge></p>
                      <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{p.posteName || 'Poste non renseigné'}</p>
                      {p.departementNom && <p>{p.departementNom}</p>}
                      <p style={{ margin: '12px 0' }}>{p.total} tâche(s) consultable(s) · {p.done} terminée(s) · {p.remaining} restante(s)</p>
                      <Button variant="secondary" size="sm" onClick={() => showPerson(p.id)}>Voir ses tâches</Button>
                    </Card>
                  ))}
                </div>
              </>
            )}
            {tab === 'tasks' && (
              <>
                <div style={grid}>
                  <Input label="Rechercher une tâche" value={search} onChange={e => setSearch(e.target.value)} placeholder="Titre de la tâche…" />
                  <Select label="Personne" value={person} onChange={e => setPerson(e.target.value)} placeholder={null} options={[
                    { value: '', label: 'Toute l’équipe' }, { value: 'unassigned', label: 'Non assignées' },
                    ...people.map(p => ({ value: String(p.id), label: p.name || 'Nom non renseigné' })),
                  ]} />
                  <Select label="Statut" value={status} onChange={e => setStatus(e.target.value)} placeholder={null} options={[
                    { value: '', label: 'Tous les statuts' }, ...STATUTS.map(s => ({ value: s, label: STATUT_CONFIG[s].label })),
                  ]} />
                </div>
                <div style={row}><strong>{visible.length} résultat(s) sur {tasks.length} tâche(s) consultable(s)</strong>
                  <Button variant="ghost" size="sm" onClick={() => { setPerson(''); setStatus(''); setSearch(''); }}>Réinitialiser les filtres</Button>
                </div>
                {visible.length === 0 ? <p>Aucune tâche consultable ne correspond à ces filtres.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead><tr>{['Tâche', 'Assigné à', 'Priorité', 'Statut', 'Échéance', 'Visibilité'].map(label => <th key={label} style={{ padding: 10, borderBottom: '1px solid var(--border-default)' }}>{label}</th>)}</tr></thead>
                      <tbody>{visible.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                          <td style={{ padding: 10 }}><Button variant="ghost" size="sm" onClick={() => setSelectedTask(t)}>{t.titre}</Button></td>
                          <td style={{ padding: 10 }}>{t.assignee?.name || 'Non assigné'}</td>
                          <td style={{ padding: 10 }}>{PRIORITE_CONFIG[t.priorite]?.label || t.priorite}</td>
                          <td style={{ padding: 10 }}><Badge variant={STATUT_CONFIG[t.statut]?.variant}>{STATUT_CONFIG[t.statut]?.label || t.statut}</Badge></td>
                          <td style={{ padding: 10, whiteSpace: 'nowrap' }}>{date(t.dateEcheance)}</td>
                          <td style={{ padding: 10 }}>{t.visibilite === 'PRIVEE' ? 'Privée' : 'Publique'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
      {selectedTask && <TaskDetailModal task={selectedTask} open onClose={() => setSelectedTask(null)} />}
    </>
  );
}
