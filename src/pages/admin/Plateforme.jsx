import { useState, useEffect } from 'react';
import { Activity, History, Gauge, Database, RefreshCw } from 'lucide-react';
import { plateformeApi } from '../../Api';
import { PageHeader, Card, Table, Badge, Button, Input, Flex, SectionTitle, StatsGrid, StatCard, Select, Empty, Pagination } from '../../components/ui';
import toast from 'react-hot-toast';

const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('fr-FR') : '—';

export default function Plateforme() {
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState([]);
  const [versions, setVersions] = useState([]);
  const [flags, setFlags] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cfgForm, setCfgForm] = useState({ cle: '', valeur: '', description: '' });
  const [flagForm, setFlagForm] = useState({ cle: '', description: '' });
  const [quotaForm, setQuotaForm] = useState({ entrepriseId: '', maxEmployes: '', maxSucursales: '', maxStockageMo: '' });
  const [saving, setSaving] = useState(false);
  const [flagsPage, setFlagsPage] = useState(0);
  const [quotasPage, setQuotasPage] = useState(0);
  const PAGE_SIZE = 5;
  const pageSlice = (arr, p) => (arr || []).slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
  const pageCount = (arr) => Math.max(1, Math.ceil((arr || []).length / PAGE_SIZE));

  const load = async () => {
    setLoading(true);
    setFlagsPage(0);
    setQuotasPage(0);
    try {
      const [h, c, v, f, q, b] = await Promise.all([
        plateformeApi.health(), plateformeApi.getConfig(), plateformeApi.versions(),
        plateformeApi.flags(), plateformeApi.quotas(), plateformeApi.backups(),
      ]);
      setHealth(h.data?.data || h.data);
      setConfig(c.data?.data || c.data || []);
      setVersions(v.data?.data || v.data || []);
      setFlags(f.data?.data || f.data || []);
      setQuotas(q.data?.data || q.data || []);
      setBackups(b.data?.data || b.data || []);
    } catch { toast.error('Chargement plateforme'); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch au montage ; `loading` démarre à true et les rechargements manuels réactivent le spinner
  useEffect(() => { load(); }, []);

  const saveConfig = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await plateformeApi.putConfig(cfgForm);
      toast.success('Configuration enregistrée');
      setCfgForm({ cle:'', valeur:'', description:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const createFlag = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await plateformeApi.createFlag({ cle: flagForm.cle, ...(flagForm.description ? { description: flagForm.description } : {}) });
      toast.success('Feature flag créé');
      setFlagForm({ cle:'', description:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const toggleFlag = async (f) => {
    try { await plateformeApi.updateFlag(f.cle, { actifParDefaut: !f.actifParDefaut }); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const deleteFlag = async (f) => {
    if (!window.confirm(`Supprimer le flag « ${f.cle} » ?`)) return;
    try { await plateformeApi.deleteFlag(f.cle); toast.success('Flag supprimé'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const saveQuota = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await plateformeApi.upsertQuota({
        entrepriseId: quotaForm.entrepriseId ? Number(quotaForm.entrepriseId) : null,
        maxEmployes: quotaForm.maxEmployes ? Number(quotaForm.maxEmployes) : null,
        maxSucursales: quotaForm.maxSucursales ? Number(quotaForm.maxSucursales) : null,
        maxStockageMo: quotaForm.maxStockageMo ? Number(quotaForm.maxStockageMo) : null,
      });
      toast.success('Quota enregistré');
      setQuotaForm({ entrepriseId:'', maxEmployes:'', maxSucursales:'', maxStockageMo:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const requestBackup = async () => {
    try { await plateformeApi.requestBackup(); toast.success('Sauvegarde demandée (script infra)'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const updateBackup = async (b, statut) => {
    try { await plateformeApi.updateBackupStatut(b.id, statut); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  return (
    <div>
      <PageHeader title="Plateforme" subtitle="Administration technique (5.9) — SUPER_ADMIN uniquement">
        <Button variant="secondary" onClick={load}><RefreshCw size={16}/> Actualiser</Button>
      </PageHeader>

      {/* ─── Santé ─── */}
      <StatsGrid cols={3}>
        <StatCard title="Base de données" value={health?.db ?? '—'} icon={<Activity size={20}/>} color={health?.db === 'OK' ? 'var(--color-success)' : 'var(--color-danger)'} loading={loading}/>
        <StatCard title="Disque libre" value={health?.disqueLibreMo != null ? `${health.disqueLibreMo} Mo` : '—'} icon={<Gauge size={20}/>} color="var(--color-info)" loading={loading}/>
        <StatCard title="Uptime" value={health?.uptimeMs != null ? `${Math.round(health.uptimeMs / 60000)} min` : '—'} icon={<History size={20}/>} color="var(--color-primary)" loading={loading}/>
      </StatsGrid>

      {/* ─── Historique des refontes ─── */}
      <Card>
        <SectionTitle>Historique des refontes (5.x)</SectionTitle>
        <Table
          data={versions}
          loading={loading}
          emptyText="Aucune version"
          columns={[
            { key:'numero', label:'Version', render:v => <Badge variant="primary">Refonte {v}</Badge> },
            { key:'dateSortie', label:'Sortie', render:v => v || '—' },
            { key:'resume', label:'Résumé' },
          ]}
        />
      </Card>

      {/* ─── Configuration globale ─── */}
      <Card>
        <SectionTitle>Configuration globale (clé / valeur)</SectionTitle>
        <Table
          data={config}
          loading={loading}
          emptyText="Aucun paramètre"
          columns={[
            { key:'cle', label:'Clé', render:v => <code>{v}</code> },
            { key:'valeur', label:'Valeur', render:v => v ?? '—' },
            { key:'description', label:'Description', render:v => v || '—' },
            { key:'dateModification', label:'Modifié le', render:v => fmtDate(v) },
          ]}
        />
        <form onSubmit={saveConfig} style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <Input label="Clé *" value={cfgForm.cle} onChange={e => setCfgForm(f => ({ ...f, cle: e.target.value }))} required placeholder="ex: maintenance_mode" style={{ maxWidth:220 }}/>
          <Input label="Valeur" value={cfgForm.valeur} onChange={e => setCfgForm(f => ({ ...f, valeur: e.target.value }))} placeholder="true / false / texte" style={{ maxWidth:220 }}/>
          <Input label="Description" value={cfgForm.description} onChange={e => setCfgForm(f => ({ ...f, description: e.target.value }))} style={{ maxWidth:280 }}/>
          <Button type="submit" loading={saving}>Enregistrer</Button>
        </form>
      </Card>

      {/* ─── Feature flags ─── */}
      <Card>
        <SectionTitle>Feature flags</SectionTitle>
        <Table
          data={pageSlice(flags, flagsPage)}
          loading={loading}
          emptyText="Aucun feature flag"
          columns={[
            { key:'cle', label:'Clé', render:v => <code>{v}</code> },
            { key:'description', label:'Description', render:v => v || '—' },
            { key:'actifParDefaut', label:'Défaut', render:v => <Badge variant={v ? 'success' : 'default'}>{v ? 'Actif' : 'Inactif'}</Badge> },
            { key:'id', label:'', align:'right', render:(v,row) => (
              <Flex gap={6} justify="flex-end">
                <Button variant="ghost" size="sm" onClick={() => toggleFlag(row)}>{row.actifParDefaut ? 'Désactiver' : 'Activer'}</Button>
                <Button variant="ghost" size="sm" style={{ color:'var(--color-danger)' }} onClick={() => deleteFlag(row)}>Suppr.</Button>
              </Flex>
            )},
          ]}
        />
        <Pagination page={flagsPage} totalPages={pageCount(flags)} onChange={setFlagsPage} />
        <form onSubmit={createFlag} style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <Input label="Clé *" value={flagForm.cle} onChange={e => setFlagForm(f => ({ ...f, cle: e.target.value }))} required placeholder="ex: new_dashboard" style={{ maxWidth:240 }}/>
          <Input label="Description" value={flagForm.description} onChange={e => setFlagForm(f => ({ ...f, description: e.target.value }))} style={{ maxWidth:320 }}/>
          <Button type="submit" loading={saving}>Créer le flag</Button>
        </form>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:8 }}>
          Overrides par tenant : <code>PATCH /api/plateforme/feature-flags/{'{key}'}/tenants/{'{entrepriseId}'}</code> —
          valeurs effectives exposées à tous les rôles via <code>GET /api/feature-flags</code>.
        </p>
      </Card>

      {/* ─── Quotas ─── */}
      <Card>
        <SectionTitle>Quotas (vide = quota global ; null = illimité)</SectionTitle>
        <Table
          data={pageSlice(quotas, quotasPage)}
          loading={loading}
          emptyText="Aucun quota (illimité partout)"
          columns={[
            { key:'entrepriseId', label:'Entreprise', render:v => v ?? '🌐 Global' },
            { key:'maxEmployes', label:'Max employés', render:v => v ?? '∞' },
            { key:'maxSucursales', label:'Max succursales', render:v => v ?? '∞' },
            { key:'maxStockageMo', label:'Stockage (Mo)', render:v => v ?? '∞' },
          ]}
        />
        <Pagination page={quotasPage} totalPages={pageCount(quotas)} onChange={setQuotasPage} />
        <form onSubmit={saveQuota} style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <Input label="Entreprise ID (vide = global)" value={quotaForm.entrepriseId} onChange={e => setQuotaForm(f => ({ ...f, entrepriseId: e.target.value }))} placeholder="global" style={{ maxWidth:200 }}/>
          <Input label="Max employés" type="number" value={quotaForm.maxEmployes} onChange={e => setQuotaForm(f => ({ ...f, maxEmployes: e.target.value }))} style={{ maxWidth:150 }}/>
          <Input label="Max succursales" type="number" value={quotaForm.maxSucursales} onChange={e => setQuotaForm(f => ({ ...f, maxSucursales: e.target.value }))} style={{ maxWidth:150 }}/>
          <Input label="Stockage (Mo)" type="number" value={quotaForm.maxStockageMo} onChange={e => setQuotaForm(f => ({ ...f, maxStockageMo: e.target.value }))} style={{ maxWidth:150 }}/>
          <Button type="submit" loading={saving}>Enregistrer</Button>
        </form>
      </Card>

      {/* ─── Sauvegardes ─── */}
      <Card>
        <Flex justify="space-between" align="center" style={{ marginBottom:12 }}>
          <SectionTitle style={{ margin:0 }}>Sauvegardes</SectionTitle>
          <Button onClick={requestBackup} leftIcon={<Database size={15}/>}>Demander une sauvegarde</Button>
        </Flex>
        {backups.length === 0 && !loading ? (
          <Empty title="Aucune sauvegarde enregistrée"/>
        ) : (
          <Table
            data={backups}
            loading={loading}
            emptyText="Aucune sauvegarde"
            columns={[
              { key:'id', label:'#' },
              { key:'dateCreation', label:'Demande', render:v => fmtDate(v) },
              { key:'statut', label:'Statut', render:v => (
                <Badge variant={v === 'REUSSI' ? 'success' : v === 'ECHEC' ? 'danger' : 'warning'}>{v}</Badge>
              )},
              { key:'message', label:'Message', render:v => v || '—' },
              { key:'id2', label:'', align:'right', render:(v,row) => (
                <Select
                  value={row.statut}
                  onChange={e => updateBackup(row, e.target.value)}
                  options={['DEMANDE','EN_COURS','REUSSI','ECHEC'].map(s => ({ value:s, label:s }))}
                  style={{ width:140 }}
                />
              )},
            ]}
          />
        )}
        <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:8 }}>
          L'exécution réelle est assurée par le script infrastructure ; le statut est reporté via
          <code> PATCH /api/plateforme/backups/{'{id}'}/statut</code>.
        </p>
      </Card>
    </div>
  );
}

