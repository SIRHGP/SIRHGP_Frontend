import { useState, useEffect } from 'react';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { SquarePlus, Pencil, Trash2, Briefcase, Building2, Users } from 'lucide-react';
import { posteApi, departementApi } from '../Api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Select, Confirm, SearchInput, FormRow, StatsGrid, StatCard, IconBox, Flex } from '../components/ui';
import toast from 'react-hot-toast';

const EMPTY = { name:'', description:'', departementId:'' };

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

  const load = async () => {
    try {
      const res = await posteApi.getAll({ page:0, size:100 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useDeferredTask(load, 'mount');
  useEffect(() => {
    departementApi.getAll({size:100}).then(d => {
      const dd=d.data?.data||d.data; setDepartements(Array.isArray(dd)?dd:dd?.content||[]);
    }).catch(()=>{});
  }, []);

  const filtered = data.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.departementName?.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setForm(EMPTY); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
        setForm({ name:item.name||'', description:item.description||'', departementId:item.departementId||'' });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
            const payload = { ...form, departementId:form.departementId||null };
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
      <Flex align="center" gap={12}>
        <IconBox icon={<Briefcase size={16}/>} color="var(--color-info)" />
        <div>
          <p style={{ fontWeight:600, fontSize:14 }}>{v}</p>
          {row.description && <p style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>{row.description}</p>}
        </div>
      </Flex>
    )},
        { key:'departementName', label:'Département', render:v => v ? <Flex align="center" gap={6}><Building2 size={12} style={{ color:'var(--text-muted)' }}/>{v}</Flex> : '—' },
        { key:'nombreEmployes', label:'Employés', render:v => <Badge variant="info" size="sm"><Users size={10}/>&nbsp;{v??0}</Badge> },
    { key:'id', label:'', align:'right', render:(v,row) => (
      <Flex gap={6} justify="flex-end">
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </Flex>
    )},
  ];

  return (
    <div>
      <PageHeader title="Postes" subtitle={`${data.length} poste${data.length!==1?'s':''}`}>
        <Button onClick={openCreate}><SquarePlus size={16}/>Nouveau poste</Button>
      </PageHeader>

      {/* Statistiques */}
      <StatsGrid cols={3}>
        <StatCard title="Total postes" value={loading ? '—' : data.length} icon={<Briefcase size={22} />} color="var(--color-primary)" loading={loading} />
        <StatCard title="Employés affectés" value={loading ? '—' : data.reduce((acc,p) => acc + (p.nombreEmployes ?? 0), 0)} icon={<Users size={22} />} color="var(--color-success)" loading={loading} subtitle="Tous postes confondus" />
        <StatCard title="Départements couverts" value={loading ? '—' : new Set(data.filter(p => p.departementName).map(p => p.departementName)).size} icon={<Building2 size={22} />} color="var(--color-info)" loading={loading} subtitle="Postes rattachés" />
      </StatsGrid>
    

      <Card padding={0}>
        <Flex style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)' }} gap={12} align="center">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un poste..." style={{ flex:1, maxWidth:360 }}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </Flex>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun poste trouvé"/>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le poste' : 'Nouveau poste'} width={520}
        footer={<Flex justify="flex-end" gap={10}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </Flex>}
      >
        <form onSubmit={handleSave}>
          <Flex direction="column" gap={14}>
            <Input label="Nom du poste *" value={form.name} onChange={set('name')} required placeholder="ex: Data Analyst"/>
            <Input label="Description" value={form.description} onChange={set('description')} placeholder="Description du poste"/>
            <FormRow>
              <Select label="Département" value={form.departementId} onChange={set('departementId')} options={departements.map(d=>({value:d.id,label:d.name}))} placeholder="Sélectionner..."/>
            </FormRow>
          </Flex>
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer le poste"
        message={`Supprimer "${deleteItem?.name}" ?`} confirmLabel="Supprimer"/>
    </div>
  );
}


