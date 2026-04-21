import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, Calendar, TrendingUp, Clock, BarChart2, Grid, List, ChevronRight } from 'lucide-react';
import { projetApi, employerApi, departementApi } from '../Api';
import { PageHeader, Card, Badge, Button, Modal, Input, Select, Confirm, SearchInput, Avatar, StatCard, FormRow, Textarea } from '../components/ui';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const STATUTS = ['PLANIFIE','EN_COURS','EN_ATTENTE','TERMINE','ANNULE'];
const STATUT_BADGE = {
  PLANIFIE:   { label:'Planifié',    variant:'default', color:'#94A3B8' },
  EN_COURS:   { label:'En cours',    variant:'info',    color:'#3B82F6' },
  EN_ATTENTE: { label:'En attente',  variant:'warning', color:'#F59E0B' },
  TERMINE:    { label:'Terminé',     variant:'success', color:'#10B981' },
  ANNULE:     { label:'Annulé',      variant:'danger',  color:'#EF4444' },
  EN_RETARD:  { label:'En retard',   variant:'danger',  color:'#EF4444' },
};

const EMPTY = { nom:'', description:'', codeProjet:'', statut:'PLANIFIE', dateDebut:'', dateFinPrevue:'', budgetAlloue:'', chefProjetId:'', membresIds:[], departementIds:[] };

function ProgressBar({ value=0, color='var(--color-primary)' }) {
  return (
    <div style={{ height:6, background:'var(--bg-muted)', borderRadius:3, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${Math.min(100,value)}%`, background:color, borderRadius:3, transition:'width 0.4s ease' }}/>
    </div>
  );
}

function ProjetCard({ p, onEdit, onDelete }) {
  const st = STATUT_BADGE[p.statut] || STATUT_BADGE.PLANIFIE;
  const budget = p.budgetAlloue ? new Intl.NumberFormat('fr-CM', { style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(p.budgetAlloue) : '—';
  return (
    <Card hover style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <Badge variant={st.variant} size="sm" dot>{st.label}</Badge>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{p.codeProjet}</span>
          </div>
          <h3 style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'var(--font-display)' }}>{p.nom}</h3>
          {p.description && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.description}</p>}
        </div>
        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          <Button variant="ghost" size="sm" onClick={() => onEdit(p)}><Pencil size={14}/></Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(p)} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
        </div>
      </div>

      <div style={{ display:'flex', gap:12 }}>
        {p.dateDebut && <span style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><Calendar size={10}/>{p.dateDebut}</span>}
        {p.dateFinPrevue && <span style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><Clock size={10}/>→ {p.dateFinPrevue}</span>}
      </div>

      {p.progression !== undefined && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>Progression</span>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{p.progression ?? 0}%</span>
          </div>
          <ProgressBar value={p.progression ?? 0} color={st.color}/>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px solid var(--border-muted)' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <TrendingUp size={12} style={{ color:'var(--text-muted)' }}/>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{budget}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {p.chefProjetName && <Avatar name={p.chefProjetName} size={24}/>}
          {p.nombreMembres > 0 && <span style={{ fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:3 }}><Users size={10}/>{p.nombreMembres}</span>}
        </div>
      </div>
    </Card>
  );
}

export default function Projets() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [view, setView] = useState('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employes, setEmployes] = useState([]);
  const [stats, setStats] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [projRes, statsRes] = await Promise.allSettled([
        projetApi.getAll({ page:0, size:100 }),
        projetApi.getDashboardGlobal(),
      ]);
      if (projRes.status === 'fulfilled') {
        const d = projRes.value.data?.data || projRes.value.data;
        setData(Array.isArray(d) ? d : d?.content || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data || {});
      }
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    employerApi.getAll({ size:200 }).then(r => {
      const d = r.data?.data || r.data;
      setEmployes(Array.isArray(d) ? d : d?.content || []);
    }).catch(()=>{});
  }, []);

  const filtered = data.filter(p =>
    (!search || p.nom?.toLowerCase().includes(search.toLowerCase()) || p.codeProjet?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatut || p.statut === filterStatut)
  );

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ nom:item.nom||'', description:item.description||'', codeProjet:item.codeProjet||'', statut:item.statut||'PLANIFIE', dateDebut:item.dateDebut||'', dateFinPrevue:item.dateFinPrevue||'', budgetAlloue:item.budgetAlloue||'', chefProjetId:item.chefProjetId||'', membresIds:item.membresIds||[], departementIds:item.departementIds||[] });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, budgetAlloue: form.budgetAlloue ? parseFloat(form.budgetAlloue) : null, chefProjetId: form.chefProjetId || null };
      if (editItem) await projetApi.update(editItem.id, payload);
      else await projetApi.create(payload);
      toast.success(editItem ? 'Projet modifié' : 'Projet créé');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await projetApi.delete(deleteItem.id); toast.success('Projet supprimé'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur suppression'); }
    finally { setDeleting(false); }
  };

  const handleChangeStatut = async (p, statut) => {
    try { await projetApi.changeStatut(p.id, statut); toast.success('Statut mis à jour'); load(); }
    catch { toast.error('Erreur'); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const statCounts = STATUTS.map(s => ({ name: STATUT_BADGE[s].label, count: data.filter(p=>p.statut===s).length, color: STATUT_BADGE[s].color }));

  return (
    <div>
      <PageHeader title="Projets" subtitle={`${data.length} projet${data.length!==1?'s':''} au total`}>
        <Button onClick={openCreate}><Plus size={16}/>Nouveau projet</Button>
      </PageHeader>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'En cours', val:data.filter(p=>p.statut==='EN_COURS').length, color:'var(--color-primary)' },
          { label:'Planifiés', val:data.filter(p=>p.statut==='PLANIFIE').length, color:'var(--color-warning)' },
          { label:'Terminés', val:data.filter(p=>p.statut==='TERMINE').length, color:'var(--color-success)' },
          { label:'En retard', val:stats.projetsEnRetard??0, color:'var(--color-danger)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)', borderRadius:'var(--radius-lg)', padding:'16px 20px', border:'1px solid var(--border-default)', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:10, height:40, borderRadius:4, background:s.color, flexShrink:0 }}/>
            <div>
              <p style={{ fontSize:24, fontWeight:800, fontFamily:'var(--font-display)', color:'var(--text-primary)', lineHeight:1 }}>{s.val}</p>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & view toggle */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un projet..." style={{ flex:'1 1 240px', maxWidth:360 }}/>
        <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}
          style={{ padding:'9px 14px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:14, cursor:'pointer' }}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{STATUT_BADGE[s].label}</option>)}
        </select>
        <div style={{ display:'flex', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
          {[{key:'grid',icon:Grid},{key:'list',icon:List}].map(({key,icon:Icon}) => (
            <button key={key} onClick={() => setView(key)} style={{ padding:'8px 14px', border:'none', background:view===key?'var(--color-primary)':'var(--bg-surface)', color:view===key?'#fff':'var(--text-muted)', cursor:'pointer', display:'flex', alignItems:'center' }}><Icon size={16}/></button>
          ))}
        </div>
        <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:view==='grid'?'repeat(3,1fr)':'1fr', gap:16 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{ height:200, background:'var(--bg-surface)', borderRadius:'var(--radius-lg)', animation:'pulse 1.5s infinite', border:'1px solid var(--border-default)' }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign:'center', padding:'64px 24px' }}>
          <p style={{ color:'var(--text-muted)', fontSize:16 }}>Aucun projet trouvé</p>
        </Card>
      ) : view === 'grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {filtered.map(p => <ProjetCard key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteItem}/>)}
        </div>
      ) : (
        <Card padding={0}>
          {filtered.map((p, i) => {
            const st = STATUT_BADGE[p.statut] || STATUT_BADGE.PLANIFIE;
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', borderBottom: i<filtered.length-1?'1px solid var(--border-muted)':undefined }}>
                <div style={{ width:4, height:40, borderRadius:2, background:st.color, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontWeight:600, fontSize:14, color:'var(--text-primary)' }}>{p.nom}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{p.codeProjet}</span>
                  </div>
                  {p.description && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</p>}
                </div>
                <Badge variant={st.variant} size="sm">{st.label}</Badge>
                <span style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{p.dateFinPrevue || '—'}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={14}/></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteItem(p)} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le projet' : 'Nouveau projet'} width={680}
        footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </div>}
      >
        <form onSubmit={handleSave}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormRow>
              <Input label="Nom du projet *" value={form.nom} onChange={set('nom')} placeholder="Nom du projet" required/>
              <Input label="Code projet *" value={form.codeProjet} onChange={set('codeProjet')} placeholder="PROJ-001" required/>
            </FormRow>
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Description du projet..."/>
            <FormRow>
              <Select label="Statut" value={form.statut} onChange={set('statut')} options={STATUTS.map(s=>({value:s,label:STATUT_BADGE[s].label}))}/>
              <Input label="Budget alloué (XAF)" type="number" value={form.budgetAlloue} onChange={set('budgetAlloue')} placeholder="5000000"/>
            </FormRow>
            <FormRow>
              <Input label="Date de début" type="date" value={form.dateDebut} onChange={set('dateDebut')}/>
              <Input label="Date de fin prévue" type="date" value={form.dateFinPrevue} onChange={set('dateFinPrevue')}/>
            </FormRow>
            <Select label="Chef de projet" value={form.chefProjetId} onChange={set('chefProjetId')}
              options={employes.map(e=>({value:e.id,label:e.name}))} placeholder="Sélectionner le chef de projet"/>
          </div>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer le projet"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteItem?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"/>
    </div>
  );
}