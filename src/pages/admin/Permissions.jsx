import { useState } from 'react';
import { useDeferredTask } from '../../hooks/useDeferredTask';
import { SquarePlus, Pencil, Trash2, Zap, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { permissionApi, actionApi } from '../../Api';
import {
    PageHeader, Card, Table, Badge, Button, Modal, Input, Textarea,
    Confirm, SearchInput, Alert, StatCard, StatsGrid, IconBox, Flex
} from '../../components/ui';
import toast from 'react-hot-toast';

const EMPTY_FORM = { 
    name: '', 
    description: '', 
    actionIds: [] 
};

export default function Permissions() {
    // État principal
    const [permissions, setPermissions] = useState([]);
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // État du modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    
    // État de suppression
    const [deleteItem, setDeleteItem] = useState(null);
    const [deleting, setDeleting] = useState(false);
    
    // État pour l'affichage des actions dans la liste
    const [expandedActions, setExpandedActions] = useState({});

    // ============================================================
    // CHARGEMENT DES DONNÉES
    // ============================================================
    
    const loadPermissions = async () => {
        try {
            const res = await permissionApi.getAll({ page: 0, size: 100 });
            const data = res.data?.data || res.data;
            const permissionsList = Array.isArray(data) ? data : data?.content || [];
            setPermissions(permissionsList);
        } catch (error) {
            console.error('Erreur chargement permissions:', error);
            toast.error('Erreur lors du chargement des permissions');
        } finally {
            setLoading(false);
        }
    };
    
    const loadActions = async () => {
        try {
            const res = await actionApi.getAll({ page: 0, size: 500 });
            const data = res.data?.data || res.data;
            const actionsList = Array.isArray(data) ? data : data?.content || [];
            setActions(actionsList);
        } catch (error) {
            console.error('Erreur chargement actions:', error);
            toast.error('Erreur lors du chargement des actions');
        }
    };
    
    useDeferredTask(() => Promise.all([loadPermissions(), loadActions()]), 'mount');
    
    // ============================================================
    // FILTRAGE
    // ============================================================
    
    const filteredPermissions = permissions.filter(perm =>
        !search || 
        perm.name?.toLowerCase().includes(search.toLowerCase()) ||
        perm.description?.toLowerCase().includes(search.toLowerCase())
    );
    
    // ============================================================
    // GESTION DU MODAL (Création/Édition)
    // ============================================================
    
    const openCreateModal = () => {
        setForm(EMPTY_FORM);
        setEditItem(null);
        setModalOpen(true);
    };
    
    const openEditModal = (permission) => {
        setEditItem(permission);
        setForm({
            name: permission.name || '',
            description: permission.description || '',
            actionIds: permission.actions?.map(a => a.id) || []
        });
        setModalOpen(true);
    };
    
    const toggleAction = (actionId) => {
        setForm(prev => ({
            ...prev,
            actionIds: prev.actionIds.includes(actionId)
                ? prev.actionIds.filter(id => id !== actionId)
                : [...prev.actionIds, actionId]
        }));
    };
    
    const toggleAllActions = () => {
        if (form.actionIds.length === actions.length) {
            setForm(prev => ({ ...prev, actionIds: [] }));
        } else {
            setForm(prev => ({ ...prev, actionIds: actions.map(a => a.id) }));
        }
    };
    
    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!form.name.trim()) {
            toast.error('Le nom de la permission est requis');
            return;
        }
        
        setSaving(true);
        try {
            if (editItem) {
                await permissionApi.update(editItem.id, {
                    name: form.name.trim(),
                    description: form.description,
                    actionIds: form.actionIds
                });
                toast.success('Permission modifiée avec succès');
            } else {
                await permissionApi.create({
                    name: form.name.trim(),
                    description: form.description,
                    actionIds: form.actionIds
                });
                toast.success('Permission créée avec succès');
            }
            setModalOpen(false);
            loadPermissions();
        } catch (error) {
            const message = error.response?.data?.message || 'Erreur lors de l\'enregistrement';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };
    
    // ============================================================
    // GESTION DE LA SUPPRESSION
    // ============================================================
    
    const handleDelete = async () => {
        if (!deleteItem) return;
        
        setDeleting(true);
        try {
            await permissionApi.delete(deleteItem.id);
            toast.success('Permission supprimée avec succès');
            setDeleteItem(null);
            loadPermissions();
        } catch (error) {
            const message = error.response?.data?.message || 'Erreur lors de la suppression';
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };
    
    // ============================================================
    // AFFICHAGE DES ACTIONS DANS LE TABLEAU
    // ============================================================
    
    const toggleActionsExpand = (permissionId) => {
        setExpandedActions(prev => ({
            ...prev,
            [permissionId]: !prev[permissionId]
        }));
    };
    
    const renderActionsList = (actionsList, permissionId) => {
        if (!actionsList || actionsList.length === 0) {
            return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune action</span>;
        }
        
        const isExpanded = expandedActions[permissionId];
        const displayActions = isExpanded ? actionsList : actionsList.slice(0, 5);
        const hasMore = actionsList.length > 5;
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {displayActions.map(action => (
                        <Badge key={action.id} size="sm" variant="warning">
                            {action.name}
                        </Badge>
                    ))}
                </div>
                {hasMore && (
                    <button
                        onClick={() => toggleActionsExpand(permissionId)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontSize: 11,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            width: 'fit-content',
                            borderRadius: 'var(--radius-sm)'
                        }}
                    >
                        {isExpanded ? (
                            <>Voir moins <ChevronUp size={12}/></>
                        ) : (
                            <>+{actionsList.length - 5} autres <ChevronDown size={12}/></>
                        )}
                    </button>
                )}
            </div>
        );
    };
    
    // ============================================================
    // COLONNES DU TABLEAU
    // ============================================================
    
    const columns = [
        {
            key: 'name',
            label: 'Permission',
            render: (value, row) => (
                <Flex align="center" gap={12}>
                    <IconBox icon={<Zap size={20} />} color="#F59E0B" size={40} />
                    <div>
                        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                            {value}
                        </p>
                        {row.description && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {row.description}
                            </p>
                        )}
                    </div>
                </Flex>
            )
        },
        {
            key: 'actions',
            label: 'Actions associées',
            render: (value, row) => renderActionsList(value, row.id)
        },
        {
            key: 'nombreRoles',
            label: 'Rôles',
            align: 'center',
            render: (value) => (
                <Badge variant="info" size="sm">
                    {value || 0} rôle{(value || 0) > 1 ? 's' : ''}
                </Badge>
            )
        },
       
        {
            key: 'id',
            label: 'Actions',
            align: 'right',
            render: (value, row) => (
                <Flex gap={8} justify="flex-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(row);
                        }}
                        title="Modifier"
                    >
                        <Pencil size={16} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteItem(row);
                        }}
                        style={{ color: 'var(--color-danger)' }}
                        title="Supprimer"
                    >
                        <Trash2 size={16} />
                    </Button>
                </Flex>
            )
        }
    ];
    
    // ============================================================
    // GROUPE DES ACTIONS PAR CATÉGORIE
    // ============================================================
    
    const groupActionsByCategory = () => {
        const categories = {
            'Dashboard & Analytics': ['view_dashboard', 'view_statistics', 'export_reports', 'view_ai_analytics', 'run_ai_predictions'],
            'Documents': ['upload_document', 'download_document', 'export_document', 'import_document', 'view_documents', 'manage_documents', 'share_document', 'delete_document'],
            'Employés': ['list_employees', 'view_employee_profile', 'create_employee', 'update_employee', 'archive_employee', 'evaluate_performance', 'plan_training', 'upload_contract', 'validate_certificate', 'assign_to_department', 'assign_to_project'],
            'Temps & Congés': ['view_all_timesheets', 'submit_own_timesheet', 'approve_timesheet', 'request_leave', 'approve_leave', 'view_own_leave_balance', 'view_all_leaves', 'manage_leave_types', 'export_leave_reports', 'create_mission', 'assign_mission', 'validate_mission'],
            'Paie': ['view_own_payroll', 'view_all_payrolls', 'generate_payroll', 'manage_payroll_settings', 'export_payroll_reports'],
            'Projets': ['list_projects', 'view_project', 'create_project', 'update_project', 'delete_project', 'assign_team_member', 'update_project_budget', 'view_project_reports'],
            'Tâches': ['view_tasks', 'view_own_tasks', 'create_task', 'update_task', 'delete_task', 'assign_task', 'change_task_status', 'add_task_comment', 'view_task_history', 'set_task_priority', 'set_task_deadline', 'view_task_calendar'],
            'Agenda': ['view_calendar', 'view_team_calendar', 'view_company_calendar', 'create_event', 'update_event', 'delete_event', 'invite_to_event', 'set_event_reminder', 'view_event_details', 'export_calendar', 'synchronize_calendar'],
            'Administration': ['manage_users', 'manage_roles', 'manage_permissions', 'view_audit_logs', 'system_configuration', 'backup_database', 'restore_database']
        };
        
        const grouped = {};
        actions.forEach(action => {
            let category = 'Autres';
            for (const [cat, actionNames] of Object.entries(categories)) {
                if (actionNames.includes(action.name)) {
                    category = cat;
                    break;
                }
            }
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(action);
        });
        return grouped;
    };
    
    // ============================================================
    // RENDU PRINCIPAL
    // ============================================================
    
    return (
        <div>
            <PageHeader 
                title="Permissions" 
                subtitle="Gestion des permissions système et des actions associées"
            >
                <Button onClick={openCreateModal}>
                    <SquarePlus size={16} />
                    Nouvelle permission
                </Button>
            </PageHeader>
            
            {/* Statistiques rapides */}
            <StatsGrid cols={3}>
                <StatCard title="Permissions" value={permissions.length} icon={<Zap size={22} />} color="var(--color-primary)" />
                <StatCard title="Actions disponibles" value={actions.length} icon={<Settings size={22} />} color="var(--color-success)" />
                <StatCard title="Actions moyennes par permission" value={Math.round(permissions.reduce((acc, p) => acc + (p.actions?.length || 0), 0) / (permissions.length || 1))} icon={<Zap size={22} />} color="var(--color-warning)" />
            </StatsGrid>
            
            {/* Tableau des permissions */}
            <Card padding={0}>
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Rechercher une permission..."
                        style={{ flex: 1, maxWidth: 360 }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {filteredPermissions.length} permission{filteredPermissions.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <Table
                    columns={columns}
                    data={filteredPermissions}
                    loading={loading}
                    emptyText="Aucune permission trouvée"
                />
            </Card>
            
            {/* Modal de création/édition */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editItem ? 'Modifier la permission' : 'Nouvelle permission'}
                width={800}
                footer={
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            {editItem ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleSave}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Informations de base */}
                        <div>
                            <Input
                                label="Nom de la permission *"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="ex: gestion_employes"
                                required
                                autoFocus
                            />
                        </div>
                        
                        {/* ✅ CORRECTION: Utilisation de Textarea au lieu de Input */}
                        <div>
                            <Textarea
                                label="Description"
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Description de la permission..."
                                rows={3}
                            />
                        </div>
                        
                        {/* Sélection des actions */}
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 12
                            }}>
                                <label style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)'
                                }}>
                                    Actions associées ({form.actionIds.length} sélectionnée{form.actionIds.length !== 1 ? 's' : ''})
                                </label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAllActions}
                                >
                                    {form.actionIds.length === actions.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                </Button>
                            </div>
                            
                            <div style={{
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--radius-md)',
                                maxHeight: 400,
                                overflowY: 'auto',
                                background: 'var(--bg-surface)'
                            }}>
                                {Object.entries(groupActionsByCategory()).map(([category, categoryActions]) => (
                                    <div key={category}>
                                        <div style={{
                                            padding: '10px 14px',
                                            background: 'var(--bg-muted)',
                                            borderBottom: '1px solid var(--border-default)',
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {category}
                                        </div>
                                        {categoryActions.map(action => (
                                            <label
                                                key={action.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '10px 14px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border-muted)',
                                                    transition: 'background var(--transition-fast)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.actionIds.includes(action.id)}
                                                    onChange={() => toggleAction(action.id)}
                                                    style={{
                                                        width: 18,
                                                        height: 18,
                                                        cursor: 'pointer',
                                                        accentColor: 'var(--color-primary)'
                                                    }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                                                        {action.name}
                                                    </p>
                                                    {action.description && (
                                                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            {action.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            
                            {actions.length === 0 && (
                                <Alert type="warning">
                                    Aucune action disponible. Vérifiez que le backend est bien démarré et que les actions sont initialisées.
                                </Alert>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
            
            {/* Modal de confirmation de suppression */}
            <Confirm
                open={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleDelete}
                loading={deleting}
                title="Supprimer la permission"
                message={
                    <div>
                        <p>Êtes-vous sûr de vouloir supprimer la permission <strong>"{deleteItem?.name}"</strong> ?</p>
                        {deleteItem?.nombreRoles > 0 && (
                            <p style={{ color: 'var(--color-warning)', marginTop: 8 }}>
                                ⚠️ Cette permission est utilisée par {deleteItem.nombreRoles} rôle(s) et {deleteItem.nombrePostes} poste(s).
                                La suppression pourrait affecter les droits associés.
                            </p>
                        )}
                        <p style={{ marginTop: 8 }}>Cette action est irréversible.</p>
                    </div>
                }
                confirmLabel="Supprimer"
                confirmVariant="danger"
            />
        </div>
    );
}
