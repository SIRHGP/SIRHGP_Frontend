import { useState, useEffect } from 'react';
import { Plus, UserCheck, UserX, Pencil, Trash2, Eye, Phone, Mail, MapPin } from 'lucide-react';
import { employerApi, posteApi, roleApi } from '../api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Select, Confirm, SearchInput, Avatar, StatCard, FormRow } from '../components/ui';
import toast from 'react-hot-toast';

const STATUT = { true: { label:'Actif', variant:'success' }, false: { label:'Inactif', variant:'danger' } };

const EMPTY_FORM = {
  name:'', email:'', motDePasse:'', dateNaiss:'', lieu:'', region:'', residence:'',
  numeroTelephone:'', dateEmbauche:'', posteId:'', roleId:'',
};

export default function Employes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postes, setPostes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState({ total:0, actifs:0, inactifs:0 });

  const load = async (p=0) => {
    setLoading(true);
    try {
      const res = await employerApi.getAll({ page: p, size: 20 });
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : d?.content || [];
      setData(list);
      setTotalPages(d?.totalPages || 1);
      setStats({ total: list.length, actifs: list.filter(e=>e.actif).length, inactifs: list.filter(e=>!e.actif).length });
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  useEffect(() => {
    Promise.all([posteApi.getAll({ size:100 }), roleApi.getAll({ size:100 })]).then(([p, r]) => {
      const pd = p.data?.data || p.data; setPostes(Array.isArray(pd) ? pd : pd?.content || []);
      const rd = r.data?.data || r.data; setRoles(Array.isArray(rd) ? rd : rd?.content || []);
    }).catch(() => {});
  }, []);

  const filtered = data.filter(e =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name||'', email: item.email||'', motDePasse:'', dateNaiss: item.dateNaiss||'', lieu: item.lieu||'', region: item.region||'', residence: item.residence||'', numeroTelephone: item.numeroTelephone||'', dateEmbauche: item.dateEmbauche||'', posteId: item.posteId||'', roleId: item.roleId||'' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) await employerApi.update(editItem.id, form);
      else await employerApi.create(form);
      toast.success(editItem ? 'Employé modifié' : 'Employé créé');
      setModalOpen(false); load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (item) => {
    try {
      await employerApi.toggleActif(item.id);
      toast.success(`Employé ${item.actif ? 'désactivé' : 'activé'}`);
      load(page);
    } catch { toast.error('Erreur'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await employerApi.delete(deleteItem.id); toast.success('Employé supprimé'); setDeleteItem(null); load(page); }
    catch { toast.error('Erreur suppression'); }
    finally { setDeleting(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const columns = [
    { key:'name', label:'Employé', render:(v,row) => (
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Avatar name={v||'?'} size={36}/>
        <div>
          <p style={{ fontWeight:600, fontSize:14 }}>{v}</p>
          <p style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><Mail size={10}/>{row.email}</p>
        </div>
      </div>
    )},
    { key:'posteName', label:'Poste', render:v => v || '—' },
    { key:'roleName', label:'Rôle', render:v => v ? <Badge variant="info" size="sm">{v}</Badge> : '—' },
    { key:'numeroTelephone', label:'Téléphone', render:v => v ? <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:13 }}><Phone size={12}/>{v}</span> : '—' },
    { key:'actif', label:'Statut', render:v => <Badge variant={STATUT[v]?.variant} dot>{STATUT[v]?.label || '—'}</Badge> },
    { key:'id', label:'', align:'right', render:(v,row) => (
      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleToggle(row); }} title={row.actif?'Désactiver':'Activer'}>
          {row.actif ? <UserX size={15}/> : <UserCheck size={15}/>}
        </Button>
        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openEdit(row); }}><Pencil size={15}/></Button>
        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setDeleteItem(row); }} style={{ color:'var(--color-danger)' }}><Trash2 size={15}/></Button>
      </div>
    )},
  ];

  const REGIONS = ['Centre','Littoral','Ouest','Nord-Ouest','Sud-Ouest','Adamaoua','Est','Nord','Extrême-Nord','Sud'];

  return (
    <div>
      <PageHeader title="Employés" subtitle="Gestion des ressources humaines">
        <Button onClick={openCreate}><Plus size={16}/>Nouvel employé</Button>
      </PageHeader>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <StatCard title="Total employés" value={stats.total} icon={<Eye size={20}/>} color="var(--color-primary)"/>
        <StatCard title="Actifs" value={stats.actifs} icon={<UserCheck size={20}/>} color="var(--color-success)"/>
        <StatCard title="Inactifs" value={stats.inactifs} icon={<UserX size={20}/>} color="var(--color-danger)"/>
      </div>

      <Card padding={0}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)', display:'flex', gap:12, alignItems:'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou email..." style={{ flex:1, maxWidth:360 }}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </div>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun employé trouvé"/>
        <div style={{ padding:'0 20px 8px' }}>
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'12px 0' }}>
              {Array.from({length:totalPages},(_,i)=>i).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ padding:'5px 10px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:p===page?'var(--color-primary)':'var(--bg-surface)', color:p===page?'#fff':'var(--text-secondary)', cursor:'pointer', fontSize:13 }}>{p+1}</button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal création/édition */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier l\'employé' : 'Nouvel employé'} width={640}
        footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </div>}
      >
        <form onSubmit={handleSave}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormRow>
              <Input label="Nom complet *" value={form.name} onChange={set('name')} placeholder="Jean Dupont" required/>
              <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="jean@sirhgp.cm" required/>
            </FormRow>
            {!editItem && <Input label="Mot de passe *" type="password" value={form.motDePasse} onChange={set('motDePasse')} required/>}
            <FormRow>
              <Input label="Téléphone" value={form.numeroTelephone} onChange={set('numeroTelephone')} placeholder="+237 6XX XXX XXX"/>
              <Input label="Date de naissance" type="date" value={form.dateNaiss} onChange={set('dateNaiss')}/>
            </FormRow>
            <FormRow>
              <Input label="Lieu de naissance" value={form.lieu} onChange={set('lieu')} placeholder="Yaoundé"/>
              <Select label="Région" value={form.region} onChange={set('region')} options={REGIONS.map(r=>({value:r,label:r}))} placeholder="Sélectionner..."/>
            </FormRow>
            <FormRow>
              <Input label="Résidence" value={form.residence} onChange={set('residence')} placeholder="Bastos"/>
              <Input label="Date d'embauche" type="date" value={form.dateEmbauche} onChange={set('dateEmbauche')}/>
            </FormRow>
            <FormRow>
              <Select label="Poste" value={form.posteId} onChange={set('posteId')} options={postes.map(p=>({value:p.id,label:p.name}))} placeholder="Sélectionner..."/>
              <Select label="Rôle" value={form.roleId} onChange={set('roleId')} options={roles.map(r=>({value:r.id,label:r.name}))} placeholder="Sélectionner..."/>
            </FormRow>
          </div>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer l'employé"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteItem?.name} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"/>
    </div>
  );
}