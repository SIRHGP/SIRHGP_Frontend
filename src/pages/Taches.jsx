// pages/Taches.jsx
import { useState, useEffect } from 'react';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { 
  SquarePlus, LayoutGrid, List, AlertCircle
} from 'lucide-react';
import { tacheApi, projetApi, employerApi, secretariatApi, fetchAllPages } from '../Api';
import { PageHeader, Card, Button, Modal, Input, Select, Confirm, SearchInput, FormRow, Textarea, StatsGrid, StatCard, Tabs, Flex, Empty, Alert, SucursaleField } from '../components/ui';
import toast from 'react-hot-toast';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/Authcontext';
import TaskCard from '../components/tasks/TaskCard';
import KanbanColumn from '../components/tasks/KanbanColumn';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import { STATUTS, STATUT_CONFIG, PRIORITES, PRIORITE_CONFIG } from '../components/tasks/taskConstants';
import { useSucursales } from '../hooks/useSucursales';

const EMPTY = {
  titre: '',
  description: '',
  statut: 'A_FAIRE',
  priorite: 'MOYENNE',
  dateEcheance: '',
  assigneeId: null,
  projetId: null,
  sucursalId: '',
  visibilite: 'PUBLIQUE'
};

export default function Taches() {
  const { user } = useAuth();
  const isSecretary = user?.roleName === 'SECRETAIRE';
  const isStaffOrStagiaire = ['STAFF', 'STAGIAIRE'].includes(user?.roleName);
  const createdByMe = task => String(task.createurId ?? task.createur?.id) === String(user?.id);
  const { notifyTask } = useNotifications();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const { showSucursal, optionsFiltre: sucursalFiltreOptions,
          optionsFormulaire: sucursalFormOptions, correspond: sucursalMatch,
          compteAncre, sucursalUtilisateurNom } = useSucursales();
  const [filterSuc, setFilterSuc] = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [filterAssigné, setFilterAssigné] = useState('');
  const [view, setView] = useState('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projets, setProjets] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [monEtat, setMonEtat] = useState(null);

  /* État de réaction de l'utilisateur courant (congé, rôle, droits) */
  useEffect(() => {
    tacheApi.monEtat()
      .then(res => setMonEtat(res?.data || res))
      .catch(() => setMonEtat({ peutReagir: false, raison: 'État indisponible' }));
  }, []);

  const load = async () => {
    try {
      const tasks = await fetchAllPages(tacheApi.getAll, 200);
      setData(tasks);
    } catch {
      toast.error('Erreur chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  useDeferredTask(load, 'mount');

  useEffect(() => {
    Promise.all([
      fetchAllPages(projetApi.getAll, 200),
      isSecretary ? secretariatApi.employes()
        : isStaffOrStagiaire ? Promise.resolve([])
          : fetchAllPages(employerApi.getAll, 200),
    ]).then(([p, e]) => {
      const ed = e?.data?.data || e?.data || e;
      setProjets(p);
      setEmployes(Array.isArray(ed) ? ed : ed?.content || []);
    }).catch(() => toast.error('Erreur chargement des références'));
  }, [isSecretary, isStaffOrStagiaire]);

  const dataParSuccursale = data.filter(t => sucursalMatch(t, filterSuc));
  const filtered = dataParSuccursale.filter(t => {
    const matchSearch = !search || 
      t.titre?.toLowerCase().includes(search.toLowerCase()) || 
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchProjet = !filterProjet || String(t.projetId) === String(filterProjet);
    const matchPriorite = !filterPriorite || t.priorite === filterPriorite;
    const matchAssigné = !filterAssigné || String(t.assigneeId) === String(filterAssigné);
    return matchSearch && matchProjet && matchPriorite && matchAssigné;
  });

  const byStatut = (s) => filtered.filter(t => t.statut === s);
  const projetSelectionne = projets.find(project => String(project.id) === String(form.projetId));
  const projetsFormOptions = projets
    .filter(project => !form.sucursalId || !project.sucursalId || String(project.sucursalId) === String(form.sucursalId))
    .map(project => ({ value: project.id, label: project.nom }));
  const employesFormOptions = employes
    .filter(employee => !form.sucursalId || String(employee.sucursalId) === String(form.sucursalId))
    .map(employee => ({ value: employee.id, label: employee.name }));
  const sucursalesFormOptions = projetSelectionne?.sucursalId
    ? sucursalFormOptions.filter(option => !option.value || String(option.value) === String(projetSelectionne.sucursalId))
    : sucursalFormOptions;

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
      priorite: item.priorite || 'MOYENNE',
      dateEcheance: item.dateEcheance || '',
      assigneeId: item.assigneeId || null,
      projetId: item.projetId || item.projet?.id || null,
      sucursalId: item.sucursalId ? String(item.sucursalId) : '',
      visibilite: item.visibilite || 'PUBLIQUE'
    });
    setModalOpen(true);
  };

  const set = k => e => {
    const value = e.target?.value ?? e;

    if (k === 'projetId') {
      const projectId = value === '' || value === null || value === undefined ? null : Number(value);
      const selectedProject = projets.find(project => String(project.id) === String(projectId));
      setForm(f => ({
        ...f,
        projetId: projectId,
        sucursalId: selectedProject?.sucursalId ? String(selectedProject.sucursalId) : f.sucursalId,
        ...(selectedProject?.sucursalId && f.assigneeId
          && String(employes.find(employee => String(employee.id) === String(f.assigneeId))?.sucursalId) !== String(selectedProject.sucursalId)
          ? { assigneeId: null } : {}),
      }));
      return;
    }
    if (k === 'sucursalId') {
      setForm(f => {
        const selectedProject = projets.find(project => String(project.id) === String(f.projetId));
        const projectBranch = selectedProject?.sucursalId;
        const newBranch = value ? String(value) : '';
        return {
          ...f,
          sucursalId: newBranch,
          ...(projectBranch && newBranch && String(projectBranch) !== newBranch ? { projetId: null } : {}),
          ...(f.assigneeId && newBranch
            && String(employes.find(employee => String(employee.id) === String(f.assigneeId))?.sucursalId) !== newBranch
            ? { assigneeId: null } : {}),
        };
      });
      return;
    }
    
    if (k === 'assigneeId') {
      setForm(f => ({
        ...f,
        [k]: value === '' || value === null || value === undefined ? null : Number(value)
      }));
    } else {
      setForm(f => ({ ...f, [k]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const errors = [];
    if (!form.titre?.trim()) errors.push('Le titre est obligatoire');
    if (!form.projetId) errors.push('Le projet est obligatoire');

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    const payload = {
      titre: form.titre.trim(),
      description: form.description?.trim() || null,
      statut: form.statut,
      priorite: form.priorite,
      visibilite: form.visibilite || 'PUBLIQUE',
      dateEcheance: form.dateEcheance || null,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      projetId: form.projetId ? Number(form.projetId) : null,
      sucursalId: form.sucursalId ? Number(form.sucursalId) : null
    };

    setSaving(true);
    try {
      const assignee = employes.find(e => e.id === form.assigneeId);
      
      if (editItem) {
        await tacheApi.update(editItem.id, payload);
        if (notifyTask) {
          notifyTask({
            task: { id: editItem.id, titre: form.titre },
            action: 'modified',
            assignee: assignee,
            currentUser: user
          });
        }
        toast.success('Tâche modifiée avec succès');
      } else {
        const response = await tacheApi.create(payload);
        if (notifyTask) {
          notifyTask({
            task: { id: response.data?.id, titre: form.titre },
            action: 'created',
            assignee: assignee,
            currentUser: user
          });
        }
        toast.success('Tâche créée avec succès');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      const errorData = err.response?.data;
      let errorMessage = 'Erreur lors de la sauvegarde';
      
      if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (errorData?.errors) {
        errorMessage = Array.isArray(errorData.errors)
          ? errorData.errors.map(e => e.defaultMessage || e.message).filter(Boolean).join(', ')
          : Object.values(errorData.errors).filter(Boolean).join(', ');
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await tacheApi.delete(deleteItem.id);
      if (notifyTask) {
        notifyTask({
          task: { titre: deleteItem.titre },
          action: 'deleted',
          assignee: null,
          currentUser: user
        });
      }
      toast.success('Tâche supprimée avec succès');
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
      
      if (notifyTask) {
        notifyTask({
          task: { id: task.id, titre: task.titre },
          action: statut === 'TERMINEE' ? 'completed' : 'modified',
          assignee: { id: task.assigneeId },
          currentUser: user
        });
      }
      
      toast.success(`Tâche déplacée vers ${STATUT_CONFIG[statut].label}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  /* ─── Bouton « réagir » contextuel selon l'état de l'utilisateur ───
     - null  → rôle de gestion : toutes les transitions disponibles ;
     - []    → aucune réaction possible (congé, compte désactivé…) ;
     - [...] → transitions autorisées pour l'assigné/créateur selon le statut. */
  const reactionActionsFor = (task) => {
    if (!monEtat) return [];
    if (!monEtat.peutReagir) return [];
    if (monEtat.roleGestion) return null; // toutes les transitions
    const t = task.statut;
    const estConcerne = task.assigneeId === user?.id
      || task.assignee?.id === user?.id
      || task.createurId === user?.id
      || task.createur?.id === user?.id;
    if (!estConcerne) return [];
    const transitions = {
      A_FAIRE:  ['EN_COURS', 'BLOQUEE'],
      EN_COURS: ['EN_REVUE', 'BLOQUEE'],
      EN_REVUE: ['TERMINEE'],
      BLOQUEE:  ['EN_COURS'],
      TERMINEE: [],
    };
    return (transitions[t] || []).filter(s => s !== t);
  };

  const [dragActive, setDragActive] = useState(false);

  const handleDragOverColumn = (statut) => {
    // Le highlight est géré localement par chaque colonne (isDragOver) ;
    // ce hook reste disponible pour des effets globaux.
    void statut;
  };

  const handleDragLeaveColumn = () => {
    void 0;
  };

  const handleDropOnColumn = async (taskId, newStatut) => {
    const task = data.find(t => t.id === parseInt(taskId));
    if (task && task.statut !== newStatut) {
      await handleChangeStatut(task, newStatut);
    }
  };

  const handleTaskClick = (task) => {
    setViewItem(task);
    setDetailModalOpen(true);
  };

  const stats = {
    total: filtered.length,
    parStatut: STATUTS.reduce((acc, s) => ({ ...acc, [s]: byStatut(s).length }), {}),
  };

  return (
    <div>
      <PageHeader title="Gestion des Tâches" subtitle={`${stats.total} tâche${stats.total !== 1 ? 's' : ''} au total`}>
        {!isStaffOrStagiaire && <Button onClick={openCreate}>
          <SquarePlus size={16} />
          Nouvelle tâche
        </Button>}
      </PageHeader>

      {/* Bandeau d'état (congé / compte désactivé) */}
      {monEtat?.raison && (
        <Alert variant={monEtat.enConge ? 'warning' : 'danger'} style={{ marginBottom: 16 }}>
          <Flex align="center" gap={8}><AlertCircle size={16} />{monEtat.raison}</Flex>
        </Alert>
      )}

      <StatsGrid cols={STATUTS.length}>
        {STATUTS.map(s => {
          const Icon = STATUT_CONFIG[s].icon;
          return (
            <StatCard
              key={s}
              title={STATUT_CONFIG[s].label}
              value={stats.parStatut[s]}
              icon={<Icon size={22} />}
              color={STATUT_CONFIG[s].color}
            />
          );
        })}
      </StatsGrid>

      <Card style={{ marginBottom: 24 }}>
        <Flex wrap gap={12} align="flex-end">
          <Flex direction="column" style={{ flex: 2, minWidth: 200 }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher par titre ou description..."
            />
          </Flex>

          <Flex direction="column" style={{ flex: 1, minWidth: 150 }}>
            <Select
              value={filterProjet}
              onChange={e => setFilterProjet(e.target.value)}
              placeholder={null}
              options={[
                { value:'', label:'Tous les projets' },
                ...projets.map(p => ({ value:p.id, label:p.nom })),
              ]}
            />
          </Flex>

          {showSucursal && (
            <Flex direction="column" style={{ flex: 1, minWidth: 150 }}>
              <Select
                value={filterSuc}
                onChange={e => setFilterSuc(e.target.value)}
                placeholder={null}
                options={sucursalFiltreOptions}
              />
            </Flex>
          )}

          <Flex direction="column" style={{ flex: 1, minWidth: 130 }}>
            <Select
              value={filterPriorite}
              onChange={e => setFilterPriorite(e.target.value)}
              placeholder={null}
              options={[
                { value:'', label:'Toutes priorités' },
                ...PRIORITES.map(p => ({ value:p, label:PRIORITE_CONFIG[p].label })),
              ]}
            />
          </Flex>

          <Flex direction="column" style={{ flex: 1, minWidth: 150 }}>
            <Select
              value={filterAssigné}
              onChange={e => setFilterAssigné(e.target.value)}
              placeholder={null}
              options={[
                { value:'', label:'Tous les assignés' },
                ...employes.map(e => ({ value:e.id, label:e.name })),
              ]}
            />
          </Flex>

          <Tabs
            active={view}
            onChange={setView}
            tabs={[
              { key:'kanban', label:'Kanban', icon:<LayoutGrid size={14}/> },
              { key:'list', label:'Liste', icon:<List size={14}/> },
            ]}
          />

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
              Réinitialiser
            </Button>
          )}
        </Flex>
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
          <p style={{ color: 'var(--text-muted)' }}>Chargement des tâches...</p>
        </div>
      )}

      {!loading && view === 'kanban' && (
        <Flex gap={16} align="flex-start" style={{ overflowX: 'auto', paddingBottom: 16 }}>
          {STATUTS.map(s => (
            <KanbanColumn
              key={s}
              statut={s}
              tasks={byStatut(s)}
              onTaskClick={handleTaskClick}
              onEdit={openEdit}
              onDelete={setDeleteItem}
              onChangeStatut={handleChangeStatut}
              reactionActionsFor={reactionActionsFor}
              onDragOver={handleDragOverColumn}
              onDragLeaveColumn={handleDragLeaveColumn}
              onDrop={handleDropOnColumn}
              dragActive={dragActive}
              onDragStateChange={setDragActive}
              readOnly={isSecretary ? (task) => !createdByMe(task) : false}
              hideDelete={isSecretary}
            />
          ))}
        </Flex>
      )}

      {!loading && view === 'list' && (
        <Card padding={0}>
          {filtered.length === 0 ? (
            <Empty
              icon={<AlertCircle size={48} />}
              title="Aucune tâche trouvée"
              action={<Button onClick={openCreate}>Créer une tâche</Button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.map((task, index) => (
                <div
                  key={task.id}
                  style={{
                    borderBottom: index < filtered.length - 1 ? '1px solid var(--border-muted)' : 'none',
                    padding: '12px 20px',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <TaskCard
                    task={task}
                    onTaskClick={handleTaskClick}
                    onEdit={openEdit}
                    onDelete={setDeleteItem}
                    onChangeStatut={handleChangeStatut}
                    reactionActions={reactionActionsFor(task)}
                    readOnly={isSecretary && !createdByMe(task)}
                    hideDelete={isSecretary}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <TaskDetailModal
        task={viewItem}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onEdit={isSecretary && !createdByMe(viewItem || {}) ? undefined : openEdit}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Modifier la tâche' : 'Nouvelle tâche'}
        width={600}
        footer={<Flex justify="flex-end" gap={10}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>
              {editItem ? 'Enregistrer' : 'Créer'}
            </Button>
        </Flex>
        }
      >
        <form onSubmit={handleSave}>
          <Flex direction="column" gap={16}>
            <Input
              label="Titre *"
              value={form.titre}
              onChange={set('titre')}
              placeholder="Titre de la tâche"
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={set('description')}
              placeholder="Description détaillée..."
              rows={3}
            />
            <FormRow>
              <Select
                label="Statut"
                value={form.statut}
                onChange={set('statut')}
                options={STATUTS.map(s => ({ 
                  value: s, 
                  label: `${STATUT_CONFIG[s].label}` 
                }))}
              />
              <Select
                label="Priorité"
                value={form.priorite}
                onChange={set('priorite')}
                options={PRIORITES.map(p => ({ value: p, label: PRIORITE_CONFIG[p].label }))}
              />
            </FormRow>
            <FormRow>
              <SucursaleField
                showSucursal={showSucursal}
                value={form.sucursalId}
                onChange={set('sucursalId')}
                options={sucursalesFormOptions}
                compteAncre={compteAncre}
                sucursalUtilisateurNom={sucursalUtilisateurNom}
              />
              <Select
                label="Projet *"
                value={form.projetId}
                onChange={set('projetId')}
                options={projetsFormOptions}
                placeholder="Choisir un projet"
                required
              />
              <Select
                label="Visibilité"
                value={form.visibilite}
                onChange={set('visibilite')}
                options={[
                  { value: 'PUBLIQUE', label: 'Publique — visible par tous' },
                  { value: 'PRIVEE', label: 'Privée — créateur + assigné uniquement' }
                ]}
              />
            </FormRow>
            <FormRow>
              <Select
                label="Assigner à"
                value={form.assigneeId}
                onChange={set('assigneeId')}
                options={employesFormOptions}
                placeholder="Sélectionner un employé..."
              />
              <Input
                label="Date d'échéance (optionnelle)"
                type="date"
                value={form.dateEcheance}
                onChange={set('dateEcheance')}
              />
            </FormRow>
          </Flex>
        </form>
      </Modal>

      <Confirm
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Supprimer la tâche"
        message={`Êtes-vous sûr de vouloir supprimer la tâche "${deleteItem?.titre}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
      />
    </div>
  );
}
