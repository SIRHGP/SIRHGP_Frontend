import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, Users, Briefcase } from 'lucide-react';
import { departementApi, posteApi } from '../api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Confirm, SearchInput } from '../components/ui';
import toast from 'react-hot-toast';

export default function Departements() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState({ name:'' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await departementApi.getAll({ page:0, size:100 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = data.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm({ name:'' }); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name || '' }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) await departementApi.update(editItem.id, form);
      else await departementApi.create(form);
      toast.success(editItem ? 'Département modifié' : 'Département créé');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await departementApi.delete(deleteItem.id); toast.success('Département supprimé'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur suppression'); } finally { setDeleting(false); }
  };

  const columns = [
    { key:'name', label:'Département', render:(v,row) => (
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:'var(--radius-md)', background:'var(--color-primary-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Building2 size={16} style={{ color:'var(--color-primary)' }}/>
        </div>
        <span style={{ fontWeight:600, fontSize:14 }}>{v}</span>
      </div>
    )},
    { key:'nombrePostes', label:'Postes', render:v => <Badge variant="primary" size="sm"><Briefcase size={10}/>&nbsp;{v??0}</Badge> },
    { key:'nombreEmployes', label:'Employés', render:v => <Badge variant="info" size="sm"><Users size={10}/>&nbsp;{v??0}</Badge> },
    { key:'id', label:'', align:'right', render:(v,row) => (
      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Départements" subtitle={`${data.length} département${data.length!==1?'s':''}`}>
        <Button onClick={openCreate}><Plus size={16}/>Nouveau département</Button>
      </PageHeader>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:24 }}>
        {data.slice(0,6).map(dept => (
          <Card key={dept.id} hover padding={16} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:'var(--radius-md)', background:'var(--color-primary-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Building2 size={18} style={{ color:'var(--color-primary)' }}/>
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dept.name}</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>{dept.nombrePostes??0} postes · {dept.nombreEmployes??0} emp.</p>
            </div>
          </Card>
        ))}
      </div>

      <Card padding={0}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)', display:'flex', gap:12, alignItems:'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un département..." style={{ flex:1, maxWidth:360 }}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </div>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun département"/>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le département' : 'Nouveau département'} width={440}
        footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </div>}
      >
        <form onSubmit={handleSave}>
          <Input label="Nom du département *" value={form.name} onChange={e=>setForm({name:e.target.value})} required placeholder="ex: Marketing & Communication"/>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer le département"
        message={`Supprimer "${deleteItem?.name}" ? Les postes associés seront détachés.`} confirmLabel="Supprimer"/>
    </div>
  );
}