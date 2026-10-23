// pages/admin/EntrepriseDetail.jsx — Détail d'une entreprise (Super Admin) — onglets (3.3)
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Users, ShieldCheck, FileText, Folders, ListChecks, Coins, ArrowLeft, UserPlus, Clock, KeyRound, Sparkles } from 'lucide-react';
import { entrepriseApi, employerApi, plateformeApi, impersonateApi } from '../../Api';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Select, Tabs, StatsGrid, StatCard, IconBox, Switch, Empty, Flex, SectionTitle, InfoRow } from '../../components/ui';
import { STATUT_META, TYPE_META } from './entreprises.meta';
import toast from 'react-hot-toast';
import { useDeferredTask } from '../../hooks/useDeferredTask';

export default function EntrepriseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('infos');
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [emps, setEmps] = useState([]);
  const [stats, setStats] = useState(null);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [empsLoading, setEmpsLoading] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name:'', email:'', motDePasse:'' });
  const [saving, setSaving] = useState(false);
  const [pcfg, setPcfg] = useState({ arriveeStandard:'', departStandard:'', arriveeMinimale:'' });
  const [pcfgEdited, setPcfgEdited] = useState(false);
  const pcfgValues = pcfgEdited ? pcfg : {
    arriveeStandard: item?.heureArriveeStandard || '',
    departStandard: item?.heureDepartStandard || '',
    arriveeMinimale: item?.heureArriveeMinimale || '',
  };
  const [users, setUsers] = useState([]);

  const savePcfg = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await entrepriseApi.updatePointageConfig(id, {
        arriveeStandard: pcfgValues.arriveeStandard || null,
        departStandard: pcfgValues.departStandard || null,
        arriveeMinimale: pcfgValues.arriveeMinimale || null,
      });
      toast.success('Configuration du pointage enregistrée'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur enregistrement'); }
    finally { setSaving(false); }
  };

  const load = async () => {
    try { const r = await entrepriseApi.getById(id); setPcfgEdited(false); setItem(r.data?.data || r.data); }
    catch { toast.error('Chargement entreprise'); navigate('/admin/entreprises'); }
    finally { setLoading(false); }
  };

  const loadAdmins = async () => {
    setAdminsLoading(true);
    try { const r = await entrepriseApi.getAdmins(id); const d = r.data?.data || r.data; setAdmins(Array.isArray(d) ? d : []); }
    catch { setAdmins([]); }
    finally { setAdminsLoading(false); }
  };

  const loadEmps = async () => {
    setEmpsLoading(true);
    try { const r = await employerApi.getAll({ page:0, size:200, entrepriseId:id }); const d = r.data?.data || r.data; setEmps(Array.isArray(d) ? d : d?.content || []); }
    catch { setEmps([]); }
    finally { setEmpsLoading(false); }
  };

  const loadUsers = async () => {
    try { const r = await plateformeApi.utilisateurs(id); const d = r.data?.data || r.data; setUsers(Array.isArray(d) ? d : []); }
    catch { setUsers([]); }
  };

  useDeferredTask(() => {
    load();
    if (tab === 'admins') loadAdmins();
    if (tab === 'employes') loadEmps();
    if (tab === 'support') loadUsers();
    if (tab === 'stats') {
      entrepriseApi.getSuperAdminStats()
        .then(r => {
          const s = r.data?.data || r.data;
          const mine = s?.parEntreprise?.find(x => x.entrepriseId === Number(id));
          setStats(mine || null);
        })
        .catch(() => toast.error('Impossible de charger les statistiques de l’entreprise'));
    }
  }, `${tab}:${id}`);

  const toggleAdmin = async (a) => {
    try {
      await entrepriseApi.toggleAdminStatut(id, a.id);
      toast.success(a.actif ? 'Admin désactivé' : 'Admin réactivé');
      loadAdmins();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const openAddAdmin = () => { setAdminForm({ name:'', email:'', motDePasse:'' }); setAdminModal(true); };
  const setAdminField = (k) => (e) => setAdminForm(f => ({ ...f, [k]: e.target.value }));

  const handleAddAdmin = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await entrepriseApi.createAdmin(id, { name: adminForm.name, email: adminForm.email, motDePasse: adminForm.motDePasse });
      toast.success('Admin créé'); setAdminModal(false); loadAdmins();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur création'); }
    finally { setSaving(false); }
  };

  const resetAdmin = async (a) => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${a.name} ?`)) return;
    try {
      const r = await entrepriseApi.resetAdminPassword(id, a.id);
      const d = r.data?.data || r.data;
      window.alert(`Nouveau mot de passe temporaire pour ${d.email} :\n\n${d.motDePasseTemporaire}\n\nTransmettez-le HORS audit — il devra être changé au prochain accès.`);
      toast.success('Mot de passe réinitialisé');
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur reset'); }
  };

  const changeRole = async (a, role) => {
    try {
      await entrepriseApi.changeAdminRole(id, a.id, role);
      toast.success('Rôle mis à jour'); loadAdmins();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur rôle'); }
  };

  const impersonate = async (u) => {
    if (!window.confirm(`Prendre le contrôle de ${u.name} ? (lecture seule, 15 min, tracé en audit)`)) return;
    try {
      const r = await impersonateApi.start(u.id);
      const d = r.data?.data || r.data;
      localStorage.setItem('sirhgp-sa-token', localStorage.getItem('sirhgp-token'));
      localStorage.setItem('sirhgp-token', d.token);
      localStorage.setItem('sirhgp-impersonation', JSON.stringify({ impersonatorNom: d.impersonatorNom, cibleNom: d.cibleNom }));
      toast.success(`Impersonation de ${d.cibleNom} — lecture seule`);
      window.location.href = '/dashboard';
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur impersonation'); }
  };

  const statutM = STATUT_META[item?.statut] || STATUT_META.ACTIVE;
  const typeM = TYPE_META[item?.type] || TYPE_META.AUTRE;

  return (
    <div>
      {loading ? <Empty title='Chargement...' /> : (
      <>
        <PageHeader
          title={item?.name || ('Entreprise')}
          breadcrumbs={['Administration', 'Entreprises', item?.name || ('Détail')]}
          subtitle={'Super Admin — vue transverse de ' + (item?.name || ' ')}
        >
          <Badge variant={statutM.variant}>{statutM.label}</Badge>
          <Badge variant={typeM.variant}>{typeM.label}</Badge>
          <Button onClick={() => navigate('/admin/entreprises')} variant='secondary'><ArrowLeft size={15}/> Retour</Button>
        </PageHeader>

        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { key:'infos', label:'Infos', icon:<Building2 size={14}/> }, 
            { key:'admins', label:'Admins', icon:<ShieldCheck size={14}/>, count: adminsLoading ? undefined : admins.length }, 
            { key:'employes', label:'Employés', icon:<Users size={14}/>, count: empsLoading ? undefined : emps.length }, 
            { key:'stats', label:'Stats', icon:<FileText size={14}/> }, 
            { key:'pointage', label:'Pointage', icon:<Clock size={14}/> },
            { key:'support', label:'Support', icon:<Sparkles size={14}/> },
          ]}
        />

        {tab === 'infos' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <Card>
              <SectionTitle>Informations générales</SectionTitle>
              <Flex direction="column" gap={10}>
                <InfoRow label='Nom' value={item?.name} />
                <InfoRow label='Type' value={typeM.label} />
                <InfoRow label='Statut' value={statutM.label} />
                <InfoRow label='Secteur' value={item?.secteurActivite} />
                <InfoRow label='Ville' value={item?.ville} />
                <InfoRow label='Adresse' value={item?.adresse} />
                <InfoRow label='Téléphone' value={item?.telephone} />
                <InfoRow label='Email' value={item?.email} />
                <InfoRow label='Créée le' value={item?.dateCreation ? new Date(item.dateCreation).toLocaleDateString('fr-FR') : '—'} />
              </Flex>
            </Card>
            <Card>
              <SectionTitle>Description</SectionTitle>
              <p style={{ color:'var(--text-secondary)', fontSize:14, lineHeight:1.6, margin:'0 0 16px' }}>{item?.description || '—'}</p>
              <SectionTitle style={{ margin:'0 0 12px' }}>Compteurs</SectionTitle>
              <Flex gap={12}>
                <Badge variant='info'><Users size={12}/> {emps.length} employés</Badge>
                <Badge variant='primary'><ShieldCheck size={12}/> {admins.length} admins</Badge>
              </Flex>
            </Card>
          </div>
        )}

        {tab === 'admins' && (
          <Card>
            <Flex justify="space-between" align="center" style={{ marginBottom:16 }}>
              <SectionTitle style={{ margin:0 }}>Administrateurs</SectionTitle>
              <Button onClick={openAddAdmin} leftIcon={<UserPlus size={16}/>}>Ajouter un admin</Button>
            </Flex>
            <Table
              data={admins}
              loading={adminsLoading}
              emptyText='Aucun administrateur'
              columns={[
                { key:'name', label:'Nom', render:(v,row) => (
                  <Flex align="center" gap={10}>
                    <IconBox icon={<Users size={16}/>} color='var(--color-primary)' />
                    <div><div style={{ fontWeight:600 }}>{v}</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{row.email}</div></div>
                  </Flex>
                )},
                { key:'actif', label:'Statut', render:v => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Actif' : 'Inactif'}</Badge> },
                { key:'roleName', label:'Rôle (5.9)', render:(v,row) => (
                  <Select value={v || 'ADMIN'} onChange={e => changeRole(row, e.target.value)}
                    options={['ADMIN','MANAGER','LEAD','STAFF','STAGIAIRE'].map(r => ({ value:r, label:r }))}
                    style={{ width:140 }}/>
                )},
                { key:'id', label:'Actions', align:'right', render:(v,row) => (
                  <Flex gap={6} justify="flex-end" align="center">
                    <Button variant="ghost" size="sm" title="Réinitialiser le mot de passe"
                      onClick={() => resetAdmin(row)}><KeyRound size={14}/></Button>
                    <Switch checked={row.actif} onChange={() => toggleAdmin(row)} title='Activer/Désactiver' />
                  </Flex>
                )},
              ]}
            />
          </Card>
        )}

        {tab === 'employes' && (
          <Card>
            <SectionTitle>Employés récents</SectionTitle>
            <Table
              data={emps}
              loading={empsLoading}
              emptyText='Aucun employé' 
              columns={[
                { key:'name', label:'Nom' }, 
                { key:'email', label:'Email' }, 
                { key:'departementName', label:'Département', render:v => v || '—' }, 
                { key:'posteName', label:'Poste', render:v => v || '—' }, 
                { key:'actif', label:'Statut', render:v => <Badge variant={v ? 'success' : 'default'}>{v ? 'Actif' : 'Inactif'}</Badge> },
              ]}
            />
          </Card>
        )}

        {tab === 'stats' && (
          <Card>
            <SectionTitle>Statistiques de l'entreprise</SectionTitle>
            <StatsGrid cols={4}>
              <StatCard title='Employés' value={item?.nombreEmployes ?? emps.length} icon={<Users size={20}/>} color='var(--color-info)' />
              <StatCard title='Projets' value={stats?.nbProjets ?? '—'} icon={<Folders size={20}/>} color='var(--color-success)' />
              <StatCard title='Tâches' value={stats?.nbTaches ?? '—'} icon={<ListChecks size={20}/>} color='var(--color-accent)' />
              <StatCard title='Factures' value={stats?.nbFactures ?? '—'} icon={<FileText size={20}/>} color='var(--color-warning)' />
            </StatsGrid>
            <StatsGrid cols={2}>
              <StatCard title='Montant facturé (FCFA)' value={stats?.montantFactures != null ? Number(stats.montantFactures).toLocaleString('fr-FR') : '—'} icon={<Coins size={20}/>} color='var(--color-success)' />
            </StatsGrid>
          </Card>
        )}

        {tab === 'pointage' && (
          <Card>
            <SectionTitle>Configuration du pointage</SectionTitle>
            <p style={{ color:'var(--text-muted)', fontSize:13, margin:'0 0 20px' }}>
              Règles appliquées aux employés de cette entreprise sur la pointeuse (badgeuse).
              Laissez vide pour désactiver un contrôle.
            </p>
            <form onSubmit={savePcfg} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Flex direction="row" wrap gap={16}>
                <Input type="time" label="Heure d'arrivée standard" value={pcfgValues.arriveeStandard}
                  onChange={e => { setPcfgEdited(true); setPcfg(p => ({ ...p, arriveeStandard: e.target.value })); }}
                  style={{ maxWidth:220 }} hint="Après cette heure = retard" />
                <Input type="time" label="Heure de départ standard" value={pcfgValues.departStandard}
                  onChange={e => { setPcfgEdited(true); setPcfg(p => ({ ...p, departStandard: e.target.value })); }}
                  style={{ maxWidth:220 }} hint="Avant cette heure = départ anticipé" />
                <Input type="time" label="Heure d'arrivée minimale" value={pcfgValues.arriveeMinimale}
                  onChange={e => { setPcfgEdited(true); setPcfg(p => ({ ...p, arriveeMinimale: e.target.value })); }}
                  style={{ maxWidth:220 }} hint="Avant = pointage rédhibitoire / anormal" />
              </Flex>
              <Button type="submit" loading={saving} style={{ alignSelf:'flex-start' }}>
                Enregistrer la configuration
              </Button>
            </form>
            <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--border-default)' }}>
              <SectionTitle style={{ margin:'0 0 8px' }}>Résumé des règles</SectionTitle>
              <ul style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.8, paddingLeft:18 }}>
                <li><strong>Arrivée standard :</strong> {pcfgValues.arriveeStandard || '—'} — pointer après = <Badge variant="warning" size="sm">En retard</Badge></li>
                <li><strong>Départ standard :</strong> {pcfgValues.departStandard || '—'} — partir avant = <Badge variant="danger" size="sm">Départ anticipé</Badge></li>
                <li><strong>Arrivée minimale :</strong> {pcfgValues.arriveeMinimale || '—'} — pointer avant = <Badge variant="danger" size="sm">Anormal</Badge></li>
              </ul>
            </div>
          </Card>
        )}

        {tab === 'support' && (
          <Card>
            <SectionTitle>Support — impersonation (lecture seule, 15 min, tracé en audit)</SectionTitle>
            <p style={{ color:'var(--text-muted)', fontSize:13, margin:'0 0 16px' }}>
              Le SUPER_ADMIN n'a aucun accès direct aux fiches employés (§7) : la consultation
              d'un tenant passe par un jeton d'impersonation court, revêtu des droits de la cible
              en lecture seule.
            </p>
            <Table
              data={users}
              emptyText='Aucun utilisateur'
              columns={[
                { key:'name', label:'Nom', render:(v,row) => (
                  <div><div style={{ fontWeight:600 }}>{v}</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{row.email}</div></div>
                )},
                { key:'roleName', label:'Rôle', render:v => <Badge variant='info'>{v || '—'}</Badge> },
                { key:'actif', label:'Statut', render:v => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Actif' : 'Inactif'}</Badge> },
                { key:'id', label:'', align:'right', render:(v,row) => (
                  row.actif && row.roleName !== 'SUPER_ADMIN'
                    ? <Button variant='secondary' size='sm' onClick={() => impersonate(row)}>Prendre le contrôle</Button>
                    : <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>
                )},
              ]}
            />
          </Card>
        )}

      </>
      )}

      <Modal open={adminModal} onClose={() => setAdminModal(false)}
        title='Ajouter un admin'
        footer={<Flex justify="flex-end" gap={10}>
          <Button variant='secondary' onClick={() => setAdminModal(false)}>Annuler</Button>
          <Button onClick={handleAddAdmin} loading={saving}>Créer l'admin</Button>
        </Flex>}
      >
        <form onSubmit={handleAddAdmin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label='Nom complet' value={adminForm.name} onChange={setAdminField('name')} required placeholder='ex: Marie Kamga' />
          <Input label='Email' type='email' value={adminForm.email} onChange={setAdminField('email')} required placeholder='admin@entreprise.cm' />
          <Input label='Mot de passe' type='password' value={adminForm.motDePasse} onChange={setAdminField('motDePasse')} required minLength={8} placeholder='8 caractères min.' />
        </form>
      </Modal>
    </div>
  );
}
