import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Briefcase, Building2 } from 'lucide-react';
import { posteApi, departementApi, roleApi, permissionApi } from '../api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Select, Confirm, SearchInput, FormRow } from '../components/ui';
import toast from 'react-hot-toast';

const EMPTY = { name:'', description:'', roleId:'', departementId:'' };

export default function Postes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [departements, setDepartements] = useState([]);
  const [roles, setRoles] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await posteApi.getAll({ page:0, size:100 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    Promise.all([departementApi.getAll({size:100}), roleApi.getAll({size:100})]).then(([d,r]) => {
      const dd=d.data?.data||d.data; setDepartements(Array.isArray(dd)?dd:dd?.content||[]);
      const rd=r.data?.data||r.data; setRoles(Array.isArray(rd)?rd:rd?.content||[]);
    }).catch(()=>{});
  }, []);

  const filtered = data.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.departementName?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name:item.name||'', description:item.description||'', roleId:item.roleId||'', departementId:item.departementId||'' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, roleId:form.roleId||null, departementId:form.departementId||null };
      if (editItem) await posteApi.update(editItem.id, payload);
      else await posteApi.create(payload);
      toast.success(editItem ? 'Poste modifié' : 'Poste créé');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await posteApi.delete(deleteItem.id); toast.success('Poste supprimé'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur'); } finally { setDeleting(false); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const columns = [
    { key:'name', label:'Poste', render:(v,row) => (
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:'var(--radius-md)', background:'var(--color-info-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Briefcase size={16} style={{ color:'var(--color-info)' }}/>
        </div>
        <div>
          <p style={{ fontWeight:600, fontSize:14 }}>{v}</p>
          {row.description && <p style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>{row.description}</p>}
        </div>
      </div>
    )},
    { key:'departementName', label:'Département', render:v => v ? <span style={{ display:'flex', alignItems:'center', gap:6 }}><Building2 size={12} style={{ color:'var(--text-muted)' }}/>{v}</span> : '—' },
    { key:'roleName', label:'Rôle associé', render:v => v ? <Badge variant="info" size="sm">{v}</Badge> : '—' },
    { key:'nombrePermissions', label:'Permissions', render:v => v !== undefined ? <Badge variant="default" size="sm">{v}</Badge> : '—' },
    { key:'id', label:'', align:'right', render:(v,row) => (
      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="Postes" subtitle={`${data.length} poste${data.length!==1?'s':''}`}>
        <Button onClick={openCreate}><Plus size={16}/>Nouveau poste</Button>
      </PageHeader>

      <Card padding={0}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)', display:'flex', gap:12, alignItems:'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un poste..." style={{ flex:1, maxWidth:360 }}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </div>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun poste trouvé"/>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le poste' : 'Nouveau poste'} width={520}
        footer={<div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </div>}
      >
        <form onSubmit={handleSave}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Nom du poste *" value={form.name} onChange={set('name')} required placeholder="ex: Data Analyst"/>
            <Input label="Description" value={form.description} onChange={set('description')} placeholder="Description du poste"/>
            <FormRow>
              <Select label="Département" value={form.departementId} onChange={set('departementId')} options={departements.map(d=>({value:d.id,label:d.name}))} placeholder="Sélectionner..."/>
              <Select label="Rôle par défaut" value={form.roleId} onChange={set('roleId')} options={roles.map(r=>({value:r.id,label:r.name}))} placeholder="Sélectionner..."/>
            </FormRow>
          </div>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer le poste"
        message={`Supprimer "${deleteItem?.name}" ?`} confirmLabel="Supprimer"/>
    </div>
  );
}