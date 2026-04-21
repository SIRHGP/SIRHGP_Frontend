// import { useState, useEffect } from 'react';
// import { Plus, Pencil, Trash2, DollarSign, Clock, CheckCircle, FileText, CreditCard } from 'lucide-react';
// import { factureApi, projetApi, employerApi } from '../api';
// import { PageHeader, Card, Table, Badge, Button, Modal, Input, Select, Confirm, SearchInput, StatCard, FormRow, Textarea } from '../components/ui';
// import toast from 'react-hot-toast';

// const STATUTS = ['BROUILLON','EN_ATTENTE','PAYEE','ANNULEE','EN_RETARD'];
// const STATUT_BADGE = {
//   BROUILLON:  { label:'Brouillon',   variant:'default' },
//   EN_ATTENTE: { label:'En attente',  variant:'warning' },
//   PAYEE:      { label:'Payée',       variant:'success' },
//   ANNULEE:    { label:'Annulée',     variant:'danger' },
//   EN_RETARD:  { label:'En retard',   variant:'danger' },
// };
// const TYPES = ['REGULIERE','AVOIR','PROFORMA'];
// const EMPTY = { titre:'', description:'', dateEmission:'', dateEcheance:'', montantHT:'', montantTVA:'', typeFacture:'REGULIERE', projetId:'', clientId:'', lignesFacture:[] };

// const fmt = (n) => n ? new Intl.NumberFormat('fr-CM', { style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(n) : '—';

// export default function Factures() {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const [filterStatut, setFilterStatut] = useState('');
//   const [modalOpen, setModalOpen] = useState(false);
//   const [paiementModal, setPaiementModal] = useState(null);
//   const [editItem, setEditItem] = useState(null);
//   const [deleteItem, setDeleteItem] = useState(null);
//   const [form, setForm] = useState(EMPTY);
//   const [montantPaiement, setMontantPaiement] = useState('');
//   const [saving, setSaving] = useState(false);
//   const [deleting, setDeleting] = useState(false);
//   const [projets, setProjets] = useState([]);
//   const [employes, setEmployes] = useState([]);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await factureApi.getAll({ page:0, size:100 });
//       const d = res.data?.data || res.data;
//       setData(Array.isArray(d) ? d : d?.content || []);
//     } catch { toast.error('Erreur chargement'); }
//     finally { setLoading(false); }
//   };

//   useEffect(() => { load(); }, []);
//   useEffect(() => {
//     Promise.all([projetApi.getAll({size:200}), employerApi.getAll({size:200})]).then(([p,e]) => {
//       const pd = p.data?.data||p.data; setProjets(Array.isArray(pd)?pd:pd?.content||[]);
//       const ed = e.data?.data||e.data; setEmployes(Array.isArray(ed)?ed:ed?.content||[]);
//     }).catch(()=>{});
//   }, []);

//   const filtered = data.filter(f =>
//     (!search || f.titre?.toLowerCase().includes(search.toLowerCase())) &&
//     (!filterStatut || f.statut === filterStatut)
//   );

//   const totalHT = filtered.reduce((s, f) => s + (f.montantHT || 0), 0);
//   const totalTTC = filtered.reduce((s, f) => s + (f.montantTTC || f.montantHT || 0), 0);
//   const totalPayees = filtered.filter(f=>f.statut==='PAYEE').reduce((s,f)=>s+(f.montantTTC||f.montantHT||0),0);

//   const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
//   const openEdit = (item) => {
//     setEditItem(item);
//     setForm({ titre:item.titre||'', description:item.description||'', dateEmission:item.dateEmission||'', dateEcheance:item.dateEcheance||'', montantHT:item.montantHT||'', montantTVA:item.montantTVA||'', typeFacture:item.typeFacture||'REGULIERE', projetId:item.projetId||'', clientId:item.clientId||'' });
//     setModalOpen(true);
//   };

//   const handleSave = async (e) => {
//     e.preventDefault(); setSaving(true);
//     try {
//       const payload = { ...form, montantHT:parseFloat(form.montantHT)||0, montantTVA:parseFloat(form.montantTVA)||0, projetId:form.projetId||null, clientId:form.clientId||null };
//       if (editItem) await factureApi.update(editItem.id, payload);
//       else await factureApi.create(payload);
//       toast.success(editItem ? 'Facture modifiée' : 'Facture créée');
//       setModalOpen(false); load();
//     } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
//     finally { setSaving(false); }
//   };

//   const handleDelete = async () => {
//     setDeleting(true);
//     try { await factureApi.delete(deleteItem.id); toast.success('Facture supprimée'); setDeleteItem(null); load(); }
//     catch { toast.error('Erreur'); } finally { setDeleting(false); }
//   };

//   const handleChangeStatut = async (f, statut) => {
//     try { await factureApi.changeStatut(f.id, statut); toast.success('Statut mis à jour'); load(); }
//     catch { toast.error('Erreur'); }
//   };

//   const handlePaiement = async () => {
//     try { await factureApi.paiement(paiementModal.id, parseFloat(montantPaiement)); toast.success('Paiement enregistré'); setPaiementModal(null); setMontantPaiement(''); load(); }
//     catch { toast.error('Erreur'); }
//   };

//   const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

//   const columns = [
//     { key:'titre', label:'Facture', render:(v,row) => (
//       <div>
//         <p style={{ fontWeight:600, fontSize:14 }}>{v}</p>
//         <p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.typeFacture}</p>
//       </div>
//     )},
//     { key:'projetNom', label:'Projet', render:v => v || '—' },
//     { key:'montantHT', label:'Montant HT', align:'right', render:v => <span style={{ fontFamily:'var(--font-mono)', fontSize:13 }}>{fmt(v)}</span> },
//     { key:'montantTTC', label:'TTC', align:'right', render:v => <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:600 }}>{fmt(v)}</span> },
//     { key:'dateEcheance', label:'Échéance', render:v => v || '—' },
//     { key:'statut', label:'Statut', render:v => <Badge variant={STATUT_BADGE[v]?.variant||'default'} dot>{STATUT_BADGE[v]?.label||v}</Badge> },
//     { key:'id', label:'', align:'right', render:(v,row) => (
//       <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
//         <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setPaiementModal(row);setMontantPaiement('');}} title="Enregistrer paiement" style={{color:'var(--color-success)'}}><CreditCard size={14}/></Button>
//         <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
//         <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{color:'var(--color-danger)'}}><Trash2 size={14}/></Button>
//       </div>
//     )},
//   ];

//   return (
//     <div>
//       <PageHeader title="Factures" subtitle="Suivi de la facturation">
//         <Button onClick={openCreate}><Plus size={16}/>Nouvelle facture</Button>
//       </PageHeader>

//       <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
//         <StatCard title="Total HT" value={fmt(totalHT)} icon={<FileText size={20}/>} color="var(--color-primary)"/>
//         <StatCard title="Total TTC" value={fmt(totalTTC)} icon={<DollarSign size={20}/>} color="var(--color-accent)"/>
//         <StatCard title="Encaissé" value={fmt(totalPayees)} icon={<CheckCircle size={20}/>} color="var(--color-success)"/>
//         <StatCard title="En attente" value={filtered.filter(f=>f.statut==='EN_ATTENTE').length} icon={<Clock size={20}/>} color="var(--color-warning)" subtitle="factures"/>
//       </div>

//       <Card padding={0}>
//         <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
//           <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une facture..." style={{ flex:'1 1 240px', maxWidth:360 }}/>
//           <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}
//             style={{ padding:'9px 14px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:14, cursor:'pointer' }}>
//             <option value="">Tous les statuts</option>
//             {STATUTS.map(s => <option key={s} value={s}>{STATUT_BADGE[s].label}</option>)}
//           </select>
//           <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} facture{filtered.length!==1?'s':''}</span>
//         </div>
//         <Table columns={columns} data={filtered} loading={loading} emptyText="Aucune facture trouvée"/>
//       </Card>

//       {/* Modal création/édition */}
//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier la facture' : 'Nouvelle facture'} width={640}
//         footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
//           <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
//           <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
//         </div>}
//       >
//         <form onSubmit={handleSave}>
//           <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
//             <Input label="Titre *" value={form.titre} onChange={set('titre')} required placeholder="Facture développement Q1"/>
//             <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Description..."/>
//             <FormRow>
//               <Select label="Type" value={form.typeFacture} onChange={set('typeFacture')} options={TYPES.map(t=>({value:t,label:t}))}/>
//               <Select label="Projet" value={form.projetId} onChange={set('projetId')} options={projets.map(p=>({value:p.id,label:p.nom}))} placeholder="Sélectionner..."/>
//             </FormRow>
//             <Select label="Client (Employé)" value={form.clientId} onChange={set('clientId')} options={employes.map(e=>({value:e.id,label:e.name}))} placeholder="Sélectionner..."/>
//             <FormRow>
//               <Input label="Date d'émission" type="date" value={form.dateEmission} onChange={set('dateEmission')}/>
//               <Input label="Date d'échéance" type="date" value={form.dateEcheance} onChange={set('dateEcheance')}/>
//             </FormRow>
//             <FormRow>
//               <Input label="Montant HT (XAF) *" type="number" value={form.montantHT} onChange={set('montantHT')} required placeholder="2500000"/>
//               <Input label="TVA (XAF)" type="number" value={form.montantTVA} onChange={set('montantTVA')} placeholder="487500"/>
//             </FormRow>
//           </div>
//         </form>
//       </Modal>

//       {/* Modal paiement */}
//       <Modal open={!!paiementModal} onClose={() => setPaiementModal(null)} title="Enregistrer un paiement" width={400}
//         footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
//           <Button variant="secondary" onClick={() => setPaiementModal(null)}>Annuler</Button>
//           <Button variant="success" onClick={handlePaiement}>Valider</Button>
//         </div>}
//       >
//         {paiementModal && (
//           <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
//             <div style={{ padding:'12px 14px', background:'var(--bg-muted)', borderRadius:'var(--radius-md)' }}>
//               <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{paiementModal.titre}</p>
//               <p style={{ fontSize:12, color:'var(--text-muted)' }}>Montant TTC : {fmt(paiementModal.montantTTC)}</p>
//             </div>
//             <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
//               {STATUTS.filter(s=>s!=='BROUILLON').map(s => (
//                 <button key={s} onClick={() => handleChangeStatut(paiementModal, s)}
//                   style={{ fontSize:12, padding:'6px 12px', borderRadius:'var(--radius-md)', border:`1px solid ${STATUT_BADGE[s]?.variant==='success'?'var(--color-success)':STATUT_BADGE[s]?.variant==='warning'?'var(--color-warning)':'var(--color-danger)'}`, background:'var(--bg-surface)', cursor:'pointer', fontWeight:500 }}>
//                   → {STATUT_BADGE[s].label}
//                 </button>
//               ))}
//             </div>
//             <Input label="Montant payé (XAF)" type="number" value={montantPaiement} onChange={e=>setMontantPaiement(e.target.value)} placeholder={paiementModal.montantTTC}/>
//           </div>
//         )}
//       </Modal>

//       <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
//         loading={deleting} title="Supprimer la facture"
//         message={`Supprimer la facture "${deleteItem?.titre}" ?`} confirmLabel="Supprimer"/>
//     </div>
//   );
// }


import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, DollarSign, Clock, CheckCircle, FileText,
  CreditCard, ChevronLeft, ChevronRight, Calendar, Building2,
  User, TrendingUp, AlertTriangle, Ban, BarChart2, Filter, ChevronDown
} from 'lucide-react';
import { factureApi, projetApi, employerApi, departementApi } from '../api';
import {
  PageHeader, Card, Table, Badge, Button, Modal, Input, Select,
  Confirm, SearchInput, FormRow, Textarea, Avatar
} from '../components/ui';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, isWithinInterval, parseISO,
  format, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears,
  eachMonthOfInterval, eachWeekOfInterval
} from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUTS = ['BROUILLON','EN_ATTENTE','PAYEE','PARTIELLEMENT_PAYEE','ANNULEE','EN_RETARD'];
const STATUT_META = {
  BROUILLON:          { label:'Brouillon',           color:'#94A3B8', variant:'default' },
  EN_ATTENTE:         { label:'En attente',          color:'#F59E0B', variant:'warning' },
  PAYEE:              { label:'Payée',               color:'#10B981', variant:'success' },
  PARTIELLEMENT_PAYEE:{ label:'Partiellement payée', color:'#6366F1', variant:'info'    },
  ANNULEE:            { label:'Annulée',             color:'#EF4444', variant:'danger'  },
  EN_RETARD:          { label:'En retard',           color:'#F97316', variant:'danger'  },
};

const TYPES = ['REGULIERE','AVOIR','PROFORMA'];
const TYPE_META = {
  REGULIERE:{ label:'Régulière',  color:'#6366F1' },
  AVOIR:    { label:'Avoir',      color:'#10B981' },
  PROFORMA: { label:'Proforma',   color:'#F59E0B' },
};

const CATEGORIES = ['SALAIRE','MISSION','DEPLACEMENT','CONFERENCE','FORMATION','SERVICE','AUTRE'];
const CAT_META = {
  SALAIRE:    { label:'Salaire',      color:'#6366F1', icon:User       },
  MISSION:    { label:'Mission',      color:'#8B5CF6', icon:FileText   },
  DEPLACEMENT:{ label:'Déplacement',  color:'#F59E0B', icon:ChevronRight },
  CONFERENCE: { label:'Conférence',   color:'#0EA5E9', icon:BarChart2  },
  FORMATION:  { label:'Formation',    color:'#10B981', icon:CheckCircle},
  SERVICE:    { label:'Service',      color:'#F97316', icon:CreditCard },
  AUTRE:      { label:'Autre',        color:'#94A3B8', icon:FileText   },
};

const PERIODS = [
  { key:'semaine', label:'Semaine' },
  { key:'mois',    label:'Mois'    },
  { key:'annee',   label:'Année'   },
];

const EMPTY = {
  titre:'', description:'', categorie:'SERVICE',
  dateEmission:'', dateEcheance:'',
  montantHT:'', montantTVA:'',
  typeFacture:'REGULIERE', statut:'BROUILLON',
  projetId:'', clientId:'', departementId:'',
  creePar:'',
  montantPaye: 0,
};

const fmt = (n) =>
  n !== undefined && n !== null
    ? new Intl.NumberFormat('fr-CM', { style:'currency', currency:'XAF', maximumFractionDigits:0 }).format(Number(n))
    : '—';

function pct(a, b) {
  if (!b) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}

// ── Period nav helper ────────────────────────────────────────────────────────
function getPeriodInterval(period, anchor) {
  if (period === 'semaine') return { start: startOfWeek(anchor, { weekStartsOn:1 }), end: endOfWeek(anchor, { weekStartsOn:1 }) };
  if (period === 'mois')    return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  return { start: startOfYear(anchor), end: endOfYear(anchor) };
}

function periodLabel(period, anchor) {
  if (period === 'semaine') {
    const s = startOfWeek(anchor, { weekStartsOn:1 });
    const e = endOfWeek(anchor,   { weekStartsOn:1 });
    return `${format(s,'d MMM',{locale:fr})} – ${format(e,'d MMM yyyy',{locale:fr})}`;
  }
  if (period === 'mois') return format(anchor, 'MMMM yyyy', { locale:fr });
  return format(anchor, 'yyyy');
}

function navigate(period, anchor, dir) {
  if (period === 'semaine') return dir > 0 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
  if (period === 'mois')    return dir > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  return dir > 0 ? addYears(anchor, 1) : subYears(anchor, 1);
}

// ── Stat card ────────────────────────────────────────────────────────────────
function Stat({ title, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      background:'var(--bg-surface)', borderRadius:'var(--radius-lg)',
      padding:'16px 18px', border:'1px solid var(--border-default)',
      display:'flex', alignItems:'flex-start', gap:14,
    }}>
      <div style={{ width:42, height:42, borderRadius:'var(--radius-md)', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={20} style={{ color }}/>
      </div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{title}</p>
        <p style={{ fontSize:18, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{value}</p>
        {sub && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color }) {
  return (
    <div style={{ height:4, borderRadius:2, background:'var(--border-muted)', overflow:'hidden', marginTop:4 }}>
      <div style={{ width:`${value}%`, height:'100%', background:color, borderRadius:2, transition:'width 0.4s ease' }}/>
    </div>
  );
}

// ── Invoice row card ─────────────────────────────────────────────────────────
function InvoiceRow({ f, employes, departements, onEdit, onDelete, onPaiement }) {
  const sm = STATUT_META[f.statut] || STATUT_META.BROUILLON;
  const tm = TYPE_META[f.typeFacture] || TYPE_META.REGULIERE;
  const cm = CAT_META[f.categorie] || CAT_META.AUTRE;
  const CatIcon = cm.icon;
  const createur = employes.find(e => e.id === f.creePar);
  const dept = departements.find(d => d.id === f.departementId);
  const ttc = f.montantTTC || (parseFloat(f.montantHT||0) + parseFloat(f.montantTVA||0));
  const payePct = pct(f.montantPaye || 0, ttc);

  return (
    <div style={{
      background:'var(--bg-surface)', borderRadius:'var(--radius-lg)',
      border:'1px solid var(--border-default)', borderLeft:`4px solid ${sm.color}`,
      padding:'14px 18px', transition:'box-shadow var(--transition-fast)',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow='var(--shadow-md)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
        {/* Cat icon */}
        <div style={{ width:38, height:38, borderRadius:'var(--radius-md)', background:`${cm.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <CatIcon size={16} style={{ color:cm.color }}/>
        </div>

        {/* Main info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
            <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{f.titre}</p>
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`${tm.color}18`, color:tm.color, fontWeight:700 }}>{tm.label}</span>
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:`${cm.color}18`, color:cm.color, fontWeight:700 }}>{cm.label}</span>
            <span style={{
              fontSize:10, padding:'2px 8px', borderRadius:4,
              background:`${sm.color}18`, color:sm.color, fontWeight:700,
              display:'flex', alignItems:'center', gap:4,
            }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:sm.color }}/>
              {sm.label}
            </span>
          </div>

          {f.description && <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>{f.description}</p>}

          {/* Meta row */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:11, color:'var(--text-muted)' }}>
            {f.dateEmission && <span style={{ display:'flex', alignItems:'center', gap:3 }}><Calendar size={11}/>Émis : {f.dateEmission}</span>}
            {f.dateEcheance && <span style={{ display:'flex', alignItems:'center', gap:3 }}><Clock size={11}/>Échéance : {f.dateEcheance}</span>}
            {dept && <span style={{ display:'flex', alignItems:'center', gap:3 }}><Building2 size={11}/>{dept.nom}</span>}
            {createur && (
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <Avatar name={createur.name} size={14}/>Créée par {createur.name}
              </span>
            )}
            {f.projetNom && <span style={{ display:'flex', alignItems:'center', gap:3 }}><FileText size={11}/>{f.projetNom}</span>}
          </div>
        </div>

        {/* Amounts */}
        <div style={{ textAlign:'right', flexShrink:0, minWidth:130 }}>
          <p style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--font-mono)' }}>{fmt(f.montantHT)}</p>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>HT</p>
          {/* Paiement progress */}
          {['PAYEE','PARTIELLEMENT_PAYEE'].includes(f.statut) && (
            <div style={{ marginTop:6 }}>
              <p style={{ fontSize:10, color:sm.color, fontWeight:700 }}>{fmt(f.montantPaye)} payé</p>
              <ProgressBar value={payePct} color={sm.color}/>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
          <Button variant="ghost" size="sm" onClick={() => onPaiement(f)} title="Paiement" style={{ color:'var(--color-success)' }}><CreditCard size={13}/></Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(f)}><Pencil size={13}/></Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(f)} style={{ color:'var(--color-danger)' }}><Trash2 size={13}/></Button>
        </div>
      </div>
    </div>
  );
}

// ── Breakdown bar (catégorie) ────────────────────────────────────────────────
function CategoryBreakdown({ data }) {
  const totals = {};
  data.forEach(f => {
    const cat = f.categorie || 'AUTRE';
    totals[cat] = (totals[cat] || 0) + (f.montantHT || 0);
  });
  const grand = Object.values(totals).reduce((a,b) => a+b, 0);
  if (!grand) return null;

  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-lg)', padding:'16px 20px', marginBottom:20 }}>
      <p style={{ fontWeight:700, fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Répartition par catégorie</p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([cat, total]) => {
          const m = CAT_META[cat] || CAT_META.AUTRE;
          const p = pct(total, grand);
          return (
            <div key={cat}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:600 }}>{m.label}</span>
                <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-primary)', fontWeight:700 }}>{fmt(total)} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>({p}%)</span></span>
              </div>
              <ProgressBar value={p} color={m.color}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Payment modal ────────────────────────────────────────────────────────────
function PaiementModal({ facture, open, onClose, onRefresh }) {
  const [statut, setStatut] = useState('');
  const [montant, setMontant] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (facture) { setStatut(facture.statut||''); setMontant(facture.montantPaye||''); setNote(''); } }, [facture]);

  if (!open || !facture) return null;
  const ttc = facture.montantTTC || (parseFloat(facture.montantHT||0) + parseFloat(facture.montantTVA||0));

  const handleSave = async () => {
    setSaving(true);
    try {
      await factureApi.paiement?.(facture.id, { statut, montantPaye: parseFloat(montant)||0, note }) ||
        factureApi.changeStatut?.(facture.id, statut);
      toast.success('Paiement mis à jour');
      onClose(); onRefresh();
    } catch (err) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Gestion du paiement" width={480}
      footer={
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>Enregistrer</Button>
        </div>
      }
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Facture recap */}
        <div style={{ padding:'12px 14px', background:'var(--bg-muted)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-muted)' }}>
          <p style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{facture.titre}</p>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>Montant HT : <b>{fmt(facture.montantHT)}</b></p>
        </div>

        {/* Statut buttons */}
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:8 }}>État du paiement</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {STATUTS.filter(s => s !== 'BROUILLON').map(s => {
              const m = STATUT_META[s];
              return (
                <div key={s} onClick={() => setStatut(s)}
                  style={{
                    padding:'10px 12px', borderRadius:'var(--radius-md)', cursor:'pointer',
                    border:`2px solid ${statut===s?m.color:'var(--border-default)'}`,
                    background: statut===s?`${m.color}10`:'var(--bg-muted)',
                    display:'flex', alignItems:'center', gap:8,
                    transition:'all var(--transition-fast)',
                  }}
                >
                  <span style={{ width:8, height:8, borderRadius:'50%', background:m.color, flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:600, color: statut===s?m.color:'var(--text-secondary)' }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Input label="Montant payé (XAF)" type="number" value={montant}
          onChange={e => setMontant(e.target.value)}
          placeholder={ttc}/>

        {montant && ttc ? (
          <div>
            <ProgressBar value={pct(parseFloat(montant), ttc)} color='#10B981'/>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{pct(parseFloat(montant), ttc)}% payé</p>
          </div>
        ) : null}

        <Textarea label="Note (optionnel)" value={note} onChange={e=>setNote(e.target.value)} placeholder="Mode de paiement, référence…" rows={2}/>
      </div>
    </Modal>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Factures() {
  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCat,  setFilterCat]  = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEmp,  setFilterEmp]  = useState('');

  // Period
  const [period,  setPeriod]  = useState('mois');
  const [anchor,  setAnchor]  = useState(new Date());

  // Modals
  const [modalOpen,    setModalOpen]    = useState(false);
  const [paiementDoc,  setPaiementDoc]  = useState(null);
  const [editItem,     setEditItem]     = useState(null);
  const [deleteItem,   setDeleteItem]   = useState(null);
  const [showFilters,  setShowFilters]  = useState(false);

  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [projets,      setProjets]      = useState([]);
  const [employes,     setEmployes]     = useState([]);
  const [departements, setDepartements] = useState([]);

  // ── Load ──
  const load = async () => {
    setLoading(true);
    try {
      const res = await factureApi.getAll({ page:0, size:500 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    Promise.all([
      projetApi.getAll({size:200}),
      employerApi.getAll({size:200}),
      departementApi?.getAll({size:200}).catch(() => ({ data:[] })),
    ]).then(([p,e,d]) => {
      const pd=p.data?.data||p.data; setProjets(Array.isArray(pd)?pd:pd?.content||[]);
      const ed=e.data?.data||e.data; setEmployes(Array.isArray(ed)?ed:ed?.content||[]);
      const dd=d.data?.data||d.data; setDepartements(Array.isArray(dd)?dd:dd?.content||[]);
    }).catch(()=>{});
  }, []);

  // ── Filtered by period + search/filters ──
  const { start, end } = useMemo(() => getPeriodInterval(period, anchor), [period, anchor]);

  const periodData = useMemo(() => data.filter(f => {
    const date = f.dateEmission || f.createdAt;
    if (!date) return false;
    try { return isWithinInterval(parseISO(date), { start, end }); }
    catch { return false; }
  }), [data, start, end]);

  const filtered = useMemo(() => periodData.filter(f =>
    (!search      || f.titre?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatut|| f.statut === filterStatut) &&
    (!filterCat   || f.categorie === filterCat) &&
    (!filterDept  || f.departementId === filterDept) &&
    (!filterEmp   || f.creePar === filterEmp || f.clientId === filterEmp)
  ), [periodData, search, filterStatut, filterCat, filterDept, filterEmp]);

  // ── Period totals ──
  const stats = useMemo(() => {
    const totalHT   = filtered.reduce((s,f) => s + (parseFloat(f.montantHT)||0), 0);
    const payee     = filtered.filter(f => f.statut === 'PAYEE').reduce((s,f) => s + (parseFloat(f.montantHT)||0), 0);
    const partielle = filtered.filter(f => f.statut === 'PARTIELLEMENT_PAYEE').reduce((s,f) => s + (parseFloat(f.montantPaye)||0), 0);
    const attente   = filtered.filter(f => ['EN_ATTENTE','BROUILLON'].includes(f.statut)).reduce((s,f) => s + (parseFloat(f.montantHT)||0), 0);
    const retard    = filtered.filter(f => f.statut === 'EN_RETARD').reduce((s,f) => s + (parseFloat(f.montantHT)||0), 0);
    return { totalHT, payee, partielle, attente, retard, count: filtered.length };
  }, [filtered]);

  // ── Trend (compare previous period) ──
  const prevInterval = useMemo(() => {
    const prev = navigate(period, anchor, -1);
    return getPeriodInterval(period, prev);
  }, [period, anchor]);

  const prevTotal = useMemo(() => data.filter(f => {
    const date = f.dateEmission || f.createdAt;
    if (!date) return false;
    try { return isWithinInterval(parseISO(date), prevInterval); } catch { return false; }
  }).reduce((s,f) => s + (parseFloat(f.montantHT)||0), 0), [data, prevInterval]);

  const trendPct = prevTotal ? Math.round(((stats.totalHT - prevTotal) / prevTotal) * 100) : null;

  // ── Helpers ──
  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit   = (item) => {
    setEditItem(item);
    setForm({
      titre:item.titre||'', description:item.description||'',
      categorie:item.categorie||'SERVICE',
      dateEmission:item.dateEmission||'', dateEcheance:item.dateEcheance||'',
      montantHT:item.montantHT||'', montantTVA:item.montantTVA||'',
      typeFacture:item.typeFacture||'REGULIERE', statut:item.statut||'BROUILLON',
      projetId:item.projetId||'', clientId:item.clientId||'',
      departementId:item.departementId||'', creePar:item.creePar||'',
      montantPaye:item.montantPaye||0,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        montantHT:  parseFloat(form.montantHT)||0,
        montantTVA: parseFloat(form.montantTVA)||0,
        projetId:      form.projetId||null,
        clientId:      form.clientId||null,
        departementId: form.departementId||null,
        creePar:       form.creePar||null,
      };
      if (editItem) await factureApi.update(editItem.id, payload);
      else          await factureApi.create(payload);
      toast.success(editItem ? 'Facture modifiée' : 'Facture créée');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await factureApi.delete(deleteItem.id); toast.success('Facture supprimée'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur'); } finally { setDeleting(false); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const activeFilters = [filterStatut, filterCat, filterDept, filterEmp].filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontWeight:800, fontSize:22, color:'var(--text-primary)' }}>Factures</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>Suivi de la facturation & dépenses</p>
        </div>
        <Button onClick={openCreate}><Plus size={16}/>Nouvelle facture</Button>
      </div>

      {/* Period selector + nav */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, marginBottom:20,
        padding:'12px 16px', background:'var(--bg-surface)',
        borderRadius:'var(--radius-lg)', border:'1px solid var(--border-default)',
        flexWrap:'wrap',
      }}>
        {/* Period toggle */}
        <div style={{ display:'flex', border:'1px solid var(--border-muted)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setAnchor(new Date()); }}
              style={{
                padding:'6px 14px', border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                background: period===p.key ? 'var(--color-primary)' : 'var(--bg-muted)',
                color: period===p.key ? '#fff' : 'var(--text-secondary)',
              }}>{p.label}</button>
          ))}
        </div>

        {/* Nav arrows */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setAnchor(a => navigate(period, a, -1))}
            style={{ width:30, height:30, borderRadius:'var(--radius-md)', border:'1px solid var(--border-default)', background:'var(--bg-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
            <ChevronLeft size={14}/>
          </button>
          <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', minWidth:160, textAlign:'center', textTransform:'capitalize' }}>
            {periodLabel(period, anchor)}
          </p>
          <button onClick={() => setAnchor(a => navigate(period, a, 1))}
            style={{ width:30, height:30, borderRadius:'var(--radius-md)', border:'1px solid var(--border-default)', background:'var(--bg-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)' }}>
            <ChevronRight size={14}/>
          </button>
          <button onClick={() => setAnchor(new Date())}
            style={{ padding:'5px 10px', fontSize:11, fontWeight:700, border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-muted)', cursor:'pointer', color:'var(--text-secondary)' }}>
            Aujourd'hui
          </button>
        </div>

        {trendPct !== null && (
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
            <TrendingUp size={14} style={{ color: trendPct >= 0 ? '#10B981' : '#EF4444' }}/>
            <span style={{ fontSize:12, fontWeight:700, color: trendPct >= 0 ? '#10B981' : '#EF4444' }}>
              {trendPct >= 0 ? '+' : ''}{trendPct}% vs période précédente
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        <Stat title="Total HT" value={fmt(stats.totalHT)} sub={`${stats.count} facture${stats.count!==1?'s':''}`} color="#6366F1" icon={FileText}/>
        <Stat title="Encaissé" value={fmt(stats.payee)} sub="Payé intégralement" color="#10B981" icon={CheckCircle}/>
        <Stat title="Partiel" value={fmt(stats.partielle)} sub="Partiellement payé" color="#6366F1" icon={CreditCard}/>
        <Stat title="En attente" value={fmt(stats.attente)} sub="À encaisser" color="#F59E0B" icon={Clock}/>
        <Stat title="En retard" value={fmt(stats.retard)} sub="Délai dépassé" color="#EF4444" icon={AlertTriangle}/>
      </div>

      {/* Category breakdown */}
      <CategoryBreakdown data={filtered}/>

      {/* Search + filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher…" style={{ flex:'1 1 200px', maxWidth:300 }}/>
        <button onClick={() => setShowFilters(f => !f)}
          style={{
            display:'flex', alignItems:'center', gap:6, padding:'7px 12px',
            borderRadius:'var(--radius-md)', border:'1px solid var(--border-default)',
            background: activeFilters > 0 ? 'var(--color-primary-light)' : 'var(--bg-surface)',
            color: activeFilters > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
            cursor:'pointer', fontSize:12, fontWeight:600,
          }}>
          <Filter size={13}/>Filtres
          {activeFilters > 0 && <span style={{ background:'var(--color-primary)', color:'#fff', borderRadius:'50%', width:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9 }}>{activeFilters}</span>}
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { setFilterStatut(''); setFilterCat(''); setFilterDept(''); setFilterEmp(''); }}
            style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            Réinitialiser
          </button>
        )}
        <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:'auto' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
      </div>

      {showFilters && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, padding:'14px 16px', marginBottom:16, background:'var(--bg-muted)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-muted)' }}>
          <Select label="Statut" value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}
            options={[{value:'',label:'Tous'},...STATUTS.map(s=>({value:s,label:STATUT_META[s].label}))]}/>
          <Select label="Catégorie" value={filterCat} onChange={e=>setFilterCat(e.target.value)}
            options={[{value:'',label:'Toutes'},...CATEGORIES.map(c=>({value:c,label:CAT_META[c].label}))]}/>
          <Select label="Département" value={filterDept} onChange={e=>setFilterDept(e.target.value)}
            options={[{value:'',label:'Tous'},...departements.map(d=>({value:d.id,label:d.nom}))]}/>
          <Select label="Créée par / Client" value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}
            options={[{value:'',label:'Tous'},...employes.map(e=>({value:e.id,label:e.name}))]}/>
        </div>
      )}

      {/* Invoice list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height:90, background:'var(--bg-surface)', borderRadius:'var(--radius-lg)', animation:'pulse 1.5s infinite', border:'1px solid var(--border-default)' }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 24px', background:'var(--bg-surface)', borderRadius:'var(--radius-xl)', border:'1px solid var(--border-default)' }}>
          <FileText size={48} style={{ color:'var(--text-muted)', margin:'0 auto 16px', display:'block' }}/>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Aucune facture sur cette période</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(f => (
            <InvoiceRow key={f.id} f={f}
              employes={employes} departements={departements}
              onEdit={openEdit}
              onDelete={setDeleteItem}
              onPaiement={doc => setPaiementDoc(doc)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Modifier la facture' : 'Nouvelle facture'} width={680}
        footer={
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        }
      >
        <form onSubmit={handleSave}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Titre *" value={form.titre} onChange={set('titre')} required placeholder="Titre de la facture"/>
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Détails…" rows={2}/>

            <FormRow>
              <Select label="Type" value={form.typeFacture} onChange={set('typeFacture')}
                options={TYPES.map(t=>({value:t,label:TYPE_META[t].label}))}/>
              <Select label="Catégorie *" value={form.categorie} onChange={set('categorie')}
                options={CATEGORIES.map(c=>({value:c,label:CAT_META[c].label}))}/>
            </FormRow>

            <FormRow>
              <Input label="Date d'émission" type="date" value={form.dateEmission} onChange={set('dateEmission')}/>
              <Input label="Date d'échéance" type="date" value={form.dateEcheance} onChange={set('dateEcheance')}/>
            </FormRow>

            <FormRow>
              <Input label="Montant HT (XAF) *" type="number" value={form.montantHT} onChange={set('montantHT')} required placeholder="0"/>
              <Input label="TVA (XAF)" type="number" value={form.montantTVA} onChange={set('montantTVA')} placeholder="0"/>
            </FormRow>

            {/* État paiement */}
            <Select label="État du paiement" value={form.statut} onChange={set('statut')}
              options={STATUTS.map(s=>({value:s,label:STATUT_META[s].label}))}/>

            <FormRow>
              <Select label="Projet" value={form.projetId} onChange={set('projetId')}
                options={[{value:'',label:'Aucun'},...projets.map(p=>({value:p.id,label:p.nom}))]}/>
              <Select label="Département" value={form.departementId} onChange={set('departementId')}
                options={[{value:'',label:'Aucun'},...departements.map(d=>({value:d.id,label:d.nom}))]}/>
            </FormRow>

            <FormRow>
              <Select label="Créée par" value={form.creePar} onChange={set('creePar')}
                options={[{value:'',label:'Sélectionner…'},...employes.map(e=>({value:e.id,label:e.name}))]}/>
              <Select label="Client / Bénéficiaire" value={form.clientId} onChange={set('clientId')}
                options={[{value:'',label:'Aucun'},...employes.map(e=>({value:e.id,label:e.name}))]}/>
            </FormRow>
          </div>
        </form>
      </Modal>

      {/* ── Payment modal ── */}
      <PaiementModal
        facture={paiementDoc}
        open={!!paiementDoc}
        onClose={() => setPaiementDoc(null)}
        onRefresh={load}
      />

      {/* ── Confirm delete ── */}
      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer la facture"
        message={`Supprimer "${deleteItem?.titre}" ?`} confirmLabel="Supprimer"/>
    </div>
  );
}