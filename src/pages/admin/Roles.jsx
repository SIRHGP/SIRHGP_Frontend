import { useState, useEffect } from 'react';
import { SquarePlus, Pencil, Trash2, Shield, Zap } from 'lucide-react';
import { roleApi, permissionApi } from '../../Api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Confirm, SearchInput, StatsGrid, StatCard, IconBox, Flex } from '../../components/ui';
import { useAuth } from '../../contexts/Authcontext';
import toast from 'react-hot-toast';

const EMPTY = { name:'', description:'', permissionIds:[] };

export default function Roles() {
  const { user } = useAuth();
  const canManage = user?.roleName === 'SUPER_ADMIN';
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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch au montage ; `loading` démarre à true et les rechargements manuels réactivent le spinner
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
      <Flex align="center" gap={10}>
        <IconBox icon={<Shield size={16}/>} color="var(--color-info)" />
        <div>
          <p style={{ fontWeight:700, fontSize:14 }}>{v}</p>
          {row.description && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.description}</p>}
          {row.systematique && <Badge size="sm" variant="warning" style={{ marginTop:4 }}>Système verrouillé</Badge>}
        </div>
      </Flex>
    )},
    { key:'permissions', label:'Permissions', render:v => (
      <Flex gap={4} wrap style={{ maxWidth:400 }}>
        {(v||[]).slice(0,4).map(p => <Badge key={p.id} size="sm" variant="info">{p.name}</Badge>)}
        {(v||[]).length > 4 && <Badge size="sm" variant="default">+{(v||[]).length-4}</Badge>}
        {(v||[]).length === 0 && <span style={{ fontSize:12, color:'var(--text-muted)' }}>Aucune</span>}
      </Flex>
    )},
    { key:'id', label:'', align:'right', render:(v,row) => (
      canManage ? (
      <Flex gap={6} justify="flex-end">
        <Button variant="ghost" size="sm" disabled={!!row.systematique} title={row.systematique ? 'Rôle système verrouillé (5.9)' : 'Modifier'} onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" disabled={!!row.systematique} title={row.systematique ? 'Rôle système verrouillé (5.9)' : 'Supprimer'} onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </Flex>
      ) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>lecture seule</span>
    )},
  ];

  return (
    <div>
      <PageHeader title="Rôles" subtitle="Gestion des rôles et accès">
        {canManage && <Button onClick={openCreate}><SquarePlus size={16}/>Nouveau rôle</Button>}
      </PageHeader>

      {/* Statistiques */}
      <StatsGrid cols={3}>
        <StatCard title="Total rôles" value={loading ? '—' : data.length} icon={<Shield size={22} />} color="var(--color-primary)" loading={loading} />
        <StatCard title="Permissions disponibles" value={permissions.length} icon={<Zap size={22} />} color="var(--color-success)" />
        <StatCard title="Permissions moyennes / rôle" value={Math.round(data.reduce((acc,r) => acc + (r.permissions?.length || 0), 0) / (data.length || 1))} icon={<Zap size={22} />} color="var(--color-warning)" loading={loading} />
      </StatsGrid>

      <Card padding={0}>
        <Flex style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)' }} gap={12} align="center">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un rôle..." style={{ flex:1, maxWidth:360 }}/>
        </Flex>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun rôle"/>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le rôle' : 'Nouveau rôle'} width={600}
        footer={<Flex justify="flex-end" gap={10}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </Flex>}
      >
        <form onSubmit={handleSave}>
          <Flex direction="column" gap={14}>
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
          </Flex>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer le rôle"
        message={`Supprimer le rôle "${deleteItem?.name}" ?`} confirmLabel="Supprimer"/>
    </div>
  );
}