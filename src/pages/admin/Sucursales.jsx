// pages/admin/Sucursales.jsx — Gestion des sucursales (3.4, établissements secondaires)
import { useState, useEffect } from 'react';
import { SquarePlus, Pencil, Trash2, Building2, Power, MapPin, Users } from 'lucide-react';
import { sucursalApi, entrepriseApi, employerApi } from '../../Api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Select, Confirm, SearchInput, Flex, SectionTitle, Empty, Alert } from '../../components/ui';
import { useAuth } from '../../contexts/Authcontext';
import { useDeferredTask } from '../../hooks/useDeferredTask';
import toast from 'react-hot-toast';

const STATUT_META = { ACTIVE: { label:'Active', variant:'success' }, SUSPENDUE: { label:'Suspendue', variant:'danger' } };
const EMPTY_FORM = { name:'', ville:'', adresse:'', telephone:'', statut:'ACTIVE', managerId:'' };

export default function Sucursales() {
  const { user } = useAuth();
  // Multi-tenant : seul le SUPER_ADMIN choisit l'entreprise ; un ADMIN est limité à la sienne.
  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';
  const canManage = user?.roleName === 'ADMIN';
  const myEntrepriseId = user?.entrepriseId ? String(user.entrepriseId) : '';
  const myEntrepriseNom = user?.entrepriseNom || '';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entreprisesAdmin, setEntreprisesAdmin] = useState([]);
  const entreprises = isSuperAdmin ? entreprisesAdmin : user?.entrepriseId
    ? [{ id: user.entrepriseId, name: myEntrepriseNom || `Entreprise #${user.entrepriseId}` }]
    : [];
  const [entrepriseId, setEntrepriseId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formEntrepriseId, setFormEntrepriseId] = useState('');
  // Candidats au rôle de manager : employés actifs de l'entreprise (garde-fous revérifiés côté serveur).
  const [candidates, setCandidates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await sucursalApi.getAll(entrepriseId ? { entrepriseId } : {});
      const d = res.data?.data || res.data;
      setRows(Array.isArray(d) ? d : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    entrepriseApi.getAll({ page:0, size:200 }).then(r => {
      const d = r.data?.data || r.data;
      setEntreprisesAdmin(Array.isArray(d) ? d : d?.content || []);
    }).catch(() => setEntreprisesAdmin([]));
  }, [isSuperAdmin]);
  useDeferredTask(load, `${entrepriseId}:${isSuperAdmin}`);

  const filtered = rows.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
      || (s.ville || '')?.toLowerCase().includes(search.toLowerCase()));

  // Chargé paresseusement à l'ouverture du modal (ADMIN seul, seul à pouvoir affecter un manager).
  const loadCandidates = async () => {
    if (candidates.length) return;
    try {
      const res = await employerApi.managers();
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : d?.content || [];
      setCandidates(list.filter(e => e.actif && e.roleName === 'MANAGER'));
    } catch { setCandidates([]); }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM); setEditItem(null);
    setFormEntrepriseId(isSuperAdmin ? entrepriseId : myEntrepriseId);
    if (canManage) loadCandidates();
    setModalOpen(true);
  };
  const openEdit = (it) => { setEditItem(it); setForm({ name:it.name||'', ville:it.ville||'', adresse:it.adresse||'', telephone:it.telephone||'', statut:it.statut||'ACTIVE', managerId: it.managerId ? String(it.managerId) : '' }); if (canManage) loadCandidates(); setModalOpen(true); };
  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e?.target?.value ?? e }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      // managerId n'est pas porté par le DTO create/update : il passe par PATCH /{id}/manager
      // (mêmes garde-fous serveur : même entreprise, compte actif, jamais SUPER_ADMIN).
      const { managerId, ...payload } = form;
      if (editItem) {
        await sucursalApi.update(editItem.id, payload);
        const current = editItem.managerId ? String(editItem.managerId) : '';
        if (managerId !== current) await sucursalApi.assignManager(editItem.id, managerId || null);
        toast.success('Sucursal modifiée');
      } else {
        const eid = formEntrepriseId || entrepriseId;
        if (!eid) throw new Error("Sélectionnez l'entreprise de la sucursal");
        const res = await sucursalApi.create(eid, payload);
        const created = res.data?.data || res.data;
        if (managerId && created?.id) await sucursalApi.assignManager(created.id, managerId);
        toast.success('Sucursal créée');
      }
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur enregistrement'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (row) => {
    try { await sucursalApi.toggleStatut(row.id); toast.success('Statut modifié'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur statut'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await sucursalApi.delete(deleteItem.id);
      toast.success('Sucursal supprimée'); setDeleteItem(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur suppression'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key:'name', label:'Sucursal', render:(v,row) => (
      <Flex align="center" gap={10}>
        <Badge variant="primary" size="sm"><Building2 size={12}/></Badge>
        <div>
          <div style={{ fontWeight:600 }}>{v}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>{row.entrepriseNom || ''}</div>
        </div>
      </Flex>
    )},
    { key:'ville', label:'Ville', render:v => v || '—' },
    { key:'adresse', label:'Adresse', render:v => v || '—' },
    { key:'telephone', label:'Téléphone', render:v => v || '—' },
    { key:'managerNom', label:'Manager', render:v => v ? <Flex align="center" gap={6}><Users size={13} style={{ color:'var(--text-muted)' }}/><span style={{ fontWeight:500 }}>{v}</span></Flex> : <span style={{ color:'var(--text-muted)' }}>—</span> },
    { key:'nombreEmployes', label:'Employés', render:v => v ?? '—' },
    { key:'statut', label:'Statut', render:(v) => { const m = STATUT_META[v] || STATUT_META.ACTIVE; return <Badge variant={m.variant}>{m.label}</Badge>; } },
    { key:'id', label:'', align:'right', render:(v,row) => (
      canManage ? (
      <Flex gap={6} justify="flex-end">
        <Button variant="ghost" size="sm" onClick={() => handleToggle(row)} title="Activer/Désactiver"><Power size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={() => setDeleteItem(row)} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </Flex>
      ) : <span style={{ fontSize:12, color:'var(--text-muted)' }}>lecture seule</span>
    )},
  ];

  return (
    <div>
      <PageHeader title="Sucursales" subtitle="Établissements secondaires des entreprises (régime OHADA)"
        breadcrumbs={['Administration', 'Entreprises', 'Sucursales']}>
        {canManage && <Button onClick={openCreate} leftIcon={<SquarePlus size={16}/>}>Nouvelle sucursal</Button>}
      </PageHeader>

      <Card padding={24}>
        <SectionTitle>Sucursales</SectionTitle>
        <Flex gap={10} wrap>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une sucursal..." style={{ flex:1, maxWidth:340 }}/>
          {isSuperAdmin && (
            <Select value={entrepriseId} onChange={e => setEntrepriseId(e.target.value)} placeholder="Toutes les entreprises"
              options={entreprises.map(en => ({ value:String(en.id), label:en.name }))} style={{ width:220 }}/>
          )}
        </Flex>
        {!isSuperAdmin && (
          <Alert variant="info" title={myEntrepriseNom ? `Périmètre : ${myEntrepriseNom}` : 'Entreprise non rattachée'}>
            {myEntrepriseNom
              ? 'Vous ne voyez et ne gérez que les sucursales de votre entreprise.'
              : "Votre compte n'est rattaché à aucune entreprise : contactez le Super Admin."}
          </Alert>
        )}
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucune sucursal"/>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier la sucursal' : 'Nouvelle sucursal'} width={500}
        footer={<Flex justify="flex-end" gap={10}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </Flex>}>
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {!editItem && isSuperAdmin && (
            <Select label="Entreprise *" value={formEntrepriseId} onChange={e => setFormEntrepriseId(e.target.value)}
              placeholder="Sélectionner l'entreprise..."
              options={entreprises.map(en => ({ value:String(en.id), label:en.name }))}/>
          )}
          {!editItem && !isSuperAdmin && (
            <Input label="Entreprise" value={myEntrepriseNom || `Entreprise #${myEntrepriseId || '—'}`} disabled readOnly/>
          )}
          <Input label="Nom de la sucursal *" value={form.name} onChange={setField('name')} required placeholder="ex: Agence Douala"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Ville" value={form.ville} onChange={setField('ville')} placeholder="ex: Douala"/>
            <Input label="Téléphone" value={form.telephone} onChange={setField('telephone')} placeholder="ex: +237 6XX XX XX XX"/>
          </div>
          <Input label="Adresse" value={form.adresse} onChange={setField('adresse')} placeholder="ex: Akwa, rue 2.345"/>
          <Select label="Manager de la succursale" value={form.managerId} onChange={setField('managerId')}
            placeholder="(Aucun manager affecté)"
            options={[{ value:'', label:'(Aucun)' },
              ...candidates.map(c => ({ value:String(c.id), label:`${c.name}${c.roleName ? ' · ' + c.roleName : ''}${c.posteName ? ' · ' + c.posteName : ''}` }))]}/>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:-6 }}>
            Compte actif de votre entreprise. Un manager affecté ici est limitativement restreint aux données de cette succursale.
          </div>
          {editItem && (
            <Select label="Statut" value={form.statut} onChange={setField('statut')}
              options={[{ value:'ACTIVE', label:'Active' }, { value:'SUSPENDUE', label:'Suspendue' }]}/>
          )}
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={deleting}
        title="Supprimer la sucursal"
        message={`Supprimer "${deleteItem?.name}" ? Impossible si des employés y sont rattachés (suspendez-la plutôt).`}
        confirmLabel="Supprimer"/>
    </div>
  );
}
