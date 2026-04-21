import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, Flag, User, Calendar } from 'lucide-react';
import { tacheApi, projetApi, employerApi } from '../Api';
import { PageHeader, Card, Badge, Button, Modal, Input, Select, Confirm, SearchInput, Avatar, FormRow, Textarea } from '../components/ui';
import toast from 'react-hot-toast';

const STATUTS = ['A_FAIRE','EN_COURS','EN_ATTENTE','TERMINEE','ANNULEE'];
const STATUT_CONFIG = {
  A_FAIRE:   { label:'À faire',    variant:'default', color:'#94A3B8', bg:'#F1F5F9' },
  EN_COURS:  { label:'En cours',   variant:'info',    color:'#3B82F6', bg:'#EFF6FF' },
  EN_ATTENTE:{ label:'En attente', variant:'warning', color:'#F59E0B', bg:'#FFFBEB' },
  TERMINEE:  { label:'Terminée',   variant:'success', color:'#10B981', bg:'#F0FDF4' },
  ANNULEE:   { label:'Annulée',    variant:'danger',  color:'#EF4444', bg:'#FFF5F5' },
};
const PRIORITES = ['BASSE','NORMALE','HAUTE','URGENTE'];
const PRIORITE_COLOR = { BASSE:'var(--color-success)', NORMALE:'var(--color-primary)', HAUTE:'var(--color-warning)', URGENTE:'var(--color-danger)' };
const EMPTY = { titre:'', description:'', statut:'A_FAIRE', priorite:'NORMALE', dateEcheance:'', assigneeId:'', projetId:'' };

function KanbanColumn({ statut, tasks, onEdit, onDelete, onChangeStatut }) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <div style={{ flex:'1 1 220px', minWidth:220, maxWidth:300 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, padding:'8px 12px', background:cfg.bg, borderRadius:'var(--radius-md)', border:`1px solid ${cfg.color}30` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color }}/>
          <span style={{ fontWeight:600, fontSize:13, color:cfg.color }}>{cfg.label}</span>
        </div>
        <Badge variant={cfg.variant} size="sm">{tasks.length}</Badge>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, minHeight:80 }}>
        {tasks.map(t => (
          <div key={t.id} style={{
            background:'var(--bg-surface)', borderRadius:'var(--radius-md)', padding:'12px 14px',
            border:'1px solid var(--border-default)', boxShadow:'var(--shadow-xs)',
            transition:'all var(--transition-fast)', cursor:'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow='var(--shadow-md)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow='var(--shadow-xs)'}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
              <p style={{ fontWeight:600, fontSize:13, color:'var(--text-primary)', flex:1, lineHeight:1.4 }}>{t.titre}</p>
              <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                <button onClick={() => onEdit(t)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:2 }}><Pencil size={12}/></button>
                <button onClick={() => onDelete(t)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--color-danger)', padding:2 }}><Trash2 size={12}/></button>
              </div>
            </div>
            {t.description && <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{t.description}</p>}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Flag size={10} style={{ color: PRIORITE_COLOR[t.priorite] }}/>
                <span style={{ fontSize:10, color: PRIORITE_COLOR[t.priorite], fontWeight:600 }}>{t.priorite}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {t.dateEcheance && <span style={{ fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}><Calendar size={9}/>{t.dateEcheance}</span>}
                {t.assigneeName && <Avatar name={t.assigneeName} size={20}/>}
              </div>
            </div>
            {/* Quick status change */}
            <div style={{ marginTop:10, display:'flex', gap:4, flexWrap:'wrap' }}>
              {STATUTS.filter(s=>s!==statut).map(s => (
                <button key={s} onClick={() => onChangeStatut(t, s)}
                  style={{ fontSize:9, padding:'2px 6px', borderRadius:4, border:`1px solid ${STATUT_CONFIG[s].color}60`, background:STATUT_CONFIG[s].bg, color:STATUT_CONFIG[s].color, cursor:'pointer', fontWeight:500 }}>
                  → {STATUT_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Taches() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const [view, setView] = useState('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projets, setProjets] = useState([]);
  const [employes, setEmployes] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tacheApi.getAll({ page:0, size:200 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    Promise.all([
      projetApi.getAll({ size:200 }),
      employerApi.getAll({ size:200 }),
    ]).then(([p,e]) => {
      const pd = p.data?.data||p.data; setProjets(Array.isArray(pd)?pd:pd?.content||[]);
      const ed = e.data?.data||e.data; setEmployes(Array.isArray(ed)?ed:ed?.content||[]);
    }).catch(()=>{});
  }, []);

  const filtered = data.filter(t =>
    (!search || t.titre?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterProjet || String(t.projetId) === String(filterProjet))
  );

  const byStatut = (s) => filtered.filter(t => t.statut === s);

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ titre:item.titre||'', description:item.description||'', statut:item.statut||'A_FAIRE', priorite:item.priorite||'NORMALE', dateEcheance:item.dateEcheance||'', assigneeId:item.assigneeId||'', projetId:item.projetId||'' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, assigneeId: form.assigneeId||null, projetId: form.projetId||null };
      if (editItem) await tacheApi.update(editItem.id, payload);
      else await tacheApi.create(payload);
      toast.success(editItem ? 'Tâche modifiée' : 'Tâche créée');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await tacheApi.delete(deleteItem.id); toast.success('Tâche supprimée'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur'); } finally { setDeleting(false); }
  };

  const handleChangeStatut = async (t, statut) => {
    try { await tacheApi.changeStatut(t.id, statut); toast.success('Statut mis à jour'); load(); }
    catch { toast.error('Erreur'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  return (
    <div>
      <PageHeader title="Tâches" subtitle={`${data.length} tâche${data.length!==1?'s':''} au total`}>
        <Button onClick={openCreate}><Plus size={16}/>Nouvelle tâche</Button>
      </PageHeader>

      {/* Summary stats */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {STATUTS.map(s => (
          <div key={s} style={{ padding:'6px 14px', background:'var(--bg-surface)', border:`1px solid ${STATUT_CONFIG[s].color}40`, borderRadius:'var(--radius-full)', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:STATUT_CONFIG[s].color }}/>
            <span style={{ fontSize:13, fontWeight:600, color:STATUT_CONFIG[s].color }}>{byStatut(s).length}</span>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{STATUT_CONFIG[s].label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une tâche..." style={{ flex:'1 1 240px', maxWidth:360 }}/>
        <select value={filterProjet} onChange={e=>setFilterProjet(e.target.value)}
          style={{ padding:'9px 14px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:14, cursor:'pointer' }}>
          <option value="">Tous les projets</option>
          {projets.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
        <div style={{ display:'flex', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
          {[['kanban','Kanban'],['list','Liste']].map(([k,l]) => (
            <button key={k} onClick={() => setView(k)} style={{ padding:'8px 16px', border:'none', background:view===k?'var(--color-primary)':'var(--bg-surface)', color:view===k?'#fff':'var(--text-muted)', cursor:'pointer', fontSize:13, fontWeight:500 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      {view === 'kanban' ? (
        <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:16, alignItems:'flex-start' }}>
          {STATUTS.map(s => (
            <KanbanColumn key={s} statut={s} tasks={byStatut(s)} onEdit={openEdit} onDelete={setDeleteItem} onChangeStatut={handleChangeStatut}/>
          ))}
        </div>
      ) : (
        <Card padding={0}>
          {filtered.length === 0 ? (
            <p style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>Aucune tâche trouvée</p>
          ) : filtered.map((t, i) => {
            const cfg = STATUT_CONFIG[t.statut] || STATUT_CONFIG.A_FAIRE;
            return (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:i<filtered.length-1?'1px solid var(--border-muted)':undefined }}>
                <div style={{ width:3, height:36, borderRadius:2, background:PRIORITE_COLOR[t.priorite]||'var(--border-default)', flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:600, fontSize:14, color:'var(--text-primary)' }}>{t.titre}</p>
                  {t.projetNom && <p style={{ fontSize:12, color:'var(--text-muted)' }}>{t.projetNom}</p>}
                </div>
                <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                {t.dateEcheance && <span style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}><Calendar size={12}/>{t.dateEcheance}</span>}
                {t.assigneeName && <Avatar name={t.assigneeName} size={28}/>}
                <div style={{ display:'flex', gap:6 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil size={14}/></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteItem(t)} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier la tâche' : 'Nouvelle tâche'} width={600}
        footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </div>}
      >
        <form onSubmit={handleSave}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Titre *" value={form.titre} onChange={set('titre')} placeholder="Titre de la tâche" required/>
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Description..."/>
            <FormRow>
              <Select label="Statut" value={form.statut} onChange={set('statut')} options={STATUTS.map(s=>({value:s,label:STATUT_CONFIG[s].label}))}/>
              <Select label="Priorité" value={form.priorite} onChange={set('priorite')} options={PRIORITES.map(p=>({value:p,label:p}))}/>
            </FormRow>
            <FormRow>
              <Select label="Projet" value={form.projetId} onChange={set('projetId')} options={projets.map(p=>({value:p.id,label:p.nom}))} placeholder="Sélectionner..."/>
              <Select label="Assigné à" value={form.assigneeId} onChange={set('assigneeId')} options={employes.map(e=>({value:e.id,label:e.name}))} placeholder="Sélectionner..."/>
            </FormRow>
            <Input label="Date d'échéance" type="date" value={form.dateEcheance} onChange={set('dateEcheance')}/>
          </div>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer la tâche"
        message={`Supprimer "${deleteItem?.titre}" ? Action irréversible.`} confirmLabel="Supprimer"/>
    </div>
  );
}// Exemple dans Taches.jsx
import { useRoleData } from '../hooks/useApi';
import { useAuth } from '../contexts/Authcontext';
import { tacheApi } from '../api';

export default function Taches() {
  const { user } = useAuth();

  const { data, loading, refetch } = useRoleData({
    user,
    // ADMIN/SUPER_ADMIN → toutes les tâches
    adminFn: (p) => tacheApi.getAll(p),
    // MANAGER → tâches de son département
    managerFn: (p) => tacheApi.getAll(p),
    // STAFF/STAGIAIRE → seulement ses tâches assignées
    selfFn: (p) => tacheApi.getByAssignee(p.employerId),
    params: { page: 0, size: 200 },
  });

  // ... reste du composant inchangé, `data` est déjà filtré
}

// Exemple dans Documents.jsx
const { data, loading, refetch } = useRoleData({
  user,
  adminFn: (p) => documentApi.getAll(p),
  managerFn: (p) => documentApi.getAll(p),
  // STAFF/STAGIAIRE → seulement ses propres documents
  selfFn: (p) => documentApi.getByEmployer(p.employerId),
  params: { page: 0, size: 100 },
});

// Exemple dans Factures.jsx
const { data, loading, refetch } = useRoleData({
  user,
  adminFn: (p) => factureApi.getAll(p),
  managerFn: (p) => factureApi.getAll({ ...p }),  // filtre dept côté API
  // STAFF/STAGIAIRE → factures où il est client/bénéficiaire
  selfFn: (p) => factureApi.getAll({ ...p, clientId: p.employerId }),
  params: { page: 0, size: 500 },
});