// pages/Departements.jsx — Départements & postes & organigramme
// département (rôle LEAD SEUL — correction 30/09 — employés actifs de l'entreprise ET de
// la succursale de l'appelant) + recherche nom/description.
// la page autonome /admin/sucursales reste la console SUPER_ADMIN multi-entreprises.
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SquarePlus, Pencil, Trash2, Building2, Users, Briefcase, Network, MapPin, Power } from 'lucide-react';
import { departementApi, posteApi, employerApi, sucursalApi, fetchAllPages } from '../Api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Select, Textarea, Confirm, SearchInput, IconBox, Flex, Tabs, Empty, Alert, StatsGrid, StatCard } from '../components/ui';
import OrgTree from '../components/org/OrgTree';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/Authcontext';

const STATUT_SUCURSAL = { ACTIVE: { label:'Active', variant:'success' }, SUSPENDUE: { label:'Suspendue', variant:'danger' } };

export default function Departements() {
  const { user } = useAuth();
  const peutCreerStructure = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.roleName);
  const peutModifierStructure = ['SUPER_ADMIN', 'ADMIN'].includes(user?.roleName);
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Onglet synchronisé avec l'URL (?tab=postes / ?tab=organigramme) — permet les redirections depuis /postes et /organigramme
  const tab = ['departements', 'postes', 'organigramme', 'sucursales'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'departements';
  const setTab = (t) => setSearchParams(t === 'departements' ? {} : { tab: t }, { replace: true });
  // Le chargement démarre à `true` : évite un setState synchrone « qui change l'état » dans l'effet (règle react-hooks/set-state-in-effect).
  const [postes, setPostes] = useState([]);
  const [postesLoading, setPostesLoading] = useState(true);
  const [filtreDept, setFiltreDept] = useState('');
  const [orgEmployes, setOrgEmployes] = useState([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', superviseurId: '' });
  // Chefs de département potentiels : employés ACTIFS de rôle LEAD **seul** (correction
  // 30/09 — l'ADMIN n'est plus proposé), déjà filtrés entreprise + succursale par le
  // backend via GET /employers/leads (endpoint dédié non paginé → aucune troncature à 100
  // comme avec getAll({ size: 200 })).
  const [leads, setLeads] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [posteModal, setPosteModal] = useState(false);
  const [editPoste, setEditPoste] = useState(null);
  const [deletePoste, setDeletePoste] = useState(null);
  const [posteForm, setPosteForm] = useState({ name:'', description:'', roleId:'', departementId:'' });
  const [posteSaving, setPosteSaving] = useState(false);
  // Stats des postes — COUNT SQL côté serveur (/postes/stats) ; la page n'affiche que les valeurs
  const [stats, setStats] = useState({ total:0, rattaches:0, sansDepartement:0 });
  const myEntrepriseId = user?.entrepriseId ? String(user.entrepriseId) : '';
  const myEntrepriseNom = user?.entrepriseNom || '';
  const [sucursales, setSucursales] = useState([]);
  const [sucLoading, setSucLoading] = useState(true);
  // Candidats manager : employés actifs (garde-fous revérifiés côté serveur via PATCH /{id}/manager).
  const [sucCandidates, setSucCandidates] = useState([]);
  const [sucModal, setSucModal] = useState(false);
  const [editSuc, setEditSuc] = useState(null);
  const [deleteSuc, setDeleteSuc] = useState(null);
  const [sucForm, setSucForm] = useState({ name:'', ville:'', adresse:'', telephone:'', statut:'ACTIVE', managerId:'' });
  const [sucSaving, setSucSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [departements, leadsRes] = await Promise.all([
        fetchAllPages(departementApi.getAll, 100),
        employerApi.leads().catch(() => null),
      ]);
      setData(departements);
      const l = leadsRes?.data?.data ?? leadsRes?.data;
      setLeads(Array.isArray(l) ? l : l?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };
  const loadPostes = async () => {
    setPostesLoading(true);
    try {
      const allPostes = await fetchAllPages(posteApi.getAll, 200);
      setPostes(allPostes);
    } catch { setPostes([]); }
    finally { setPostesLoading(false); }
  };
  const loadStats = async () => {
    try {
      const res = await posteApi.stats();
      const d = res.data?.data || res.data;
      if (d) setStats({ total: d.total ?? 0, rattaches: d.rattaches ?? 0, sansDepartement: d.sansDepartement ?? 0 });
    } catch { /* garde les valeurs précédentes */ }
  };
  const loadOrg = async () => {
    setOrgLoading(true);
    try {
      const res = await employerApi.organigramme();
      const d = res.data?.data || res.data;
      setOrgEmployes(Array.isArray(d) ? d : d?.content || []);
    } catch { setOrgEmployes([]); }
    finally { setOrgLoading(false); }
  };
  const loadSucursales = async () => {
    setSucLoading(true);
    try {
      // ADMIN : le serveur scope automatiquement sur l'entreprise de l'appelant.
      const res = await sucursalApi.getAll();
      const d = res.data?.data || res.data;
      setSucursales(Array.isArray(d) ? d : d?.content || []);
    } catch { setSucursales([]); }
    finally { setSucLoading(false); }
  };
  const loadSucCandidates = async () => {
    if (user?.roleName !== 'ADMIN') { setSucCandidates([]); return; }
    try {
      const res = await employerApi.managers();
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : d?.content || [];
      setSucCandidates(list.filter(e => e.actif && e.roleName === 'MANAGER'));
    } catch { setSucCandidates([]); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- pattern identique à Audit.jsx (chargement initial de plusieurs ressources)
  useEffect(() => { load(); loadPostes(); loadOrg(); loadStats(); loadSucursales(); loadSucCandidates(); }, []);

  // Recherche insensible à la casse et aux accents (nom + description).
  const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = data.filter(d =>
    !search || norm(d.name).includes(norm(search)) || norm(d.description).includes(norm(search))
  );
  const totalPostes = data.reduce((acc,d)=>acc+(d.nombrePostes??0),0);
  const totalEmployes = data.reduce((acc,d)=>acc+(d.nombreEmployes??0),0);

  // ─ Chefs de département : périmètre du compte appelant (correction 30/09) ─
  // Le backend (`GET /employers/leads`) renvoie déjà les LEAD actifs de l'entreprise et,
  // pour un compte ancré sur une agence (MANAGER / LEAD), de SON agence seulement.
  // Double filtre côté client : garde-fou si le backend n'est pas redéployé, et il protège
  // aussi contre une liste mise en cache.
  const monAgenceId = user?.sucursalId ? String(user.sucursalId) : null;
  const chefsDisponibles = useMemo(
    () => leads.filter(e => !monAgenceId || String(e.sucursalId ?? '') === monAgenceId),
    [leads, monAgenceId]
  );
  // Options du select. Le chef en place peut être hors périmètre (rôle changé en ADMIN,
  // ou rattaché à une autre agence) : on le conserve en option pour qu'un simple
  // renommage du département ne le fasse pas disparaître du champ — l'API refusera
  // toutefois de le laisser en place, le libellé le signale.
  const chefOptions = useMemo(() => {
    const opts = [
      { value: '', label: 'Aucun chef de département' },
      ...chefsDisponibles.map(e => ({
        value: String(e.id),
        label: [e.name || e.email, e.posteName, monAgenceId ? null : e.sucursalName]
          .filter(Boolean).join(' — '),
      })),
    ];
    const actuel = String(form.superviseurId || '');
    if (actuel && !opts.some(o => o.value === actuel)) {
      opts.push({
        value: actuel,
        label: `${editItem?.superviseurName || 'Chef actuel'} — hors périmètre (rôle LEAD requis)`,
      });
    }
    return opts;
  }, [chefsDisponibles, form.superviseurId, editItem, monAgenceId]);

  const openCreate = () => { setForm({ name: '', description: '', superviseurId: '' }); setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      superviseurId: item.superviseurId ? String(item.superviseurId) : '',
    });
    setModalOpen(true);
  };
  const handleSave = async (e) => {
    e.preventDefault();
    // Validation locale : évite l'aller-retour serveur (400) sur un nom vide.
    if (!form.name?.trim()) { toast.error('Le nom du département est obligatoire'); return; }
    if (user?.roleName === 'MANAGER' && !form.superviseurId) {
      toast.error('Choisissez un LEAD actif de votre succursale comme chef du département.');
      return;
    }
    setSaving(true);
    try {
      // '' → null : éviter une erreur de parse côté Jackson pour les champs Long
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        superviseurId: form.superviseurId || null,
      };
      if (editItem) await departementApi.update(editItem.id, payload);
      else await departementApi.create(payload);
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
  const openCreatePoste = () => { setPosteForm({ name:'', description:'', roleId:'', departementId:'' }); setEditPoste(null); setPosteModal(true); };
  const openEditPoste = (item) => { setEditPoste(item); setPosteForm({ name:item.name||'', description:item.description||'', roleId:item.roleId ? String(item.roleId) : '', departementId:item.departementId ? String(item.departementId) : '' }); setPosteModal(true); };
  const handleSavePoste = async (e) => {
    e.preventDefault();
    if (!posteForm.name?.trim()) { toast.error('Le nom du poste est obligatoire'); return; }
    if (!posteForm.departementId) { toast.error('Choisissez un département pour rattacher le poste'); return; }
    setPosteSaving(true);
    try {
      const payload = {
        name: posteForm.name.trim(),
        description: posteForm.description?.trim() || null,
        roleId: posteForm.roleId ? Number(posteForm.roleId) : null,
        departementId: Number(posteForm.departementId),
      };
      if (editPoste) await posteApi.update(editPoste.id, payload);
      else await posteApi.create(payload);
      toast.success(editPoste ? 'Poste modifié' : 'Poste créé');
      setPosteModal(false); loadPostes(); load(); loadStats();
    } catch (err) {
      const body = err.response?.data;
      const details = body?.data && typeof body.data === 'object'
        ? Object.values(body.data).filter(Boolean).join(' · ')
        : '';
      toast.error(details || body?.message || 'Erreur lors de l’enregistrement du poste');
    }
    finally { setPosteSaving(false); }
  };
  const deletePosteFn = async () => {
    setDeleting(true);
    try { await posteApi.delete(deletePoste.id); toast.success('Poste supprimé'); setDeletePoste(null); loadPostes(); load(); loadStats(); }
    catch { toast.error('Erreur'); } finally { setDeleting(false); }
  };

  const openCreateSuc = () => { setSucForm({ name:'', ville:'', adresse:'', telephone:'', statut:'ACTIVE', managerId:'' }); setEditSuc(null); setSucModal(true); };
  const openEditSuc = (s) => { setEditSuc(s); setSucForm({ name:s.name||'', ville:s.ville||'', adresse:s.adresse||'', telephone:s.telephone||'', statut:s.statut||'ACTIVE', managerId: s.managerId ? String(s.managerId) : '' }); setSucModal(true); };
  const setSucField = (k) => (e) => setSucForm(f => ({ ...f, [k]: e?.target?.value ?? e }));
  const handleSaveSuc = async (e) => {
    e.preventDefault();
    if (!sucForm.name?.trim()) { toast.error('Le nom de la sucursal est obligatoire'); return; }
    // Garde-fou local : un ADMIN sans entreprise ne peut pas créer (le serveur refuserait aussi).
    if (!editSuc && !myEntrepriseId) { toast.error("Votre compte n'est rattaché à aucune entreprise : contactez le Super Admin."); return; }
    setSucSaving(true);
    try {
      // managerId n'est pas porté par le DTO create/update : affectation via PATCH /{id}/manager.
      const { managerId, ...payload } = sucForm;
      if (editSuc) {
        await sucursalApi.update(editSuc.id, payload);
        const current = editSuc.managerId ? String(editSuc.managerId) : '';
        if (managerId !== current) await sucursalApi.assignManager(editSuc.id, managerId || null);
        toast.success('Sucursal modifiée');
      } else {
        const res = await sucursalApi.create(myEntrepriseId, payload);
        const created = res.data?.data || res.data;
        if (managerId && created?.id) await sucursalApi.assignManager(created.id, managerId);
        toast.success('Sucursal créée');
      }
      setSucModal(false); loadSucursales();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur enregistrement'); }
    finally { setSucSaving(false); }
  };
  const toggleSuc = async (s) => {
    try { await sucursalApi.toggleStatut(s.id); toast.success('Statut modifié'); loadSucursales(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur statut'); }
  };
  const deleteSucFn = async () => {
    setDeleting(true);
    try { await sucursalApi.delete(deleteSuc.id); toast.success('Sucursal supprimée'); setDeleteSuc(null); loadSucursales(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur suppression'); } finally { setDeleting(false); }
  };

  const tabs = [
    { key: 'departements', label: 'Départements', icon: <Building2 size={15} />, count: data.length },
    { key: 'postes', label: 'Postes', icon: <Briefcase size={15} />, count: postes.length },
    { key: 'organigramme', label: 'Organigramme', icon: <Network size={15} />, count: orgEmployes.length },
    { key: 'sucursales', label: 'Sucursales', icon: <MapPin size={15} />, count: sucursales.length },
  ];

  const postesFiltres = postes.filter(p =>
    (!filtreDept || String(p.departementId) === filtreDept) &&
    (!search || p.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const sucFiltrees = sucursales.filter(s =>
    !search || norm(s.name).includes(norm(search)) || norm(s.ville).includes(norm(search))
  );
  const sucActives = sucursales.filter(s => s.statut === 'ACTIVE').length;

  return (
    <div>
      <PageHeader title="Départements & Postes" subtitle="Structure organisationnelle : départements, postes, organigramme et sucursales">
        <Flex gap={10}>
          {tab === 'departements' && peutCreerStructure && (
            <Button onClick={openCreate}><SquarePlus size={16} /> Nouveau département</Button>
          )}
          {tab === 'postes' && peutCreerStructure && (
            <Button onClick={openCreatePoste}><SquarePlus size={16} /> Nouveau poste</Button>
          )}
          {tab === 'sucursales' && user?.roleName === 'ADMIN' && (
            <Button onClick={openCreateSuc}><SquarePlus size={16} /> Nouvelle sucursal</Button>
          )}
        </Flex>
      </PageHeader>

      <StatsGrid cols={4}>
        <StatCard title="Total départements" value={data.length}
          icon={<Building2 size={22} />} color="#3B82F6"
          active={tab === 'departements'} onClick={() => setTab('departements')}
          subtitle={`${totalEmployes} employés · ${totalPostes} postes`} />
        <StatCard title="Total postes" value={stats.total}
          icon={<Briefcase size={22} />} color="#8B5CF6"
          active={tab === 'postes'} onClick={() => setTab('postes')}
          subtitle={`${stats.rattaches} rattachés · ${stats.sansDepartement} sans département`} />
        <StatCard title="Organigramme" value={orgEmployes.length}
          icon={<Network size={22} />} color="#10B981"
          active={tab === 'organigramme'} onClick={() => setTab('organigramme')}
          subtitle="Hiérarchie des employés" />
        <StatCard title="Sucursales" value={sucursales.length}
          icon={<MapPin size={22} />} color="#F59E0B"
          active={tab === 'sucursales'} onClick={() => setTab('sucursales')}
          subtitle={`${sucActives} active${sucActives !== 1 ? 's' : ''} · ${sucursales.length - sucActives} suspendue${sucursales.length - sucActives !== 1 ? 's' : ''}`} />
      </StatsGrid>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />


      {tab === 'departements' && (
        <>
          <Flex justify="space-between" align="center" style={{ marginBottom: 14 }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un département (nom, description)…" style={{ width: 340 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {filtered.length} département{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
            </span>
          </Flex>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {loading ? <Empty title="Chargement…" /> : filtered.length === 0 ? (
            <Empty title="Aucun département" description="Créez votre premier département avec le bouton ci-dessus." />
          ) : filtered.map(d => (
            <Card key={d.id} hover padding={16}>
              <Flex justify="space-between" align="flex-start">
                <Flex gap={12} align="center">
                  <IconBox icon={<Building2 size={20} />} color="#3B82F6" />
                  <div>
                    <p style={{ fontWeight: 700, margin: 0 }}>{d.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                      {d.nombreEmployes ?? 0} employé(s) · {d.nombrePostes ?? 0} poste(s)
                    </p>
                    <Flex gap={6} align="center" style={{ marginTop: 4 }}>
                      {d.superviseurName ? (
                        <>
                          <Badge variant="primary" size="sm">LEAD</Badge>
                          <span style={{ fontSize: 12 }}>Chef : <strong>{d.superviseurName}</strong></span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun chef de département</span>
                      )}
                    </Flex>
                  </div>
                </Flex>
                <Flex gap={4}>
                  {peutModifierStructure && <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEdit(d)}><Pencil size={14} /></Button>}
                  {user?.roleName === 'SUPER_ADMIN' && <Button variant="ghost" size="sm" title="Supprimer" onClick={() => setDeleteItem(d)}><Trash2 size={14} /></Button>}
                </Flex>
              </Flex>
              {d.description && (
                <p style={{
                  fontSize: 12, color: 'var(--text-secondary)', margin: '10px 0 0',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {d.description}
                </p>
              )}
            </Card>
          ))}
          </div>
        </>
      )}

      {tab === 'postes' && (
        <Card padding={0}>
          <Flex justify="space-between" align="center" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)' }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un poste…" />
            <Select value={filtreDept} onChange={e => setFiltreDept(e.target.value)} placeholder={null} style={{ width: 220 }}
              options={[{ value: '', label: 'Tous les départements' }, ...data.map(d => ({ value: String(d.id), label: d.name }))]} />
          </Flex>
          <Table
            columns={[
              { key: 'name', label: 'Poste', render: (v) => <strong>{v}</strong> },
              { key: 'description', label: 'Description', render: (v) => <span style={{ color: 'var(--text-muted)' }}>{v || '—'}</span> },
              { key: 'departementName', label: 'Département', render: (v) => v ? <Badge variant="info" size="sm">{v}</Badge> : <Badge variant="default" size="sm">Aucun</Badge> },
              { key: 'nombreEmployes', label: 'Employés', render: (v) => v ?? 0 },
              { key: 'id', label: '', align: 'right', render: (v, p) => (
                <Flex gap={4}>
                  {peutModifierStructure && <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEditPoste(p)}><Pencil size={14} /></Button>}
                  {user?.roleName === 'SUPER_ADMIN' && <Button variant="ghost" size="sm" title="Supprimer" onClick={() => setDeletePoste(p)}><Trash2 size={14} /></Button>}
                </Flex>
              ) },
            ]}
            data={postesFiltres}
            loading={postesLoading}
            emptyText="Aucun poste trouvé"
          />
        </Card>
      )}

      {tab === 'organigramme' && (
        <Card>
          {orgEmployes.length === 0 ? (
            <Empty title="Aucun employé dans l'organigramme" />
          ) : (
            <OrgTree data={orgEmployes} loading={orgLoading} />
          )}
        </Card>
      )}

      {tab === 'sucursales' && (
        <Card padding={0}>
          <Flex justify="space-between" align="center" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)' }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une sucursal (nom, ville)…" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {sucFiltrees.length} sucursal{sucFiltrees.length !== 1 ? 's' : ''}
            </span>
          </Flex>
          {!myEntrepriseId && (
            <div style={{ padding: '14px 18px 0' }}>
              <Alert variant="warning" title="Entreprise non rattachée">
                Votre compte n'est rattaché à aucune entreprise : impossible de créer ou gérer des sucursales.
              </Alert>
            </div>
          )}
          <Table
            columns={[
              { key: 'name', label: 'Sucursal', render: (v) => (
                <Flex align="center" gap={10}>
                  <Badge variant="primary" size="sm"><MapPin size={12} /></Badge>
                  <strong>{v}</strong>
                </Flex>
              ) },
              { key: 'ville', label: 'Ville', render: (v) => v || '—' },
              { key: 'telephone', label: 'Téléphone', render: (v) => v || '—' },
              { key: 'managerNom', label: 'Manager', render: (v) => v
                ? <Flex align="center" gap={6}><Users size={13} style={{ color: 'var(--text-muted)' }} /><span style={{ fontWeight: 500 }}>{v}</span></Flex>
                : <span style={{ color: 'var(--text-muted)' }}>—</span> },
              { key: 'nombreEmployes', label: 'Employés', render: (v) => v ?? 0 },
              { key: 'statut', label: 'Statut', render: (v) => { const m = STATUT_SUCURSAL[v] || STATUT_SUCURSAL.ACTIVE; return <Badge variant={m.variant}>{m.label}</Badge>; } },
              { key: 'id', label: '', align: 'right', render: (v, s) => (
                <Flex gap={4}>
                  <Button variant="ghost" size="sm" title="Activer / Suspendre" onClick={() => toggleSuc(s)}><Power size={14} /></Button>
                  <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEditSuc(s)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" title="Supprimer" onClick={() => setDeleteSuc(s)}><Trash2 size={14} /></Button>
                </Flex>
              ) },
            ]}
            data={sucFiltrees}
            loading={sucLoading}
            emptyText="Aucune sucursal"
          />
        </Card>
      )}

      {/* Modal département */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Modifier le département' : 'Nouveau département'} width={440}
        footer={
          <Flex justify="flex-end" gap={10}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </Flex>
        }>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nom du département" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="ex : Ressources Humaines" autoFocus />
          <Textarea label="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Missions et périmètre du département…" />
          {chefsDisponibles.length === 0 && !form.superviseurId ? (
            <Alert variant="warning" title="Aucun chef de département disponible">
              Créez d'abord un employé actif avec le rôle <strong>LEAD</strong> (page Employés) :
              seul ce rôle peut diriger un département. L'employé doit aussi être rattaché à
              votre entreprise{monAgenceId ? ` et à votre succursale (${user?.sucursalName || 'votre agence'})` : ''}.
            </Alert>
          ) : (
            <Select label={`Chef de département (rôle LEAD)${user?.roleName === 'MANAGER' ? ' *' : ''}`} required={user?.roleName === 'MANAGER'} value={form.superviseurId}
              onChange={e => setForm(f => ({ ...f, superviseurId: e.target.value }))}
              options={chefOptions} />
          )}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '-8px 0 0' }}>
            Le chef de département doit être un employé actif portant le rôle <strong>LEAD</strong>
            {monAgenceId ? ' et rattaché à votre succursale' : ' (toutes succursales de votre entreprise)'}.
            Un ADMIN ne peut plus être nommé : il supervise tous les départements sans en diriger un.
            Sa nomination ne modifie pas son rôle (aucune promotion automatique).
          </p>
        </form>
      </Modal>

      {/* Modal poste */}
      <Modal open={posteModal} onClose={() => setPosteModal(false)} title={editPoste ? 'Modifier le poste' : 'Nouveau poste'} width={520}
        footer={
          <Flex justify="flex-end" gap={10}>
            <Button variant="secondary" onClick={() => setPosteModal(false)}>Annuler</Button>
            <Button onClick={handleSavePoste} disabled={posteSaving}>{posteSaving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </Flex>
        }>
        <form onSubmit={handleSavePoste} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Intitulé du poste *" required value={posteForm.name} onChange={e => setPosteForm(f => ({ ...f, name: e.target.value }))} placeholder="ex : Développeur Full Stack" />
          <Input label="Description" value={posteForm.description} onChange={e => setPosteForm(f => ({ ...f, description: e.target.value }))} placeholder="Missions principales…" />
          <Select label="Département de rattachement *" required value={posteForm.departementId} onChange={e => setPosteForm(f => ({ ...f, departementId: e.target.value }))}
            options={[{ value: '', label: 'Sélectionner un département' }, ...data.map(d => ({ value: String(d.id), label: d.name }))]} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '-8px 0 0' }}>
            Le rôle associé est facultatif.
          </p>
        </form>
      </Modal>

      <Modal open={sucModal} onClose={() => setSucModal(false)} title={editSuc ? 'Modifier la sucursal' : 'Nouvelle sucursal'} width={500}
        footer={
          <Flex justify="flex-end" gap={10}>
            <Button variant="secondary" onClick={() => setSucModal(false)}>Annuler</Button>
            <Button onClick={handleSaveSuc} disabled={sucSaving}>{sucSaving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </Flex>
        }>
        <form onSubmit={handleSaveSuc} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Entreprise" value={myEntrepriseNom || `Entreprise #${myEntrepriseId || '—'}`} disabled readOnly />
          <Input label="Nom de la sucursal *" value={sucForm.name} onChange={setSucField('name')} required placeholder="ex : Agence Douala" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Ville" value={sucForm.ville} onChange={setSucField('ville')} placeholder="ex : Douala" />
            <Input label="Téléphone" value={sucForm.telephone} onChange={setSucField('telephone')} placeholder="ex : +237 6XX XX XX XX" />
          </div>
          <Input label="Adresse" value={sucForm.adresse} onChange={setSucField('adresse')} placeholder="ex : Akwa, rue 2.345" />
          <Select label="Manager de la succursale" value={sucForm.managerId} onChange={setSucField('managerId')}
            placeholder="(Aucun manager affecté)"
            options={[{ value: '', label: '(Aucun)' },
              ...sucCandidates.map(c => ({ value: String(c.id), label: `${c.name}${c.roleName ? ' · ' + c.roleName : ''}${c.posteName ? ' · ' + c.posteName : ''}` })) ]} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '-8px 0 0' }}>
            Compte actif de votre entreprise. Un manager affecté ici est restreint aux données de cette succursale.
          </p>
          {editSuc && (
            <Select label="Statut" value={sucForm.statut} onChange={setSucField('statut')}
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDUE', label: 'Suspendue' }]} />
          )}
        </form>
      </Modal>

      <Confirm
        open={!!deleteItem || !!deletePoste}
        title={deleteItem ? 'Supprimer le département' : 'Supprimer le poste'}
        message={deleteItem
          ? `Supprimer « ${deleteItem?.name} » ? Les postes et employés rattachés devront être réaffectés.`
          : `Supprimer le poste « ${deletePoste?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        loading={deleting}
        onClose={() => { setDeleteItem(null); setDeletePoste(null); }}
        onConfirm={deleteItem ? handleDelete : deletePosteFn}
      />

      <Confirm
        open={!!deleteSuc}
        title="Supprimer la sucursal"
        message={`Supprimer « ${deleteSuc?.name} » ? Impossible si des employés y sont rattachés (suspendez-la plutôt).`}
        confirmLabel="Supprimer"
        loading={deleting}
        onClose={() => setDeleteSuc(null)}
        onConfirm={deleteSucFn}
      />
    </div>
  );
}
