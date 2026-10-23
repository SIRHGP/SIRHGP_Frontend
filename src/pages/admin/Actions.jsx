import { useState } from 'react';
import { useDeferredTask } from '../../hooks/useDeferredTask';
import { SquarePlus, Pencil, Trash2, Settings, FileText } from 'lucide-react';
import { actionApi } from '../../Api';
import { PageHeader, Card, Table, Button, Modal, Input, Confirm, SearchInput, Textarea, StatsGrid, StatCard, IconBox, Flex } from '../../components/ui';
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
    try {
      const res = await actionApi.getAll({ page:0, size:100 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useDeferredTask(load, 'mount');

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
      <Flex align="center" gap={10}>
        <IconBox icon={<Settings size={16}/>} color="var(--color-success)" />
        <div>
          <p style={{ fontWeight:700, fontSize:14, fontFamily:'var(--font-mono)' }}>{v}</p>
          {row.description && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.description}</p>}
        </div>
      </Flex>
    )},
    { key:'id', label:'', align:'right', render:(v,row) => (
      <Flex gap={6} justify="flex-end">
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </Flex>
    )},
  ];

  return (
    <div>
      <PageHeader title="Actions" subtitle={`${data.length} action${data.length!==1?'s':''} disponible${data.length!==1?'s':''}`}>
        <Button onClick={openCreate}><SquarePlus size={16}/>Nouvelle action</Button>
      </PageHeader>

      {/* Statistiques */}
      <StatsGrid cols={2}>
        <StatCard title="Total actions" value={loading ? '—' : data.length} icon={<Settings size={22} />} color="var(--color-primary)" loading={loading} />
        <StatCard title="Actions avec description" value={loading ? '—' : data.filter(a => a.description).length} icon={<FileText size={22} />} color="var(--color-info)" loading={loading} subtitle="Documentées" />
      </StatsGrid>
      <Card padding={0}>
        <Flex style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)' }} gap={12} align="center">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une action..." style={{ flex:1, maxWidth:360 }}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </Flex>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucune action"/>
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier l\'action' : 'Nouvelle action'} width={480}
        footer={<Flex justify="flex-end" gap={10}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </Flex>}
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
