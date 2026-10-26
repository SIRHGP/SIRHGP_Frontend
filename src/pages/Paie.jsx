// pages/Paie.jsx — Bulletins de paie (standard camerounais) + filtres période / département / nom
import { useState } from 'react';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { Download, FileText, Users, Search, Wallet, AlertTriangle, TrendingDown, Pencil, Trash2 } from 'lucide-react';
import { paieApi, departementApi, employerApi } from '../Api';
import { PageHeader, Card, Table, Badge, Button, Select, Input, StatsGrid, StatCard, Flex, Empty, Drawer, FormRow, Alert, SectionTitle, InfoRow, Confirm, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import { calcCotisations } from '../utils/paieCalc';
import { useAuth } from '../contexts/Authcontext';

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const fmt = (v) => v != null ? Number(v).toLocaleString('fr-FR') + ' FCFA' : '—';
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const responseList = (response) => {
  const body = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

export default function Paie() {
  const now = new Date();
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [departementId, setDepartementId] = useState('');
  const [recherche, setRecherche] = useState('');
  const [departements, setDepartements] = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [detailBulletin, setDetailBulletin] = useState(null); // bulletin cliqué
  const [ficheData, setFicheData] = useState(null);
  const [ficheVar, setFicheVar] = useState({ primes: '', motif: '' });
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheErr, setFicheErr] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  // STAFF / STAGIAIRE : consultation LECTURE SEULE de SES propres bulletins
  // (le backend force déjà employeId = soi dans PaieService.consulter). On évite
  // d'appeler /employers et /departements (403 pour ces rôles) qui feraient échouer
  // tout le Promise.all et masqueraient les bulletins.
  const estGestion = ['ADMIN', 'MANAGER', 'LEAD'].includes(user?.roleName);

  const load = async () => {
    try {
      if (estGestion && departements.length === 0) {
        try {
          const dr = await departementApi.getAll({ size: 200 });
          setDepartements(responseList(dr));
        } catch { /* non bloquant */ }
      }
      const res = await paieApi.bulletins({ page:0, size:500 });
      setBulletins(responseList(res));
      if (estGestion) {
        try {
          const er = await employerApi.getAll({ size:500 });
          setEmployes(responseList(er));
        } catch { /* non bloquant pour un gestionnaire sans accès employés */ }
      }
    } catch { toast.error('Erreur chargement bulletins'); }
    finally { setLoading(false); }
  };

  useDeferredTask(load, 'mount');

  const downloadPdf = async (b) => {
    try {
      const res = await paieApi.pdf(b.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `bulletin-${b.employeNom || b.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur téléchargement'); }
  };

  const fmtFa = (v) => v == null || v === '' ? '—' : (Number(v)).toLocaleString('fr-FR') + ' FCFA';
  const moisfmt = (m, a) => {
    const d = new Date(a, m - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };
  const MOIS_OPTIONS = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2024, i, 1);
    return { value: String(i + 1), label: d.toLocaleDateString('fr-FR', { month: 'long' }) };
  });

  // Ouvre la fiche de paie d'un bulletin (même rendu que dans l'interface Employé)
  const openFiche = async (b) => {
    setDetailBulletin(b);
    setFicheData(null);
    setFicheVar({ primes: '', motif: '' });
    setFicheErr('');
    setFicheLoading(true);
    try {
      const res = await paieApi.heuresEmploye(b.employeId, b.mois || mois, b.annee || annee);
      const d = res.data?.data || res.data;
      setFicheData(d);
    } catch (e) {
      setFicheErr(e.response?.data?.message || 'Erreur chargement des heures');
      setFicheData(null);
    } finally { setFicheLoading(false); }
  };

  const fermerFiche = () => { setDetailBulletin(null); setFicheData(null); };

  // Modification / suppression d'un bulletin (ADMIN)
  const [editBulletin, setEditBulletin] = useState(null);
  const [editForm, setEditForm] = useState({ primes: '', indemnites: '', retenuesDiverses: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const ouvrirModifier = (b) => {
    setEditBulletin(b);
    setEditForm({
      primes: b.primes != null ? String(b.primes) : '0',
      indemnites: b.indemnites != null ? String(b.indemnites) : '0',
      retenuesDiverses: b.retenuesDiverses != null ? String(b.retenuesDiverses) : '0',
    });
  };
  const enregistrerModif = async () => {
    if (!editBulletin) return;
    setSaving(true);
    try {
      await paieApi.updateBulletin(editBulletin.id, {
        primes: editForm.primes === '' ? 0 : Number(editForm.primes),
        indemnites: editForm.indemnites === '' ? 0 : Number(editForm.indemnites),
        retenuesDiverses: editForm.retenuesDiverses === '' ? 0 : Number(editForm.retenuesDiverses),
      });
      toast.success('Bulletin modifié');
      setEditBulletin(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la modification');
    } finally { setSaving(false); }
  };
  const confirmerSuppression = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await paieApi.deleteBulletin(deleteTarget.id);
      toast.success('Bulletin supprimé');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la suppression');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  const filtreNom = norm(recherche);
  const filtered = bulletins.filter(b =>
    b.mois === mois && b.annee === annee &&
    (!departementId || String(b.departementId) === String(departementId)) &&
    (!filtreNom || norm(b.employeNom).includes(filtreNom))
  ).sort((a, b) => String(a.employeNom).localeCompare(String(b.employeNom)));

  // Totaux dynamiques filtrés (période + département + recherche)
  const totalBrut = filtered.reduce((s, b) => s + (Number(b.brut) || 0), 0);
  const totalRetenues = filtered.reduce((s, b) => s + (Number(b.totalRetenues) || 0), 0);

  // Bulletins en retard / impayés — cycle 22 → 22 du mois suivant.
  // Un employé actif présent sur la période, sans bulletin, et dont le cycle est échu → en retard.
  const bulletinsParEmploye = new Set(
    bulletins.filter(b => b.mois === mois && b.annee === annee).map(b => String(b.employeId))
  );
  const finPeriode = new Date(annee, mois, 0, 23, 59, 59);      // dernier jour du mois de la période
  const cycleAcheve = new Date(annee, mois, 22) <= new Date();  // 22 du mois suivant atteint
  const employesActifs = employes.filter(e => e.actif);
  const employesAttendus = employesActifs.filter(e =>
    (!departementId || String(e.departementId) === String(departementId)) &&
    (!e.dateEmbauche || new Date(e.dateEmbauche) <= finPeriode)
  );
  const nbEnRetard = cycleAcheve
    ? employesAttendus.filter(e => !bulletinsParEmploye.has(String(e.id))).length
    : 0;

  const columns = [
    { key: 'employeNom', label: 'Employé', render: v => <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { key: 'departementNom', label: 'Département', render: v => v ? <Badge variant="info" size="sm">{v}</Badge> : '—' },
    { key: 'posteNom', label: 'Poste', render: v => v || '—' },
    { key: 'brut', label: 'Salaire brut', render: v => fmt(v) },
    { key: 'totalRetenues', label: 'Retenues', render: v => <Badge variant="danger" size="sm">- {fmt(v)}</Badge> },
    { key: 'netAPayer', label: 'Net à payer', render: v => <strong style={{ color: 'var(--color-success)' }}>{fmt(v)}</strong> },
    { key: 'mois', label: 'Période', render: (v, row) => `${MOIS[(row.mois || 1) - 1].slice(0, 3)} ${row.annee}` },
    { key: 'actions', label: 'Actions', align: 'right', render: (v, row) => (
      estGestion ? (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={(ev) => ev.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={() => ouvrirModifier(row)}>
            <Pencil size={13} />&nbsp;Modifier
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>
            <Trash2 size={13} />&nbsp;Supprimer
          </Button>
        </div>
      ) : null
    )},
    { key: 'id', label: estGestion ? '' : 'Actions', align: 'right', render: (v, row) => (
      <Button size="sm" variant="secondary" onClick={(ev) => { ev.stopPropagation(); downloadPdf(row); }}>
        <Download size={14} />&nbsp;PDF
      </Button>
    )},
  ];

  return (
    <Flex direction="column" gap={20}>
      <PageHeader title="Bulletins de paie" subtitle="Standard camerounais (CNPS, IRPP, PVID, CFC)"/>
      <Card padding={20}>
        <Flex wrap gap={14} align="flex-end">
          <Flex direction="column" style={{ minWidth:160 }}>
            <Select label="Mois" value={mois} onChange={e=>setMois(Number(e.target.value))}
              options={MOIS.map((m,i)=>({ value:i+1, label:m }))}/>
          </Flex>
          <Flex direction="column" style={{ minWidth:120 }}>
            <Input label="Année" type="number" value={annee}
              onChange={e=>setAnnee(Number(e.target.value))} min={2020} max={2100}/>
          </Flex>
          {estGestion && (
            <Flex direction="column" style={{ minWidth:180 }}>
              <Select label="Département" value={departementId} onChange={e=>setDepartementId(e.target.value)} placeholder={null}
                options={[{ value:'', label:'Tous les départements' }, ...departements.map(d=>({ value:String(d.id), label:d.name }))]}/>
            </Flex>
          )}
          {estGestion && (
            <Flex direction="column" style={{ minWidth:200 }}>
              <Input label="Rechercher par nom" value={recherche} placeholder="Nom de l'employé"
                leftIcon={<Search size={15}/>} onChange={e=>setRecherche(e.target.value)}/>
            </Flex>
          )}
        </Flex>
      </Card>

      <StatsGrid cols={4}>
        <StatCard title="Bulletins (période)" value={filtered.length} icon={<FileText size={22}/>} color="var(--color-primary)"/>
        <StatCard title="Salaire brut total" value={fmt(totalBrut)} icon={<Wallet size={22}/>} color="var(--color-info)"/>
        <StatCard title="Total retenu" value={fmt(totalRetenues)} icon={<TrendingDown size={22}/>} color="var(--color-danger)"/>
        <StatCard title="Bulletins en retard" value={nbEnRetard} icon={<AlertTriangle size={22}/>} color={nbEnRetard>0 ? 'var(--color-warning)' : 'var(--color-success)'}/>
      </StatsGrid>

      <Card padding={0}>
        <Flex align="center" gap={8} style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-default)', fontSize:13, color:'var(--text-muted)' }}>
          <Users size={14}/> {filtered.length} bulletin(s) pour {MOIS[mois-1]} {annee}
          {departementId && <Badge variant="info" size="sm">{departements.find(d=>String(d.id)===String(departementId))?.name || 'Département'}</Badge>}
          {recherche && <Badge variant="default" size="sm">« {recherche} »</Badge>}
        </Flex>
        {filtered.length === 0 && !loading ? (
          <Empty title="Aucun bulletin" description="Aucun bulletin pour les filtres actuels."/>
        ) : (
          <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun bulletin pour la période" onRowClick={openFiche} />
        )}
      </Card>

      <Drawer open={!!detailBulletin} onClose={fermerFiche} width={660}
        title={`Fiche de paie — ${detailBulletin?.employeNom || ''}`}>
        {detailBulletin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ficheLoading ? (
              <Empty title="Chargement…" description="Analyse des pointages du mois" />
            ) : ficheErr ? (
              <Alert variant="danger">{ficheErr}</Alert>
            ) : !ficheData ? (
              <Empty title="Aucune donnée" description="Aucune donnée de pointage pour cette période" />
            ) : (
              <>
                {/* Identité (mentions légales) */}
                <Card padding={14}>
                  <SectionTitle>A. Identité</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <InfoRow label="NUI" value={ficheData.nui} />
                    <InfoRow label="RIB" value={ficheData.rib} />
                    <InfoRow label="Salaire brut" value={fmtFa(ficheData.salaireBase)} />
                    <InfoRow label="Période" value={moisfmt(ficheData.mois, ficheData.annee)} />
                  </div>
                </Card>

                {/* B. Détail du mois */}
                <Card padding={14}>
                  <SectionTitle>B. Détail du mois</SectionTitle>
                  <StatsGrid cols={4}>
                    <StatCard title="Jours ouvrables" value={ficheData.joursOuvres} color="#3B82F6" />
                    <StatCard title="Jours présents" value={ficheData.joursPresents} color="#10B981" />
                    <StatCard title="Jours absents" value={ficheData.joursManquants} color="#EF4444" />
                    <StatCard
                      title="Taux journalier"
                      value={ficheData.salaireBase > 0 && ficheData.joursOuvres > 0
                        ? Math.round(Number(ficheData.salaireBase) / ficheData.joursOuvres).toLocaleString('fr-FR') + ' FCFA'
                        : '—'}
                      color="#8B5CF6"
                    />
                  </StatsGrid>
                  {ficheData.avertissements && ficheData.avertissements.length > 0 && (
                    <Alert variant="warning">{ficheData.avertissements.join('. ')}</Alert>
                  )}
                </Card>

                {/* D. Éléments variables + génération */}
                <Card padding={14}>
                  <SectionTitle>D. Éléments variables</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {estGestion && (
                      <FormRow>
                        <Input label="Primes (FCFA)" type="number" min={0} value={ficheVar.primes}
                          onChange={e => setFicheVar(v => ({ ...v, primes: e.target.value }))} placeholder="ex: 10000" />
                        <Input label="Motif de l'indemnité" type="text" value={ficheVar.motif}
                          onChange={e => setFicheVar(v => ({ ...v, motif: e.target.value }))} placeholder="ex: indemnité de transport" />
                      </FormRow>
                    )}
                    {(() => {
                      const salaire = Number(ficheData.salaireBase || 0);
                      const primes = ficheVar.primes !== '' && !isNaN(Number(ficheVar.primes)) ? Number(ficheVar.primes) : 0;
                      const brut = salaire + primes;
                      const abs = Number(ficheData.retenuesAbsences || 0);
                      const ret = Number(ficheData.retenuesRetards || 0);
                      const c = calcCotisations(brut, salaire);
                      const totalRetenues = c.cnps + c.pvid + c.cfc + c.irpp + abs + ret;
                      const net = brut - totalRetenues;
                      return (
                        <>
                          <FormRow>
                            <Input label="CNPS salariale (4,4 %)" value={fmtFa(Math.round(c.cnps))} readOnly />
                            <Input label="PVID (1,75 %)" value={fmtFa(Math.round(c.pvid))} readOnly />
                          </FormRow>
                          <FormRow>
                            <Input label="CFC (0,11 %)" value={fmtFa(Math.round(c.cfc))} readOnly />
                            <Input label="IRPP (barème progressif)" value={fmtFa(Math.round(c.irpp))} readOnly />
                          </FormRow>
                          <FormRow>
                            <Input label="(absences / retards)" value={fmtFa(abs + ret)} readOnly
                              hint={`= Jours absents (${ficheData.joursManquants}) × Taux journalier (${ficheData.joursOuvres > 0 ? fmtFa(Math.round(salaire / ficheData.joursOuvres)) : '—'}) + retards ${fmtFa(ret)}`} />
                          </FormRow>
                          <Input label="Net à payer" value={fmtFa(Math.round(net))} readOnly
                            hint={`Brut ${fmtFa(brut)} − total retenues ${fmtFa(Math.round(totalRetenues))}`} />
                        </>
                      );
                    })()}
                    {ficheErr && <Alert variant="danger">{ficheErr}</Alert>}
                    <Button variant="secondary" style={{ width: '100%' }} onClick={() => downloadPdf(detailBulletin)}>
                      <Download size={16} /> Télécharger le PDF existant
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* Modal de modification d'un bulletin */}
      <Modal open={!!editBulletin} onClose={() => setEditBulletin(null)}
        title={`Modifier le bulletin — ${editBulletin?.employeNom || ''}`} width={480}
        footer={
          <Flex justify="flex-end" gap={10}>
            <Button variant="secondary" onClick={() => setEditBulletin(null)}>Annuler</Button>
            <Button onClick={enregistrerModif} loading={saving} loadingText="Enregistrement…">Enregistrer</Button>
          </Flex>
        }>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Le brut, les cotisations (CNPS, IRPP, PVID, CFC, TPR) et le net à payer sont recalculés automatiquement.
        </p>
        <FormRow>
          <Input label="Primes (FCFA)" type="number" min={0} value={editForm.primes}
            onChange={e => setEditForm(f => ({ ...f, primes: e.target.value }))} />
          <Input label="Indemnités (FCFA)" type="number" min={0} value={editForm.indemnites}
            onChange={e => setEditForm(f => ({ ...f, indemnites: e.target.value }))} />
        </FormRow>
        <Input label="Retenues diverses (absences + retards)" type="number" min={0} value={editForm.retenuesDiverses}
          onChange={e => setEditForm(f => ({ ...f, retenuesDiverses: e.target.value }))} />
      </Modal>

      {/* Confirmation de suppression */}
      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmerSuppression}
        loading={deleting}
        title="Supprimer le bulletin"
        message={`Supprimer définitivement le bulletin de ${deleteTarget?.employeNom} pour ${MOIS[(deleteTarget?.mois || 1) - 1]} ${deleteTarget?.annee} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
      />
    </Flex>
  );
}
