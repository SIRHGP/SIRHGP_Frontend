import { useEffect, useMemo, useState } from 'react';
import { Download, LogIn, Search, Users } from 'lucide-react';
import { Button, Card, Input, PageHeader, Table, Badge } from '../components/ui';
import api, { pointageApi } from '../Api';
import { useAuth } from '../contexts/Authcontext';
import toast from 'react-hot-toast';

const moisCourant = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const formatHeure = (value) => value ? value.slice(11, 16) : '—';

export default function SecretariatPointage() {
  const { user } = useAuth();
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [mois, setMois] = useState(moisCourant);
  const [departBusy, setDepartBusy] = useState(false);

  const charger = async () => {
    setLoading(true);
    try {
      const res = await api.get('/secretariat/employes');
      setEmployes(res.data?.data || []);
    } catch {
      toast.error('Impossible de charger les employés de votre succursale');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    api.get('/secretariat/employes')
      .then(res => { if (active) setEmployes(res.data?.data || []); })
      .catch(() => { if (active) toast.error('Impossible de charger les employés de votre succursale'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Le départ est pointé depuis la Timesheet personnelle de chaque employé.
  // Rafraîchir la liste périodiquement pour afficher ce pointage sans action secrétaire.
  useEffect(() => {
    const interval = window.setInterval(() => {
      api.get('/secretariat/employes')
        .then(res => setEmployes(res.data?.data || []))
        .catch(() => {});
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const pointer = async (employe) => {
    setBusyId(employe.id);
    try {
      await api.post(`/secretariat/employes/${employe.id}/arrivee`);
      toast.success(`Arrivée enregistrée pour ${employe.name}`);
      await charger();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible d’enregistrer cette arrivée');
    } finally { setBusyId(null); }
  };

  const pointerMonDepart = async () => {
    setDepartBusy(true);
    try {
      await pointageApi.clockOut();
      toast.success('Votre départ est enregistré');
      await charger();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Impossible d’enregistrer votre départ');
    } finally { setDepartBusy(false); }
  };

  const telechargerRapport = async () => {
    try {
      const res = await api.get('/secretariat/rapport-mensuel', { params: { mois }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `presences-${mois}.pdf`;
      lien.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Impossible de générer le rapport mensuel');
    }
  };

  const rows = useMemo(() => employes.filter(e =>
    !recherche || `${e.name} ${e.email} ${e.posteName || ''}`.toLowerCase().includes(recherche.toLowerCase())
  ), [employes, recherche]);

  const columns = [
    { key: 'name', label: 'Employé', render: (v, e) => <div><strong>{v}</strong><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.email}</div></div> },
    { key: 'posteName', label: 'Poste', render: v => v || '—' },
    { key: 'heureArrivee', label: 'Arrivée aujourd’hui', render: v => v ? <Badge variant="success">{formatHeure(v)}</Badge> : <Badge variant="default">Non pointée</Badge> },
    { key: 'heureDepart', label: 'Départ aujourd’hui', render: v => v ? <Badge variant="danger">{formatHeure(v)}</Badge> : <Badge variant="default">Non pointé</Badge> },
    { key: 'departPersonnel', label: '', align: 'right', render: (_, e) => String(e.id) === String(user?.id) && e.heureArrivee && !e.heureDepart
      ? <Button size="sm" variant="danger" loading={departBusy} disabled={departBusy} onClick={pointerMonDepart}>Pointer mon départ</Button>
      : null },
    { key: 'id', label: '', align: 'right', render: (_, e) => <Button size="sm" disabled={!!e.heureArrivee || busyId === e.id} loading={busyId === e.id} onClick={() => pointer(e)}><LogIn size={15} />{e.heureArrivee ? 'Arrivée enregistrée' : 'Pointer l’arrivée'}</Button> },
  ];

  return <div>
    <PageHeader title="Présences des employés" subtitle="Enregistrez l’arrivée des employés de votre succursale.">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <Input label="Mois du rapport" type="month" value={mois} onChange={e => setMois(e.target.value)} />
        <Button variant="secondary" disabled={!mois} onClick={telechargerRapport}><Download size={16} /> Télécharger le PDF</Button>
      </div>
    </PageHeader>
    <Card padding={0}>
      <div style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--border-default)' }}>
        <Users size={18} color="var(--color-primary)" />
        <strong>{employes.length} employé{employes.length === 1 ? '' : 's'} actif{employes.length === 1 ? '' : 's'}</strong>
        <div style={{ marginLeft: 'auto', position: 'relative', width: 300, maxWidth: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un employé…" style={{ width: '100%', padding: '9px 10px 9px 32px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
        </div>
      </div>
      <Table columns={columns} data={rows} loading={loading} emptyText="Aucun employé trouvé dans cette succursale" />
    </Card>
  </div>;
}
