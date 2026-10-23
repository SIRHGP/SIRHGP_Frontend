import { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, Pencil, CalendarDays, TrendingUp, CalendarPlus, FileText, Check, X } from 'lucide-react';
import { pointageApi, demandePermissionApi, documentApi } from '../Api';
import { useAuth } from '../contexts/Authcontext';
import { useNotifications } from '../contexts/NotificationContext';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { PageHeader, Card, Button, Modal, Input, StatsGrid, StatCard, Tabs, Flex, Alert, Table, Badge, Select, Textarea, FormRow } from '../components/ui';
import toast from 'react-hot-toast';

const fmtHeure = (dt) => dt ? new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDuree = (min) => {
  if (min == null) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
};
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });

const PERIODES = { jour: { label: 'Jour' }, semaine: { label: 'Semaine' }, mois: { label: 'Mois' } };

const TYPES_PERM = {
  SORTIE: 'Sortie (quelques heures)',
  ABSENCE_JOURNEE: 'Absence (journée(s))',
  CONGE_ANNUEL: 'Congé annuel',
  CONGE_MALADIE: 'Congé maladie',
  PERMISSION_SANS_SOLDE: 'Permission sans solde',
  AUTRE: 'Autre',
};
const STATUT_PERM = {
  EN_ATTENTE: { label: 'En attente', variant: 'warning' },
  APPROUVEE: { label: 'Approuvée', variant: 'success' },
  REJETEE: { label: 'Rejetée', variant: 'danger' },
  ANNULEE: { label: 'Annulée', variant: 'default' },
};
const PERM_VIDE = { type: 'SORTIE', dateDebut: '', dateFin: '', heureDebut: '', heureFin: '', motif: '' };

/** Téléchargement du justificatif en blob (auth Bearer — window.open ne porte pas le token). */
const telechargerJustificatif = async (docId, nom) => {
  try {
    const blob = await documentApi.download(docId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom || `justificatif_${docId}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    // Le justificatif peut avoir été purgé côté serveur : on informe l'utilisateur.
    toast.error('Erreur lors du téléchargement du justificatif');
  }
};

function bornesPeriode(tab) {
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  if (tab === 'jour') { const t = iso(now); return { debut: t, fin: t }; }
  if (tab === 'semaine') {
    const lundi = new Date(now);
    lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const vendredi = new Date(lundi);
    vendredi.setDate(lundi.getDate() + 4);
    return { debut: iso(lundi), fin: iso(vendredi) };
  }
  const debut = new Date(now.getFullYear(), now.getMonth(), 1);
  const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { debut: iso(debut), fin: iso(fin) };
}

export default function Timesheet() {
  const { user } = useAuth();
  const isSecretary = user?.roleName === 'SECRETAIRE';
  const { notifyPermission } = useNotifications();
  const [tab, setTab] = useState('semaine');
  const [aujourdhui, setAujourdhui] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  const [permModal, setPermModal] = useState(false);
  const [permForm, setPermForm] = useState(PERM_VIDE);
  const [permFile, setPermFile] = useState(null);
  const [permError, setPermError] = useState('');
  const [mesPerms, setMesPerms] = useState([]);
  const [aValider, setAValider] = useState([]);
  const [permsLoading, setPermsLoading] = useState(false);
  const [rejetModal, setRejetModal] = useState(null); // demande à rejeter
  const [rejetCommentaire, setRejetCommentaire] = useState('');

  const estWeekend = [0, 6].includes(now.getDay());

  // Horloge murale (affichage seulement, pas un chrono)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAujourdhui = () => pointageApi.aujourdhui()
    .then(r => setAujourdhui(r.data?.data ?? null))
    .catch(() => setAujourdhui(null));

  const loadPeriode = () => {
    const { debut, fin } = bornesPeriode(tab);
    pointageApi.periode({ debut, fin })
      .then(r => { const d = r.data?.data || r.data; setRows(Array.isArray(d) ? d : []); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAujourdhui(); }, []);
  useDeferredTask(loadPeriode, tab);

  const loadPerms = () => {
    const pending = isSecretary
      ? Promise.all([demandePermissionApi.mes()])
      : Promise.all([demandePermissionApi.mes(), demandePermissionApi.aValider()]);
    pending
      .then(([mes, av]) => {
        setMesPerms(mes.data?.data || []);
        setAValider(av?.data?.data || []);
      })
      .catch(() => { setMesPerms([]); setAValider([]); })
      .finally(() => setPermsLoading(false));
  };
  useDeferredTask(loadPerms, isSecretary);

  const setP = (k) => (e) => setPermForm(f => ({ ...f, [k]: e.target.value }));

  /** Upload du justificatif via le module Documents (même pattern que Employes.jsx). */
  const uploadJustificatif = async (file) => {
    const fd = new FormData();
    fd.append('document', new Blob([JSON.stringify({
      nom: `Justificatif_permission_${permForm.dateDebut || ''}`,
      description: `Justificatif de la demande de permission du ${permForm.dateDebut}`,
      type: 'AUTRE',
      publique: false,
    })], { type: 'application/json' }));
    fd.append('fichier', file, file.name);
    const res = await documentApi.uploadJustificatif(fd);
    const d = res?.data?.data || res?.data;
    return d?.id ?? null;
  };

  const soumettrePerm = async (e) => {
    e.preventDefault();
    setPermError('');
    const { type, dateDebut, dateFin, heureDebut, heureFin, motif } = permForm;
    // Validations locales (évite les 400 bruts)
    if (!dateDebut || !dateFin) { setPermError('Les dates de début et de fin sont obligatoires'); return; }
    if (dateFin < dateDebut) { setPermError('La date de fin précède la date de début'); return; }
    if (type === 'SORTIE' && dateDebut !== dateFin) { setPermError('Une sortie est limitée à une seule journée'); return; }
    if (type === 'SORTIE' && (!heureDebut || !heureFin)) { setPermError('Renseignez les heures de début et de fin'); return; }
    if (type === 'SORTIE' && heureFin <= heureDebut) { setPermError("L'heure de fin doit suivre l'heure de début"); return; }
    if (!motif.trim()) { setPermError('Le motif est obligatoire'); return; }
    setBusy(true);
    try {
      let justificatifId = null;
      if (permFile) justificatifId = await uploadJustificatif(permFile);
      const res = await demandePermissionApi.create({
        type, dateDebut, dateFin,
        heureDebut: type === 'SORTIE' ? heureDebut : null,
        heureFin: type === 'SORTIE' ? heureFin : null,
        motif: motif.trim(),
        justificatifId,
      });
      const created = res.data?.data || res.data;
      if (created?.valideurId) {
        notifyPermission({ action: 'demandee', permission: created, targetUserId: created.valideurId });
      }
      toast.success('Demande de permission soumise — elle est en attente de validation');
      setPermModal(false); setPermForm(PERM_VIDE); setPermFile(null);
      loadPerms();
    } catch (err) {
      setPermError(err.response?.data?.message || 'Erreur lors de la soumission');
    } finally { setBusy(false); }
  };

  const decider = async (id, statut, commentaire = null) => {
    setBusy(true);
    try {
      const res = await demandePermissionApi.decider(id, statut, commentaire);
      const updated = res.data?.data || res.data;
      if (updated?.demandeurId) {
        notifyPermission({
          action: statut === 'APPROUVEE' ? 'approuvee' : 'rejetee',
          permission: updated,
          targetUserId: updated.demandeurId,
        });
      }
      toast.success(statut === 'APPROUVEE' ? 'Permission approuvée' : 'Permission rejetée');
      setRejetModal(null); setRejetCommentaire('');
      loadPerms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur décision');
    } finally { setBusy(false); }
  };

  const annuler = async (id) => {
    setBusy(true);
    try { await demandePermissionApi.annuler(id); toast.success('Demande annulée'); loadPerms(); }
    catch (err) { toast.error(err.response?.data?.message || "Erreur d'annulation"); }
    finally { setBusy(false); }
  };

  // câbler annuler() et le chargement du justificatif avec le contexte courant.
  const colonnesPerms = [
    { key: 'type', label: 'Type', render: (v) => TYPES_PERM[v] || v },
    { key: 'dateDebut', label: 'Période', render: (v, r) => (
        <span style={{ fontSize: 13 }}>{v} → {r.dateFin} · {r.dureeJours} j{r.type === 'SORTIE' && r.heureDebut ? ` (${r.heureDebut}–${r.heureFin})` : ''}</span>
      ) },
    { key: 'statut', label: 'Statut', render: (v) => <Badge variant={STATUT_PERM[v]?.variant || 'default'}>{STATUT_PERM[v]?.label || v}</Badge> },
    { key: 'valideurNom', label: 'Valideur', render: (v) => v || <span style={{ color: 'var(--text-muted)' }}>Périmètre ADMIN</span> },
    { key: 'justificatifId', label: 'Justificatif', render: (v, r) => v ? (
        <a href="#" style={{ color: 'var(--color-primary)', fontSize: 13 }}
          onClick={(e) => { e.preventDefault(); telechargerJustificatif(v, r.justificatifNom); }}>
          {r.justificatifNom || 'Télécharger'}
        </a>
      ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span> },
    { key: 'commentaireValideur', label: 'Commentaire', render: (v) => v
        ? <span style={{ fontSize: 13 }}>{v}</span>
        : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span> },
    { key: 'actions', label: '', render: (v, r) => r.statut === 'EN_ATTENTE' ? (
        <Button size="sm" variant="ghost" onClick={() => annuler(r.id)} disabled={busy}>Annuler</Button>
      ) : null },
  ];

  const clockOut = async () => {
    setBusy(true);
    try { await pointageApi.clockOut(); toast.success('Départ enregistré'); loadAujourdhui(); loadPeriode(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur pointage'); }
    finally { setBusy(false); }
  };

  // Totaux de la période
  const complets = rows.filter(r => r.dureeMinutes != null);
  const totalMin = complets.reduce((s, r) => s + r.dureeMinutes, 0);
  const moyenneMin = complets.length ? Math.round(totalMin / complets.length) : null;

  const colonnes = [
    { key: 'date', label: 'Jour', render: (v) => <span style={{ textTransform:'capitalize' }}>{fmtDate(v)}</span> },
    { key: 'arrivee', label: 'Arrivée', render: (v) => <Flex align="center" gap={6}><LogIn size={14} style={{ color:'var(--color-success)' }} />{fmtHeure(v)}</Flex> },
    { key: 'depart', label: 'Départ', render: (v) => <Flex align="center" gap={6}><LogOut size={14} style={{ color:'var(--color-danger)' }} />{v ? fmtHeure(v) : '—'}</Flex> },
    { key: 'id', label: 'Durée', render: (v, r) => <strong style={{ color:'var(--color-primary)' }}>{fmtDuree(r.dureeMinutes)}</strong> },
    { key: 'corrige', label: 'État', render: (v, r) => !r.dureeMinutes
        ? <Badge variant="warning" size="sm">En cours</Badge>
        : v ? <Badge variant="default" size="sm">Corrigé</Badge>
            : r.arriveeAnormale ? <Badge variant="danger" size="sm">Arrivée anormale</Badge>
            : r.retarde ? <Badge variant="warning" size="sm">En retard</Badge>
            : r.departAnticipe ? <Badge variant="warning" size="sm">Départ anticipé</Badge>
            : <Badge variant="success" size="sm">Complet</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Pointage des heures" subtitle="Pointage personnel du départ après l'arrivée enregistrée par la secrétaire" />

      {/* Carte de pointage (badgeuse murale) */}
      <Card style={{ marginBottom: 24, textAlign: 'center' }}>
        <p style={{ textTransform: 'capitalize', color:'var(--text-muted)', fontSize:14, marginBottom:4 }}>
          {fmtDate(now.toISOString().slice(0,10))}
        </p>
        <p style={{ fontFamily:'var(--font-display)', fontSize:56, fontWeight:800, color:'var(--text-primary)', lineHeight:1.1, letterSpacing:-1 }}>
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>

        {estWeekend ? (
          <Alert variant="warning" style={{ maxWidth:420, margin:'12px auto 0' }}>
            Jour non ouvrable : la pointeuse fonctionne du lundi au vendredi.
          </Alert>
        ) : aujourdhui?.depart ? (
          <div style={{ marginTop:16 }}>
            <Badge variant="success" size="lg">Départ enregistré à {fmtHeure(aujourdhui.depart)}</Badge>
          </div>
        ) : aujourdhui ? (
          <Button size="lg" variant="danger" onClick={clockOut} loading={busy}
            style={{ marginTop:16, minWidth:260, padding:'14px' }} leftIcon={<LogOut size={18}/> }>
            Pointer le départ
          </Button>
        ) : (
          <div style={{ marginTop:16 }}>
            <Button size="lg" disabled style={{ minWidth:260, padding:'14px' }} leftIcon={<LogOut size={18}/> }>
              Pointer le départ
            </Button>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:8 }}>L’arrivée doit d’abord être enregistrée par la secrétaire.</p>
          </div>
        )}

        <p style={{ marginTop:12 }}>
            <Button variant="ghost" size="sm" onClick={() => { setPermForm(PERM_VIDE); setPermFile(null); setPermError(''); setPermModal(true); }} leftIcon={<CalendarPlus size={13}/> } color="var(--color-primary)">
              Demander une permission
            </Button>
        </p>
      </Card>

      {!isSecretary && aValider.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Permissions à valider ({aValider.length})</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {user?.roleName === 'LEAD' ? 'Demandes de votre département' : 'Demandes de votre périmètre'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aValider.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{p.demandeurNom || '—'} · {TYPES_PERM[p.type] || p.type}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {p.dateDebut} → {p.dateFin}{p.type === 'SORTIE' && p.heureDebut ? ` · ${p.heureDebut}–${p.heureFin}` : ''} · {p.dureeJours} j
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Motif : {p.motif}</p>
                </div>
                <Flex gap={8}>
                  {p.justificatifId ? (
                    <Button size="sm" variant="ghost" leftIcon={<FileText size={13}/>} onClick={() => telechargerJustificatif(p.justificatifId, p.justificatifNom)}>Justificatif</Button>
                  ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sans justificatif</span>}
                  <Button size="sm" variant="success" leftIcon={<Check size={14}/>} loading={busy} onClick={() => decider(p.id, 'APPROUVEE')}>Approuver</Button>
                  <Button size="sm" variant="danger" leftIcon={<X size={14}/>} onClick={() => setRejetModal(p)}>Rejeter</Button>
                </Flex>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 24 }} padding={0}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Mes demandes de permission</h3>
        </div>
        {permsLoading ? (
          <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
        ) : mesPerms.length === 0 ? (
          <p style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>Aucune demande de permission pour le moment.</p>
        ) : (
          <Table columns={colonnesPerms} data={mesPerms} emptyText="Aucune demande" />
        )}
      </Card>

      {/* Totaux de la période */}
      <StatsGrid cols={3} style={{ marginBottom:24 }}>
        <StatCard title="Heures (période)" value={fmtDuree(totalMin)} icon={<Clock size={22}/>} color="var(--color-primary)" loading={loading} />
        <StatCard title="Jours pointés" value={complets.length} icon={<CalendarDays size={22}/>} color="var(--color-success)" loading={loading} />
        <StatCard title="Moyenne / jour" value={moyenneMin != null ? fmtDuree(moyenneMin) : '—'} icon={<TrendingUp size={22}/>} color="var(--color-info)" loading={loading} />
      </StatsGrid>

      {/* Historique */}
      <Card padding={0}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-default)' }}>
          <Tabs active={tab} onChange={setTab} tabs={Object.entries(PERIODES).map(([k, v]) => ({ key:k, label:v.label }))} />
        </div>
        <Table columns={colonnes} data={rows} loading={loading} emptyText="Aucun pointage sur cette période" />
      </Card>



      <Modal open={permModal} onClose={() => setPermModal(false)} title="Demande de permission" width={520}
        footer={<Flex justify='flex-end' gap={10}>
          <Button variant="secondary" onClick={() => setPermModal(false)}>Annuler</Button>
          <Button onClick={soumettrePerm} loading={busy}>Soumettre</Button>
        </Flex>}>
        <form onSubmit={soumettrePerm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {permError && <Alert variant="danger">{permError}</Alert>}
          <Alert variant="info" style={{ fontSize: 12 }}>
            Votre demande sera soumise au manager de votre succursale ou, si aucun manager actif n’est disponible, à un administrateur de votre entreprise.
          </Alert>
          <FormRow>
            <Select label="Type de permission *" value={permForm.type} onChange={setP('type')}
              options={Object.entries(TYPES_PERM).map(([k, v]) => ({ value: k, label: v }))} />
            <Input label="Durée (calculée)" value={
              permForm.dateDebut && permForm.dateFin && permForm.dateFin >= permForm.dateDebut
                ? (permForm.type === 'SORTIE' ? '1 jour (heures)' : `${Math.round((new Date(permForm.dateFin) - new Date(permForm.dateDebut)) / 86400000) + 1} jour(s)`)
                : '—'} disabled />
          </FormRow>
          <FormRow>
            <Input label="Date de début *" type="date" value={permForm.dateDebut} onChange={setP('dateDebut')} required />
            <Input label="Date de fin *" type="date" value={permForm.dateFin} onChange={setP('dateFin')} required />
          </FormRow>
          {permForm.type === 'SORTIE' && (
            <FormRow>
              <Input label="Heure de début *" type="time" value={permForm.heureDebut} onChange={setP('heureDebut')} required />
              <Input label="Heure de fin *" type="time" value={permForm.heureFin} onChange={setP('heureFin')} required />
            </FormRow>
          )}
          <Textarea label="Motif *" value={permForm.motif} onChange={setP('motif')} rows={3}
            placeholder="Expliquez brièvement le motif de votre demande…" />
          <div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--color-primary)' }}>
              <FileText size={14} />
              {permFile ? `Justificatif : ${permFile.name}` : 'Joindre un justificatif (optionnel)'}
              <input type="file" hidden accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => { setPermFile(e.target.files?.[0] || null); e.target.value = ''; }} />
            </label>
          </div>
        </form>
      </Modal>

      <Modal open={!!rejetModal} onClose={() => setRejetModal(null)} title="Rejeter la demande" width={460}
        footer={<Flex justify='flex-end' gap={10}>
          <Button variant="secondary" onClick={() => setRejetModal(null)}>Retour</Button>
          <Button variant="danger" loading={busy} disabled={!rejetCommentaire.trim()}
            onClick={() => decider(rejetModal.id, 'REJETEE', rejetCommentaire.trim())}>Rejeter</Button>
        </Flex>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rejetModal && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Demande de <strong>{rejetModal.demandeurNom}</strong> ({TYPES_PERM[rejetModal.type]}, {rejetModal.dateDebut} → {rejetModal.dateFin}).
            </p>
          )}
          <Textarea label="Commentaire de rejet (obligatoire, transmis au demandeur)" value={rejetCommentaire}
            onChange={e => setRejetCommentaire(e.target.value)} rows={3} placeholder="Motif du refus…" />
        </div>
      </Modal>
    </div>
  );
}
