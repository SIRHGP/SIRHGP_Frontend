import { useState } from 'react';
import { useDeferredTask } from '../../hooks/useDeferredTask';
import { useNavigate } from 'react-router-dom';
import { SquarePlus, Pencil, Trash2, Building2, Users, Globe, Power, UserPlus, Folders, ListChecks, FileText, Coins, Activity, ShieldCheck, UserRound } from 'lucide-react';
import { entrepriseApi, authApi } from '../../Api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Textarea, Select, Confirm, SearchInput, StatsGrid, StatCard, IconBox, Flex, Empty } from '../../components/ui';
import { useAuth } from '../../contexts/Authcontext';
import toast from 'react-hot-toast';

import { STATUT_META, TYPE_META, TYPE_OPTIONS } from './entreprises.meta';

const EMPTY_FORM = { name:'', description:'', type:'PME', secteurActivite:'', adresse:'', ville:'', telephone:'', email:'', statut:'ACTIVE' };
const EMPTY_ADMIN = { name:'', email:'', motDePasse:'' };

export default function Entreprises() {
  const navigate = useNavigate();
  // l'appartenance à la plateforme, et les options SUPER_ADMIN ne doivent pas
  // dépendre de la hiérarchie.
  const { user } = useAuth();
  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);          // stats transverses Super Admin
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');   // filtre par type d'entreprise
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Création d'un admin par entreprise ──
  const [adminTarget, setAdminTarget] = useState(null);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN);
  const [adminSaving, setAdminSaving] = useState(false);

  // ── Liste des admins d'une entreprise ──
  const [adminsTarget, setAdminsTarget] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const load = async () => {
    try {
      const res = await entrepriseApi.getAll({ page:0, size:100 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
      if (isSuperAdmin) {
        try {
          const s = await entrepriseApi.getSuperAdminStats();
          setStats(s.data?.data || s.data || null);
        } catch { setStats(null); }
      }
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useDeferredTask(load, 'mount');

  const openAddAdmin = (item) => { setAdminTarget(item); setAdminForm(EMPTY_ADMIN); };
  const setAdminField = (k) => (e) => setAdminForm(f => ({ ...f, [k]: e.target.value }));

  const openAdmins = async (item) => {
    setAdminsTarget(item); setAdminsLoading(true); setAdmins([]);
    try {
      const res = await entrepriseApi.getAdmins(item.id);
      const d = res.data?.data || res.data;
      setAdmins(Array.isArray(d) ? d : []);
    } catch { setAdmins([]); }
    finally { setAdminsLoading(false); }
  };

  const handleToggleAdmin = async (admin) => {
    try {
      await entrepriseApi.toggleAdminStatut(adminsTarget.id, admin.id);
      toast.success(admin.actif ? 'Admin désactivé' : 'Admin réactivé');
      openAdmins(adminsTarget);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur changement de statut');
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault(); setAdminSaving(true);
    try {
      await authApi.register({
        name: adminForm.name,
        email: adminForm.email,
        motDePasse: adminForm.motDePasse,
        entrepriseId: adminTarget.id,
      });
      toast.success(`Admin créé pour ${adminTarget.name}`);
      setAdminTarget(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur création admin');
    } finally { setAdminSaving(false); }
  };

  const filtered = data.filter(e =>
    (!search || e.name?.toLowerCase().includes(search.toLowerCase()))
    && (!typeFilter || (e.type || 'AUTRE') === typeFilter)
  );

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e?.target?.value ?? e }));

  const openCreate = () => { setForm(EMPTY_FORM); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '', description: item.description || '',
      secteurActivite: item.secteurActivite || '', type: item.type || 'PME', adresse: item.adresse || '',
      ville: item.ville || '', telephone: item.telephone || '',
      email: item.email || '', statut: item.statut || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editItem) await entrepriseApi.update(editItem.id, form);
      else await entrepriseApi.create(form);
      toast.success(editItem ? 'Entreprise modifiée' : 'Entreprise créée');
      setModalOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await entrepriseApi.delete(deleteItem.id); toast.success('Entreprise supprimée'); setDeleteItem(null); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur suppression'); }
    finally { setDeleting(false); }
  };

  const handleToggleStatut = async (item) => {
    try { await entrepriseApi.toggleStatut(item.id); toast.success('Statut modifié'); load(); }
    catch { toast.error('Erreur changement de statut'); }
  };

  const columns = [
    { key:'name', label:'Entreprise', render:(v,row) => (
      <Flex align="center" gap={12}>
        <IconBox icon={<Building2 size={16}/>} color="var(--color-primary)" />
        <div style={{ minWidth:0 }}>
          <span style={{ fontWeight:600, fontSize:14 }}>{v}</span>
          <p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.secteurActivite || '—'}</p>
        </div>
      </Flex>
    )},
    { key:'ville', label:'Ville', render:v => v || '—' },
    { key:'type', label:'Type', render:v => {
        const t = TYPE_META[v || 'AUTRE'] || TYPE_META.AUTRE;
        return <Badge variant={t.variant} size="sm">{t.label}</Badge>;
    }},
    { key:'email', label:'Contact', render:v => v || '—' },
    { key:'nombreEmployes', label:'Employés', render:v => <Badge variant="info" size="sm"><Users size={10}/>&nbsp;{v??0}</Badge> },
    { key:'statut', label:'Statut', render:(v,row) => (
      <Flex align="center" gap={6}>
        <Badge variant={(STATUT_META[v] || STATUT_META.ACTIVE).variant} size="sm">{(STATUT_META[v] || STATUT_META.ACTIVE).label}</Badge>
        {isSuperAdmin && (
          <Button variant="ghost" size="sm" title="Activer / Suspendre"
            onClick={e=>{e.stopPropagation();handleToggleStatut(row);}} style={{ color:'var(--color-warning)' }}>
            <Power size={13}/>
          </Button>
        )}
      </Flex>
    )},
    { key:'id', label:'', align:'right', render:(v,row) => isSuperAdmin ? (
      <Flex gap={6} justify="flex-end" align="center">
        <Button variant="ghost" size="sm" title="Ajouter un admin" onClick={e=>{e.stopPropagation();openAddAdmin(row);}}><UserPlus size={14}/></Button>
        <Button variant="ghost" size="sm" title="Voir les admins" onClick={e=>{e.stopPropagation();openAdmins(row);}}><ShieldCheck size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();openEdit(row);}}><Pencil size={14}/></Button>
        <Button variant="ghost" size="sm" onClick={e=>{e.stopPropagation();setDeleteItem(row);}} style={{ color:'var(--color-danger)' }}><Trash2 size={14}/></Button>
      </Flex>
    ) : null},
  ];

  // Fusion des stats transverses par entreprise dans les lignes du tableau
  const enriched = stats?.parEntreprise ? filtered.map(e => {
    const s = stats.parEntreprise.find(x => x.entrepriseId === e.id);
    return s ? { ...e, nbProjets: s.nbProjets, nbTaches: s.nbTaches, nbFactures: s.nbFactures, montantFactures: s.montantFactures } : e;
  }) : filtered;

  return (
    <div>
      <PageHeader title="Entreprises" subtitle={isSuperAdmin ? 'Super Admin — vue transverse' : `${data.length} entreprise${data.length!==1?'s':''}`}>
        {isSuperAdmin && <Button onClick={openCreate}><SquarePlus size={16}/>Nouvelle entreprise</Button>}
      </PageHeader>

      {isSuperAdmin && (
        <Card padding={20} style={{ marginBottom:20 }}>
          <Flex align="center" gap={8} style={{ marginBottom:14 }}>
            <Activity size={16} style={{ color:'var(--color-primary)' }} />
            <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>🌐 Vue Super Admin — toutes entreprises</h3>
          </Flex>
          <StatsGrid cols={4}>
            <StatCard title="Total entreprises" value={stats?.totalEntreprises ?? '—'} icon={<Building2 size={20} />} color="var(--color-primary)" />
            <StatCard title="Total employés" value={stats?.totalEmployes ?? '—'} icon={<Users size={20} />} color="var(--color-info)" />
            <StatCard title="Total projets" value={stats?.totalProjets ?? '—'} icon={<Folders size={20} />} color="var(--color-success)" />
            <StatCard title="Total tâches" value={stats?.totalTaches ?? '—'} icon={<ListChecks size={20} />} color="var(--color-accent)" />
          </StatsGrid>
          <StatsGrid cols={3}>
            <StatCard title="Total factures" value={stats?.totalFactures ?? '—'} icon={<FileText size={20} />} color="var(--color-warning)" />
            <StatCard title="Montant facturé (TTC)" value={stats?.montantTotalFactures != null ? (+stats.montantTotalFactures).toLocaleString('fr-FR') + ' FCFA' : '—'} icon={<Coins size={20} />} color="var(--color-success)" />
            <StatCard title="Entreprises suspendues" value={stats?.entreprisesSuspendues ?? '—'} icon={<Power size={20} />} color="var(--color-danger)" />
          </StatsGrid>
        </Card>
      )}

      <StatsGrid cols={3}>
        <StatCard title="Total entreprises" value={loading ? '—' : data.length} icon={<Building2 size={22} />} color="var(--color-primary)" loading={loading} />
        <StatCard title="Entreprises actives" value={loading ? '—' : data.filter(e => e.statut === 'ACTIVE').length} icon={<Globe size={22} />} color="var(--color-success)" loading={loading} />
        <StatCard title="Total employés" value={loading ? '—' : data.reduce((acc,e) => acc + (e.nombreEmployes ?? 0), 0)} icon={<Users size={22} />} color="var(--color-info)" loading={loading} subtitle="Toutes entreprises confondues" />
      </StatsGrid>

      <Card padding={0}>
        <Flex style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)' }} gap={12} align="center">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une entreprise..." style={{ flex:1, maxWidth:360 }}/>
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width:200 }}
            options={[{ value:'', label:'Tous les types' }, ...TYPE_OPTIONS]}/>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>{filtered.length} résultat{filtered.length!==1?'s':''}</span>
        </Flex>
        <Table columns={columns} data={enriched} loading={loading} emptyText="Aucune entreprise"
          onRowClick={isSuperAdmin ? (row) => navigate(`/admin/entreprises/${row.id}`) : undefined}/>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'} width={520}
        footer={<Flex justify='flex-end' gap={10}>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
        </Flex>}
      >
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Nom de l'entreprise *" value={form.name} onChange={setField('name')} required placeholder="ex: SIRHGP SARL"/>
          <Textarea label="Description" value={form.description} onChange={setField('description')} rows={2}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Select label="Type d'entreprise" value={form.type} onChange={setField('type')} options={TYPE_OPTIONS}/>
            <Input label="Secteur d'activité" value={form.secteurActivite} onChange={setField('secteurActivite')} placeholder="ex: Informatique"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Input label="Ville" value={form.ville} onChange={setField('ville')} placeholder="ex: Yaoundé"/>
            <Input label="Adresse" value={form.adresse} onChange={setField('adresse')} placeholder="ex: Melen, rue 1.234"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Input label="Téléphone" value={form.telephone} onChange={setField('telephone')} placeholder="ex: +237 6XX XXX XXX"/>
            <Input label="Email" type="email" value={form.email} onChange={setField('email')} placeholder="ex: contact@sirhgp.cm"/>
          </div>
          {editItem && (
            <Select label="Statut" value={form.statut} onChange={setField('statut')}
              options={[{ value:'ACTIVE', label:'Active' }, { value:'SUSPENDUE', label:'Suspendue' }]}/>
          )}
        </form>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer l'entreprise"
        message={`Supprimer "${deleteItem?.name}" ? Impossible si des employés y sont rattachés (suspendez-la plutôt).`} confirmLabel="Supprimer"/>

      {/* Modal : créer un administrateur pour une entreprise */}
      <Modal open={!!adminTarget} onClose={() => setAdminTarget(null)}
        title={`Ajouter un admin — ${adminTarget?.name || ''}`} width={480}
        footer={<Flex justify='flex-end' gap={10}>
          <Button variant="secondary" onClick={() => setAdminTarget(null)}>Annuler</Button>
          <Button onClick={handleAddAdmin} loading={adminSaving}>Créer l'admin</Button>
        </Flex>}
      >
        <form onSubmit={handleAddAdmin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Nom complet *" value={adminForm.name} onChange={setAdminField('name')} required placeholder="ex: Marie Kamga"/>
          <Input label="Email *" type="email" value={adminForm.email} onChange={setAdminField('email')} required placeholder="admin@entreprise.cm"/>
          <Input label="Mot de passe *" type="password" value={adminForm.motDePasse} onChange={setAdminField('motDePasse')} required minLength={8} placeholder="8 caractères min."/>
        </form>
      </Modal>

      {/* Modal : gérer les admins d'une entreprise (Super Admin, 3.2) */}
      <Modal open={!!adminsTarget} onClose={() => setAdminsTarget(null)} width={560}
        title={`Admins — ${adminsTarget?.name || ''}`}
        footer={<Flex justify='flex-end' gap={10}>
          <Button variant="secondary" onClick={() => { setAdminsTarget(null); }}>Fermer</Button>
        </Flex>}
      >
        <Flex direction="column" gap={10}>
          <Badge variant="info" size="sm"><UserRound size={12}/>&nbsp;{admins.length} admin{admins.length !== 1 ? 's' : ''}</Badge>
          {adminsLoading ? (
            <Empty title="Chargement des admins..." />
          ) : admins.length === 0 ? (
            <Empty title="Aucun administrateur" description="Utilisez « Ajouter un admin »." />
          ) : (
            <Flex direction="column" gap={12}>
              {admins.map(a => (
                <Flex key={a.id} align="center" gap={12} style={{ padding:'12px 14px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-surface)' }}>
                  <IconBox icon={<Users size={16}/>} color={a.actif ? 'var(--color-primary)' : 'var(--color-muted)'} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{a.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{a.email}</div>
                  </div>
                  <Badge variant={a.actif ? 'success' : 'danger'} size="sm">{a.actif ? 'Actif' : 'Inactif'}</Badge>
                  <Button variant="ghost" size="sm"
                    onClick={() => handleToggleAdmin(a)} title={a.actif ? 'Désactiver cet admin' : 'Réactiver cet admin'}>
                    <Power size={14}/>
                  </Button>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>
      </Modal>
    </div>
  );
}
