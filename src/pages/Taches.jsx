// pages/Taches.jsx
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, LayoutGrid, List, Flag, User, Calendar, AlertCircle } from 'lucide-react';
import { tacheApi, projetApi, employerApi } from '../api';
import { PageHeader, Card, Badge, Button, Modal, Input, Select, Confirm, SearchInput, Avatar, FormRow, Textarea } from '../components/ui';
import toast from 'react-hot-toast';
import { useNotifications } from '../contexts/NotificationContext';
import { NOTIF_TYPES } from '../constants/notificationTypes';
import { useAuth } from '../contexts/Authcontext';

const STATUTS = ['A_FAIRE', 'EN_COURS', 'EN_ATTENTE', 'TERMINEE', 'ANNULEE'];
const STATUT_CONFIG = {
  A_FAIRE: { label: 'A faire', variant: 'default', color: '#94A3B8', bg: '#F1F5F9', icon: '⏳' },
  EN_COURS: { label: 'En cours', variant: 'info', color: '#3B82F6', bg: '#EFF6FF', icon: '🔄' },
  EN_ATTENTE: { label: 'En attente', variant: 'warning', color: '#F59E0B', bg: '#FFFBEB', icon: '⏸' },
  TERMINEE: { label: 'Terminee', variant: 'success', color: '#10B981', bg: '#F0FDF4', icon: '✅' },
  ANNULEE: { label: 'Annulee', variant: 'danger', color: '#EF4444', bg: '#FFF5F5', icon: '❌' },
};
const PRIORITES = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];
const PRIORITE_CONFIG = {
  BASSE: { label: 'Basse', color: '#10B981', bg: '#F0FDF4' },
  NORMALE: { label: 'Normale', color: '#3B82F6', bg: '#EFF6FF' },
  HAUTE: { label: 'Haute', color: '#F59E0B', bg: '#FFFBEB' },
  URGENTE: { label: 'Urgente', color: '#EF4444', bg: '#FFF5F5' },
};
const EMPTY = { titre: '', description: '', statut: 'A_FAIRE', priorite: 'NORMALE', dateEcheance: '', assigneeId: '', projetId: '' };

// Composant KanbanColumn
function KanbanColumn({ statut, tasks, onEdit, onDelete, onChangeStatut, onDragOver, onDrop }) {
  const cfg = STATUT_CONFIG[statut];
  
  const handleDragOver = (e) => {
    e.preventDefault();
    onDragOver?.(statut);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onDrop?.(taskId, statut);
  };

  return (
    <div 
      style={{ 
        flex: '1 1 280px', 
        minWidth: 280, 
        maxWidth: 350,
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 280px)',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div style={{ 
        padding: '12px 16px',
        background: cfg.bg,
        borderBottom: `2px solid ${cfg.color}`,
        borderTopLeftRadius: 'var(--radius-lg)',
        borderTopRightRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{cfg.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: cfg.color }}>{cfg.label}</span>
          </div>
          <Badge variant={cfg.variant} size="sm">{tasks.length}</Badge>
        </div>
      </div>

      <div style={{ 
        padding: '12px',
        overflowY: 'auto',
        flex: 1,
        minHeight: 200,
      }}>
        {tasks.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '32px 16px',
            color: 'var(--text-muted)',
            fontSize: 12,
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-md)',
          }}>
            Aucune tache
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onEdit={onEdit} 
                onDelete={onDelete}
                onChangeStatut={onChangeStatut}
                showStatutButtons={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant TaskCard
function TaskCard({ task, onEdit, onDelete, onChangeStatut, showStatutButtons = false, compact = false }) {
  const statutCfg = STATUT_CONFIG[task.statut];
  const prioriteCfg = PRIORITE_CONFIG[task.priorite];
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isExpired = task.dateEcheance && new Date(task.dateEcheance) < new Date() && task.statut !== 'TERMINEE' && task.statut !== 'ANNULEE';

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        padding: compact ? '10px 12px' : '14px 16px',
        transition: 'all var(--transition-fast)',
        cursor: 'grab',
        position: 'relative',
        boxShadow: 'var(--shadow-xs)',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: prioriteCfg.color,
        borderTopLeftRadius: 'var(--radius-md)',
        borderBottomLeftRadius: 'var(--radius-md)',
      }} />

      <div style={{ marginLeft: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              fontWeight: 600, 
              fontSize: compact ? 13 : 14, 
              color: 'var(--text-primary)',
              marginBottom: 6,
            }}>
              {task.titre}
            </h4>
            {task.description && !compact && (
              <p style={{ 
                fontSize: 12, 
                color: 'var(--text-muted)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {task.description}
              </p>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button 
              onClick={() => onEdit(task)} 
              style={{ 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                color: 'var(--text-muted)', 
                padding: 4,
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Pencil size={14} />
            </button>
            <button 
              onClick={() => onDelete(task)} 
              style={{ 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                color: 'var(--color-danger)', 
                padding: 4,
                borderRadius: 'var(--radius-sm)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: compact ? 8 : 12, 
          flexWrap: 'wrap',
          marginBottom: showStatutButtons ? 12 : 0,
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            padding: '2px 8px',
            background: prioriteCfg.bg,
            borderRadius: 'var(--radius-full)',
          }}>
            <span style={{ fontSize: 10, color: prioriteCfg.color, fontWeight: 600 }}>
              {prioriteCfg.label}
            </span>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            padding: '2px 8px',
            background: statutCfg.bg,
            borderRadius: 'var(--radius-full)',
          }}>
            <span style={{ fontSize: 11, color: statutCfg.color, fontWeight: 500 }}>
              {statutCfg.icon} {statutCfg.label}
            </span>
          </div>

          {task.dateEcheance && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              color: isExpired ? 'var(--color-danger)' : 'var(--text-muted)',
            }}>
              <Calendar size={12} />
              <span style={{ fontSize: 11 }}>
                {new Date(task.dateEcheance).toLocaleDateString('fr-FR')}
                {isExpired && <span style={{ marginLeft: 4 }}> Depassee</span>}
              </span>
            </div>
          )}

          {task.assigneeName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar name={task.assigneeName} size={22} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.assigneeName}</span>
            </div>
          )}

          {task.projetNom && !compact && (
            <div style={{ 
              fontSize: 11, 
              color: 'var(--text-muted)',
              padding: '2px 8px',
              background: 'var(--bg-muted)',
              borderRadius: 'var(--radius-full)',
            }}>
              {task.projetNom}
            </div>
          )}
        </div>

        {showStatutButtons && (
          <div style={{ 
            marginTop: 12, 
            display: 'flex', 
            gap: 6, 
            flexWrap: 'wrap',
            paddingTop: 8,
            borderTop: '1px solid var(--border-muted)',
          }}>
            {STATUTS.filter(s => s !== task.statut).map(s => (
              <button
                key={s}
                onClick={() => onChangeStatut(task, s)}
                style={{
                  fontSize: 10,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${STATUT_CONFIG[s].color}40`,
                  background: STATUT_CONFIG[s].bg,
                  color: STATUT_CONFIG[s].color,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {STATUT_CONFIG[s].icon} {STATUT_CONFIG[s].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant principal
export default function Taches() {
  const { user } = useAuth();
  const { notifyTask } = useNotifications();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [filterAssigné, setFilterAssigné] = useState('');
  const [view, setView] = useState('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projets, setProjets] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [draggedColumn, setDraggedColumn] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tacheApi.getAll({ page: 0, size: 200 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch {
      toast.error('Erreur chargement des taches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    Promise.all([
      projetApi.getAll({ size: 200 }),
      employerApi.getAll({ size: 200 }),
    ]).then(([p, e]) => {
      const pd = p.data?.data || p.data;
      const ed = e.data?.data || e.data;
      setProjets(Array.isArray(pd) ? pd : pd?.content || []);
      setEmployes(Array.isArray(ed) ? ed : ed?.content || []);
    }).catch(() => toast.error('Erreur chargement des references'));
  }, []);

  const filtered = data.filter(t => {
    const matchSearch = !search || t.titre?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchProjet = !filterProjet || String(t.projetId) === String(filterProjet);
    const matchPriorite = !filterPriorite || t.priorite === filterPriorite;
    const matchAssigné = !filterAssigné || String(t.assigneeId) === String(filterAssigné);
    return matchSearch && matchProjet && matchPriorite && matchAssigné;
  });

  const byStatut = (s) => filtered.filter(t => t.statut === s);

  const openCreate = () => { 
    setForm(EMPTY); 
    setEditItem(null); 
    setModalOpen(true); 
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      titre: item.titre || '',
      description: item.description || '',
      statut: item.statut || 'A_FAIRE',
      priorite: item.priorite || 'NORMALE',
      dateEcheance: item.dateEcheance || '',
      assigneeId: item.assigneeId || '',
      projetId: item.projetId || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, assigneeId: form.assigneeId || null, projetId: form.projetId || null };
      const assignee = employes.find(e => e.id === form.assigneeId);
      
      if (editItem) {
        await tacheApi.update(editItem.id, payload);
        notifyTask({
          task: { id: editItem.id, titre: form.titre },
          action: 'modified',
          assignee: assignee,
          currentUser: user
        });
        toast.success('Tache modifiee');
      } else {
        const response = await tacheApi.create(payload);
        notifyTask({
          task: { id: response.data?.id, titre: form.titre },
          action: 'created',
          assignee: assignee,
          currentUser: user
        });
        toast.success('Tache creee');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await tacheApi.delete(deleteItem.id);
      notifyTask({
        task: { titre: deleteItem.titre },
        action: 'deleted',
        assignee: null,
        currentUser: user
      });
      toast.success('Tache supprimee');
      setDeleteItem(null);
      load();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleChangeStatut = async (task, statut) => {
    try {
      await tacheApi.changeStatut(task.id, statut);
      
      notifyTask({
        task: { id: task.id, titre: task.titre },
        action: statut === 'TERMINEE' ? 'completed' : 'modified',
        assignee: { id: task.assigneeId },
        currentUser: user
      });
      
      toast.success(`Tache deplacee vers ${STATUT_CONFIG[statut].label}`);
      load();
    } catch {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleDragOverColumn = (statut) => {
    setDraggedColumn(statut);
  };

  const handleDropOnColumn = async (taskId, newStatut) => {
    const task = data.find(t => t.id === parseInt(taskId));
    if (task && task.statut !== newStatut) {
      await handleChangeStatut(task, newStatut);
    }
    setDraggedColumn(null);
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const stats = {
    total: filtered.length,
    parStatut: STATUTS.reduce((acc, s) => ({ ...acc, [s]: byStatut(s).length }), {}),
  };

  return (
    <div>
      <PageHeader title="Gestion des Taches" subtitle={`${stats.total} tache${stats.total !== 1 ? 's' : ''} au total`}>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nouvelle tache
        </Button>
      </PageHeader>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {STATUTS.map(s => (
          <div
            key={s}
            style={{
              flex: '1',
              minWidth: 100,
              padding: '12px 16px',
              background: STATUT_CONFIG[s].bg,
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${STATUT_CONFIG[s].color}30`,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onClick={() => setFilterProjet('')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{STATUT_CONFIG[s].icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: STATUT_CONFIG[s].color }}>
                {STATUT_CONFIG[s].label}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: STATUT_CONFIG[s].color }}>
              {stats.parStatut[s]}
            </div>
          </div>
        ))}
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '2', minWidth: 200 }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher par titre ou description..."
            />
          </div>
          
          <div style={{ flex: '1', minWidth: 150 }}>
            <select
              value={filterProjet}
              onChange={e => setFilterProjet(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <option value="">Tous les projets</option>
              {projets.map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1', minWidth: 130 }}>
            <select
              value={filterPriorite}
              onChange={e => setFilterPriorite(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <option value="">Toutes priorites</option>
              {PRIORITES.map(p => (
                <option key={p} value={p}>{PRIORITE_CONFIG[p].label}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1', minWidth: 150 }}>
            <select
              value={filterAssigné}
              onChange={e => setFilterAssigné(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              <option value="">Tous les assignes</option>
              {employes.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                onClick={() => setView('kanban')}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  background: view === 'kanban' ? 'var(--color-primary)' : 'var(--bg-surface)',
                  color: view === 'kanban' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all var(--transition-fast)',
                }}
              >
                <LayoutGrid size={14} />
                Kanban
              </button>
              <button
                onClick={() => setView('list')}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-default)',
                  background: view === 'list' ? 'var(--color-primary)' : 'var(--bg-surface)',
                  color: view === 'list' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all var(--transition-fast)',
                }}
              >
                <List size={14} />
                Liste
              </button>
            </div>
          </div>

          {(search || filterProjet || filterPriorite || filterAssigné) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilterProjet('');
                setFilterPriorite('');
                setFilterAssigné('');
              }}
            >
              Reinitialiser
            </Button>
          )}
        </div>
      </Card>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            border: '3px solid var(--border-default)', 
            borderTopColor: 'var(--color-primary)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text-muted)' }}>Chargement des taches...</p>
        </div>
      )}

      {!loading && view === 'kanban' && (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
          {STATUTS.map(s => (
            <KanbanColumn
              key={s}
              statut={s}
              tasks={byStatut(s)}
              onEdit={openEdit}
              onDelete={setDeleteItem}
              onChangeStatut={handleChangeStatut}
              onDragOver={handleDragOverColumn}
              onDrop={handleDropOnColumn}
            />
          ))}
        </div>
      )}

      {!loading && view === 'list' && (
        <Card padding={0}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px' }}>
              <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Aucune tache trouvee</p>
              <Button onClick={openCreate}>Creer une tache</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((task, index) => (
                <div
                  key={task.id}
                  style={{
                    borderBottom: index < filtered.length - 1 ? '1px solid var(--border-muted)' : 'none',
                    padding: '16px 20px',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <TaskCard
                    task={task}
                    onEdit={openEdit}
                    onDelete={setDeleteItem}
                    onChangeStatut={handleChangeStatut}
                    showStatutButtons={false}
                    compact={false}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Modifier la tache' : 'Nouvelle tache'}
        width={600}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>
              {editItem ? 'Enregistrer' : 'Creer'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Titre *"
              value={form.titre}
              onChange={set('titre')}
              placeholder="Titre de la tache"
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={set('description')}
              placeholder="Description detaillee..."
              rows={3}
            />
            <FormRow>
              <Select
                label="Statut"
                value={form.statut}
                onChange={set('statut')}
                options={STATUTS.map(s => ({ value: s, label: `${STATUT_CONFIG[s].icon} ${STATUT_CONFIG[s].label}` }))}
              />
              <Select
                label="Priorite"
                value={form.priorite}
                onChange={set('priorite')}
                options={PRIORITES.map(p => ({ value: p, label: PRIORITE_CONFIG[p].label }))}
              />
            </FormRow>
            <FormRow>
              <Select
                label="Projet"
                value={form.projetId}
                onChange={set('projetId')}
                options={projets.map(p => ({ value: p.id, label: p.nom }))}
                placeholder="Selectionner un projet..."
              />
              <Select
                label="Assigner a"
                value={form.assigneeId}
                onChange={set('assigneeId')}
                options={employes.map(e => ({ value: e.id, label: e.name }))}
                placeholder="Selectionner un employe..."
              />
            </FormRow>
            <Input
              label="Date d'echeance"
              type="date"
              value={form.dateEcheance}
              onChange={set('dateEcheance')}
            />
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Supprimer la tache"
        message={`Etes-vous sur de vouloir supprimer la tache "${deleteItem?.titre}" ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}