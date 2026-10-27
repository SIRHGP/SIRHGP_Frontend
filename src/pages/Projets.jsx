import { useState, useEffect } from 'react';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { SquarePlus, Pencil, Trash2, Users, Calendar, TrendingUp, Grid, List, CheckSquare, AlertTriangle, DollarSign, Eye } from 'lucide-react';
import { projetApi, employerApi, departementApi, fetchAllPages } from '../Api';
import { PageHeader, Card, Badge, Button, Modal, Input, Select, Confirm, SearchInput, Avatar, StatCard, StatsGrid, FormRow, Textarea, Progress, SucursaleBadge, SucursaleField } from '../components/ui';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import ProjectDetailModal from '../components/projects/ProjectDetailModal';
import { useSucursales } from '../hooks/useSucursales';
import { useAuth } from '../contexts/Authcontext';
import toast from 'react-hot-toast';

// ============================================================
// 1. CORRECTION: STATUTS alignés avec le backend
// ============================================================
const STATUTS = ['PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE', 'ANNULE', 'EN_RETARD'];

const STATUT_BADGE = {
  PLANIFIE:   { label: 'Planifié',    variant: 'default', color: '#94A3B8' },
  EN_COURS:   { label: 'En cours',    variant: 'info',    color: '#3B82F6' },
  SUSPENDU:   { label: 'Suspendu',    variant: 'warning', color: '#F59E0B' }, 
  TERMINE:    { label: 'Terminé',     variant: 'success', color: '#10B981' },
  ANNULE:     { label: 'Annulé',      variant: 'danger',  color: '#EF4444' },
  EN_RETARD:  { label: 'En retard',   variant: 'danger',  color: '#EF4444' },
};

// ============================================================
// 2. CORRECTION: EMPTY_FORM avec valeurs correctes
// ============================================================
const EMPTY = {
  sucursalId: '',
  nom: '',
  description: '',
  codeProjet: '',
  statut: 'PLANIFIE',
  dateDebut: '',
  dateFinPrevue: '',
  budgetAlloue: '',
  chefProjetId: null,        // ← CHANGÉ: '' → null
  membresIds: [],
  departementIds: [],
  objectifPrincipal: '',
  objectifSpecifique: '',
  livrable: '',
  estimationDureeJours: ''
};

// ============================================================
// Composant ProjetCard
// ============================================================
function ProjetCard({ p, onEdit, onDelete, onReport, onDetails, readOnly = false, showFinancial = false }) {
  const st = STATUT_BADGE[p.statut] || STATUT_BADGE.PLANIFIE;
  const budget = p.budgetAlloue
    ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(p.budgetAlloue)
    : '—';
  // [3.3] consommé (coût réel) vs alloué
  const coutReel = p.coutReel != null ? p.coutReel : (p.budgetConsomme || 0);
  const taux = p.tauxConsommation ?? (p.budgetAlloue && p.budgetAlloue > 0 ? (coutReel / p.budgetAlloue) * 100 : 0);
  const depasse = taux > 100;

  const formatDate = (date) => {
    if (!date) return '—';
    try { return format(parseISO(date), 'dd/MM/yyyy', { locale: fr }); } catch { return date; }
  };

  return (
    <Card hover style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px 8px', marginBottom: 6, overflow: 'hidden' }}>
            <Badge variant={st.variant} size="sm" dot>{st.label}</Badge>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{p.codeProjet}</span>
            <SucursaleBadge sucursalNom={p.sucursalNom} />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>{p.nom}</h3>
          {p.description && (<p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</p>)}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" style={{ padding: '6px 6px' }} onClick={() => onDetails?.(p)} title="Détails du projet"><Eye size={14} /></Button>
          {!readOnly && <Button variant="ghost" size="sm" style={{ padding: '6px 6px' }} onClick={() => onEdit(p)} title="Modifier"><Pencil size={14} /></Button>}
          {!readOnly && <Button variant="ghost" size="sm" style={{ padding: '6px 6px' }} onClick={() => onReport?.(p)} title="Rapport prévu vs réalisé"><TrendingUp size={14} /></Button>}
          {!readOnly && <Button variant="ghost" size="sm" style={{ padding: '6px 6px', color: 'var(--color-danger)' }} onClick={() => onDelete(p)} title="Supprimer"><Trash2 size={14} /></Button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 'auto' }}>
        {p.dateFinPrevue && (<span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {formatDate(p.dateFinPrevue)}</span>)}
        {showFinancial && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} /> {budget}</span>}
      </div>

      {/* [3.3] Consommation budget (réel vs alloué) */}
      {showFinancial && p.budgetAlloue > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Progress value={Math.min(taux, 100)} color={depasse ? 'var(--color-danger)' : 'var(--color-primary)'} size="sm" />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: depasse ? 'var(--color-danger)' : 'var(--text-muted)', minWidth: 44, textAlign: 'right' }}>
            {depasse ? '>' : ''}{Math.round(taux)}%
          </span>
        </div>
      )}

      {(p.progression !== undefined || p.statut === 'TERMINE') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}><Progress value={p.progression ?? (p.statut === 'TERMINE' ? 100 : 0)} color={st.color} size="sm" /></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{p.progression ?? (p.statut === 'TERMINE' ? 100 : 0)}%</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border-muted)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {(p.chefProjetName || p.chefProjet?.name) ? (
            <>
              <Avatar name={p.chefProjetName || p.chefProjet.name} size={22} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p.chefProjetName || p.chefProjet.name).split(' ')[0]}</span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {p.nombreMembres > 0 && (<span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} /> {p.nombreMembres}</span>)}
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// Composant Principal
// ============================================================
export default function Projets() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'MANAGER', 'LEAD'].includes(user?.roleName);
  const readOnly = !canManage;
  const showFinancial = ['ADMIN', 'MANAGER'].includes(user?.roleName);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const { showSucursal, optionsFiltre: sucursalFiltreOptions,
          optionsFormulaire: sucursalFormOptions, correspond: sucursalMatch,
          compteAncre, sucursalUtilisateurNom } = useSucursales();
  const [filterSuc, setFilterSuc] = useState('');
  const [view, setView] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employes, setEmployes] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [reportItem, setReportItem] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // ============================================================
  // Chargement des données
  // ============================================================
  const load = async () => {
    try {
      const projets = await fetchAllPages(projetApi.getAll, 200);
      setData(Array.isArray(projets) ? projets : []);
    } catch (error) { console.error('Erreur chargement:', error); toast.error('Erreur chargement des projets'); } finally { setLoading(false); }
  };
  useDeferredTask(load, 'mount');

  // Chargement des employés
  useEffect(() => {
    if (readOnly) return;
    employerApi.getAll({ size: 200 }).then(r => { const d = r.data?.data || r.data; setEmployes(Array.isArray(d) ? d : d?.content || []); }).catch(() => {});
    fetchAllPages(departementApi.getAll, 200).then(setDepartements).catch(() => setDepartements([]));
  }, [readOnly]);

  // ============================================================
  // Filtrage
  // ============================================================
  const filtered = data.filter(p => (!search || p.nom?.toLowerCase().includes(search.toLowerCase()) || p.codeProjet?.toLowerCase().includes(search.toLowerCase())) && (!filterStatut || p.statut === filterStatut) && sucursalMatch(p, filterSuc));

  // ============================================================
  // Gestion du formulaire
  // ============================================================
  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };

  const openEdit = (item) => { setEditItem(item); setForm({ nom: item.nom || '', description: item.description || '', codeProjet: item.codeProjet || '', statut: item.statut || 'PLANIFIE', dateDebut: item.dateDebut || '', dateFinPrevue: item.dateFinPrevue || '', budgetAlloue: item.budgetAlloue || '', chefProjetId: item.chefProjetId || item.chefProjet?.id || null, membresIds: item.membresIds || item.membres?.map(m => m.id) || [], departementIds: item.departementIds || item.departements?.map(d => d.id) || [], sucursalId: item.sucursalId || '', objectifPrincipal: item.objectifPrincipal || '', objectifSpecifique: item.objectifSpecifique || '', livrable: item.livrable || '', estimationDureeJours: item.estimationDureeJours || '' }); setModalOpen(true); };

  const setField = (k) => (e) => {
    const value = e.target?.value ?? e;
    if (k === 'chefProjetId') {
      setForm(f => ({ ...f, [k]: value === '' || value === null || value === undefined ? null : Number(value) }));
    } else {
      setForm(f => ({ ...f, [k]: value }));
    }
  };

  const handleSave = async (e) => { e.preventDefault(); const errors = []; if (!form.nom?.trim()) errors.push('Le nom du projet est obligatoire'); if (!form.codeProjet?.trim()) errors.push('Le code projet est obligatoire'); if (!form.dateDebut) errors.push('La date de début est obligatoire'); if (!form.dateFinPrevue) errors.push('La date de fin prévue est obligatoire'); if (!form.chefProjetId) errors.push('Le chef de projet est obligatoire'); if (user?.roleName === 'LEAD' && !form.departementIds?.length) errors.push('Sélectionnez au moins un département que vous supervisez'); if (errors.length > 0) { errors.forEach(err => toast.error(err)); return; } const payload = { nom: form.nom.trim(), description: form.description?.trim() || null, codeProjet: form.codeProjet.trim().toUpperCase(), statut: form.statut, dateDebut: form.dateDebut, dateFinPrevue: form.dateFinPrevue, dateFinReelle: null, budgetAlloue: form.budgetAlloue ? parseFloat(form.budgetAlloue) : null, chefProjetId: Number(form.chefProjetId), membresIds: form.membresIds || [], departementIds: form.departementIds || [], sucursalId: form.sucursalId || null, objectifPrincipal: form.objectifPrincipal?.trim() || null, objectifSpecifique: form.objectifSpecifique?.trim() || null, livrable: form.livrable?.trim() || null, estimationDureeJours: form.estimationDureeJours ? parseInt(form.estimationDureeJours) : null }; setSaving(true); try { if (editItem) { await projetApi.update(editItem.id, payload); } else { await projetApi.create(payload); } toast.success(editItem ? 'Projet modifié avec succès' : 'Projet créé avec succès'); setModalOpen(false); load(); } catch (err) { const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Erreur lors de l\'enregistrement'; toast.error(message); } finally { setSaving(false); } };

  const openReport = async (p) => {
    setReportItem(p);
    setReportData(null);
    setReportLoading(true);
    try {
      const r = await projetApi.getReporting(p.id);
      setReportData(r?.data?.data || r?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Rapport indisponible');
    } finally {
      setReportLoading(false);
    }
  };

  const handleDelete = async () => { setDeleting(true); try { await projetApi.delete(deleteItem.id); toast.success('Projet supprimé avec succès'); setDeleteItem(null); load(); } catch { toast.error('Erreur lors de la suppression'); } finally { setDeleting(false); } };

  // ============================================================
  // Rendu
  // ============================================================
  return (
    <div>
      <PageHeader title="Projets" subtitle={`${data.length} projet${data.length !== 1 ? 's' : ''} au total`}>
        {!readOnly && <Button onClick={openCreate}>
          <SquarePlus size={16} /> Nouveau projet
        </Button>}
      </PageHeader>

      {/* Stats */}
      <StatsGrid cols={4}>
        <StatCard title="Total projets" value={data.length} icon={<Users size={22} />} color="var(--color-primary)" />
        <StatCard title="En cours" value={data.filter(p => p.statut === 'EN_COURS').length} icon={<CheckSquare size={22} />} color="var(--color-info)" />
        <StatCard title="Terminés" value={data.filter(p => p.statut === 'TERMINE').length} icon={<TrendingUp size={22} />} color="var(--color-success)" />
        <StatCard title="En retard" value={data.filter(p => p.estEnRetard || p.statut === 'EN_RETARD').length} icon={<AlertTriangle size={22} />} color="var(--color-danger)" />
      </StatsGrid>

      {/* Filters & view toggle */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un projet..." style={{ flex: '1 1 240px', maxWidth: 360 }} />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={{ padding: '9px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer' }}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{STATUT_BADGE[s].label}</option>)}
        </select>
        {showSucursal && (
          <select value={filterSuc} onChange={e => setFilterSuc(e.target.value)} title="Filtrer par succursale d'origine" style={{ padding: '9px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer' }}>
            {sucursalFiltreOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {['grid', 'list'].map(key => (
            <button
              key={key}
              onClick={() => setView(key)}
              title={key === 'grid' ? 'Grille' : 'Liste'}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: view === key ? 'var(--color-primary)' : 'var(--bg-surface)',
                color: view === key ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {key === 'grid' ? <Grid size={16} /> : <List size={16} />}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}> {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(3,1fr)' : '1fr', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (<div key={i} style={{ height: 200, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '64px 24px' }}><p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Aucun projet trouvé</p></Card>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>{filtered.map(p => (<ProjetCard key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteItem} onReport={openReport} onDetails={setDetailItem} readOnly={readOnly} showFinancial={showFinancial} />))}</div>
      ) : (
        <Card padding={0}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-muted)' }}>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Projet</span>
          <span style={{ width: 110, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Statut</span>
          <span style={{ width: 150, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Progression</span>
          <span style={{ width: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>Échéance</span>
          <span style={{ width: 76 }} />
        </div>
        {filtered.map((p, i) => {
          const st = STATUT_BADGE[p.statut] || STATUT_BADGE.PLANIFIE;
          const formatDate = (date) => { if (!date) return '—'; try { return format(parseISO(date), 'dd/MM/yyyy', { locale: fr }); } catch { return date; } };
          const progression = p.progression ?? (p.statut === 'TERMINE' ? 100 : 0);
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-muted)' : undefined }}>
              <div style={{ width: 4, height: 40, borderRadius: 2, background: st.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', rowGap: 4, minWidth: 0, overflow: 'hidden' }}>
                  <button onClick={() => setDetailItem(p)} title="Voir les détails du projet" style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nom}</button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{p.codeProjet}</span>
                  <SucursaleBadge sucursalNom={p.sucursalNom} />
                </div>
                {p.description && (<p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>)}
              </div>
              <div style={{ width: 110 }}><Badge variant={st.variant} size="sm" dot>{st.label}</Badge></div>
              <div style={{ width: 150, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}><Progress value={progression} color={st.color} size="sm" /></div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 30 }}>{progression}%</span>
              </div>
              <span style={{ width: 100, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(p.dateFinPrevue)}</span>
              <div style={{ width: 76, display: 'flex', gap: 6 }}>
                {!readOnly && <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={14} /></Button>}
                {!readOnly && <Button variant="ghost" size="sm" onClick={() => setDeleteItem(p)} style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></Button>}
              </div>
            </div>
          );
        })}</Card>
      )}

      {/* Modal de création/édition */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le projet' : 'Nouveau projet'} width={680} footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button></div>}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormRow>
              <Input label="Nom du projet *" value={form.nom} onChange={setField('nom')} placeholder="Nom du projet" required />
              <Input label="Code projet *" value={form.codeProjet} onChange={setField('codeProjet')} placeholder="PROJ-001" required />
            </FormRow>
            <Textarea label="Description" value={form.description} onChange={setField('description')} placeholder="Description du projet..." />
            <FormRow>
              <Select label="Statut" value={form.statut} onChange={setField('statut')} options={STATUTS.map(s => ({ value: s, label: STATUT_BADGE[s].label }))} placeholder="Sélectionner le statut" />
              <Input label="Budget alloué (XAF)" type="number" value={form.budgetAlloue} onChange={setField('budgetAlloue')} placeholder="5000000" />
            </FormRow>
            <FormRow>
              <Input label="Date de début *" type="date" value={form.dateDebut} onChange={setField('dateDebut')} required />
              <Input label="Date de fin prévue *" type="date" value={form.dateFinPrevue} onChange={setField('dateFinPrevue')} required />
            </FormRow>
            <FormRow>
              <Select label="Chef de projet *" value={form.chefProjetId} onChange={setField('chefProjetId')} options={employes.map(e => ({ value: e.id, label: e.name }))} placeholder="Sélectionner le chef de projet" required />
              <SucursaleField showSucursal={showSucursal} value={form.sucursalId}
                onChange={setField('sucursalId')} options={sucursalFormOptions}
                compteAncre={compteAncre} sucursalUtilisateurNom={sucursalUtilisateurNom} />
            </FormRow>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Départements rattachés{user?.roleName === 'LEAD' ? ' *' : ''}
              <select multiple value={(form.departementIds || []).map(String)} onChange={e => setForm(f => ({ ...f, departementIds: Array.from(e.target.selectedOptions, option => Number(option.value)) }))} style={{ minHeight: 96, padding: 8, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                {departements.map(departement => <option key={departement.id} value={departement.id}>{departement.name}</option>)}
              </select>
              <span style={{ fontSize: 11, fontWeight: 400 }}>Maintenez Ctrl pour sélectionner plusieurs départements.</span>
            </label>
            <Textarea label="Objectif principal" value={form.objectifPrincipal} onChange={setField('objectifPrincipal')} placeholder="Quel est l'objectif global du projet ?" rows={2} />
            <Textarea label="Objectif spécifique" value={form.objectifSpecifique} onChange={setField('objectifSpecifique')} placeholder="Résultat concret et mesurable attendu" rows={2} />
            <Textarea label="Livrable" value={form.livrable} onChange={setField('livrable')} placeholder="Produit, service ou document remis à la fin" rows={2} />
            <FormRow>
              <Input label="Estimation durée (jours)" type="number" value={form.estimationDureeJours} onChange={setField('estimationDureeJours')} placeholder="ex: 90" />
            </FormRow>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmation de suppression */}
      {/* [3.5] Rapport prévu vs réalisé */}
      <Modal isOpen={!!reportItem} onClose={() => setReportItem(null)} title={`Rapport — ${reportItem?.nom || ''}`} width="lg">
        {reportLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement du rapport…</div>
        ) : reportData ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Budget */}
            <Card style={{ padding: '16px', gridColumn: '1 / -1' }}>
              <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-primary)' }}>💰 Budget prévu vs réel</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Prévu : <b>{reportData.budgetPrevu ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(reportData.budgetPrevu) : '—'}</b></span>
                <span>Réel : <b>{reportData.coutReel ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(reportData.coutReel) : '0'}</b></span>
                <span style={{ color: (reportData.ecartBudget < 0 ? 'var(--color-danger)' : 'var(--color-success)') }}>
                  Écart : <b>{reportData.ecartBudget != null ? Math.round(reportData.ecartBudget).toLocaleString('fr-FR') + ' FCFA' : '—'}</b>
                </span>
              </div>
              {reportData.tauxConsommation != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}><Progress value={Math.min(reportData.tauxConsommation, 100)} color={reportData.tauxConsommation > 100 ? 'var(--color-danger)' : 'var(--color-primary)'} size="sm" /></div>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{Math.round(reportData.tauxConsommation)}% consommé</span>
                </div>
              )}
            </Card>

            {/* Délais */}
            <Card style={{ padding: 16 }}>
              <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📅 Délais</h4>
              {(() => {
                const fmt = dt => dt ? format(parseISO(dt), 'dd/MM/yyyy', { locale: fr }) : '—';
                return (
                  <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                    <div>Début : <b>{fmt(reportData.dateDebut)}</b></div>
                    <div>Fin prévue : <b>{fmt(reportData.dateFinPrevue)}</b></div>
                    <div>Fin réelle : <b>{fmt(reportData.dateFinReelle)}</b></div>
                    <div style={{ color: reportData.estEnRetard ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {reportData.estEnRetard ? `⚠️ En retard de ${reportData.retardJours ?? 0} jour(s)` : '✅ Dans les délais'}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Tâches */}
            <Card style={{ padding: 16 }}>
              <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🔄 Tâches</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Terminées : <b>{reportData.tachesTerminees}/{reportData.tachesTotal}</b></span>
                <span>Progression : <b>{reportData.progression ?? 0}%</b></span>
              </div>
              {reportData.tachesEnRetard > 0 && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>⚠️ {reportData.tachesEnRetard} en retard</div>}
              {reportData.tachesBloquees > 0 && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>🚫 {reportData.tachesBloquees} bloquée(s)</div>}
              {reportData.tachesParStatut && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {Object.entries(reportData.tachesParStatut).map(([k, v]) => (
                    <Badge key={k} size="sm">{k.replace('_', ' ')} : {v}</Badge>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div style={{ padding: 30, textAlign: 'center' }}>Rapport indisponible</div>
        )}
      </Modal>

      {/* Fiche détaillée du projet (style « Détails de la tâche ») */}
      {detailItem && <ProjectDetailModal projectId={detailItem.id} onClose={() => setDetailItem(null)} />}

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={deleting} title="Supprimer le projet" message={`Êtes-vous sûr de vouloir supprimer "${deleteItem?.nom}" ? Cette action est irréversible.`} confirmLabel="Supprimer" />
    </div>
  );
}
