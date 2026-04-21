import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Settings } from 'lucide-react';
import { actionApi } from '../../api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Confirm, SearchInput, Textarea } from '../../components/ui';
import toast from 'react-hot-toast';

const EMPTY = { name:'', description:'' };

export default function Actions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await actionApi.getAll({ page:0, size:100 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = data.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()));
  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ name:item.name||'', description:item.description||'' }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) await actionApi.update(editItem.id, form);
      else await actionApi.create(form);
      toast.success(editItem ? 'Action modifiée' : 'Action créée');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await actionApi.delete(deleteItem.id); toast.success('Action supprimée'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur'); } finally { setDeleting(false); }
  };

  const columns = [
    { key:'name', label:'Action', render:(v,row) => (
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:'var(--radius-md)', background:'var(--color-success-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Settings size={16} style={{ color:'var(--color-success)' }}/>
        </div>
        <div>
          <p style={{ fontWeight:700, fontSize:14, fontFamily:'var(--font-mono)' }}>{v}</p>
          {row.description && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.description}</p>}
        </div>
      </div>
    )},
    { key:'id', label:'', align:'right', render:(v,row) => (
      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Actions" subtitle={`${data.length} action${data.length!==1?'s':''} disponible${data.length!==1?'s':''}`}>
        <Button onClick={openCreate}><Plus size={16}/>Nouvelle action</Button>
      </PageHeader>
      <Card padding={0}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)', display:'flex', gap:12, alignItems:'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une action..." style={{ flex:1, maxWidth:360 }}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </div>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucune action"/>
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier l\'action' : 'Nouvelle action'} width={480}
        footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </div>}
      >
        <form onSubmit={handleSave}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Nom de l'action *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="ex: export_employees"/>
            <Textarea label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description de l'action..."/>
          </div>
        </form>
      </Modal>
      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer l'action"
        message={`Supprimer "${deleteItem?.name}" ?`} confirmLabel="Supprimer"/>
    </div>
  );
}