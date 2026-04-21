import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Shield, Zap } from 'lucide-react';
import { roleApi, permissionApi } from '../../api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Confirm, SearchInput, Textarea } from '../../components/ui';
import toast from 'react-hot-toast';

const EMPTY = { name:'', description:'', permissionIds:[] };

export default function Roles() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [permissions, setPermissions] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await roleApi.getAll({ page:0, size:100 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    permissionApi.getAll({size:200}).then(r => {
      const d=r.data?.data||r.data; setPermissions(Array.isArray(d)?d:d?.content||[]);
    }).catch(()=>{});
  }, []);

  const filtered = data.filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name:item.name||'', description:item.description||'', permissionIds: item.permissions?.map(p=>p.id)||[] });
    setModalOpen(true);
  };

  const togglePerm = (id) => setForm(f => ({
    ...f, permissionIds: f.permissionIds.includes(id) ? f.permissionIds.filter(x=>x!==id) : [...f.permissionIds, id]
  }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) await roleApi.update(editItem.id, form);
      else await roleApi.create(form);
      toast.success(editItem ? 'Rôle modifié' : 'Rôle créé');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await roleApi.delete(deleteItem.id); toast.success('Rôle supprimé'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur'); } finally { setDeleting(false); }
  };

  const columns = [
    { key:'name', label:'Rôle', render:(v,row) => (
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:'var(--radius-md)', background:'var(--color-info-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Shield size={16} style={{ color:'var(--color-info)' }}/>
        </div>
        <div>
          <p style={{ fontWeight:700, fontSize:14 }}>{v}</p>
          {row.description && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.description}</p>}
        </div>
      </div>
    )},
    { key:'permissions', label:'Permissions', render:v => (
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', maxWidth:400 }}>
        {(v||[]).slice(0,4).map(p => <Badge key={p.id} size="sm" variant="info">{p.name}</Badge>)}
        {(v||[]).length > 4 && <Badge size="sm" variant="default">+{(v||[]).length-4}</Badge>}
        {(v||[]).length === 0 && <span style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune</span>}
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
      <PageHeader title="Rôles" subtitle="Gestion des rôles et accès">
        <Button onClick={openCreate}><Plus size={16}/>Nouveau rôle</Button>
      </PageHeader>

      <Card padding={0}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)', display:'flex', gap:12, alignItems:'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un rôle..." style={{ flex:1, maxWidth:360 }}/>
        </div>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun rôle"/>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le rôle' : 'Nouveau rôle'} width={600}
        footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </div>}
      >
        <form onSubmit={handleSave}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Nom du rôle *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="ex: CHEF_PROJET"/>
            <Input label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description du rôle"/>
            {permissions.length > 0 && (
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:10 }}>Permissions ({form.permissionIds.length} sélectionnées)</p>
                <div style={{ border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', maxHeight:220, overflowY:'auto' }}>
                  {permissions.map(p => (
                    <label key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-muted)' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--bg-muted)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <input type="checkbox" checked={form.permissionIds.includes(p.id)} onChange={()=>togglePerm(p.id)} style={{ accentColor:'var(--color-primary)' }}/>
                      <div>
                        <p style={{ fontSize:13, fontWeight:500 }}>{p.name}</p>
                        {p.description && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{p.description}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer le rôle"
        message={`Supprimer le rôle "${deleteItem?.name}" ?`} confirmLabel="Supprimer"/>
    </div>
  );
}