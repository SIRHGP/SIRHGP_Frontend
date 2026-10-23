import { useState, useEffect, useCallback } from 'react';
import { Activity, Eye, Filter, RefreshCw, Clock, User, CalendarDays, CalendarRange, CalendarClock, Download, AlertTriangle } from 'lucide-react';
import { auditApi, employerApi, entrepriseApi } from '../../Api';
import { PageHeader, Card, Table, Badge, Button, SearchInput, Select, StatCard, StatsGrid, Pagination, Modal, IconBox, Flex, KeyText, Alert } from '../../components/ui';
import { useAuth } from '../../contexts/Authcontext';
import toast from 'react-hot-toast';

const ACTION_STYLES = {
  LOGIN: { variant: 'success', label: 'Connexion' },
  LOGOUT: { variant: 'default', label: 'Déconnexion' },
  LOGIN_FAILED: { variant: 'danger', label: 'Échec connexion' },
  CREATE: { variant: 'success', label: 'Création' },
  READ: { variant: 'info', label: 'Consultation' },
  UPDATE: { variant: 'warning', label: 'Modification' },
  DELETE: { variant: 'danger', label: 'Suppression' },
  TOGGLE_STATUS: { variant: 'warning', label: 'Activer/Désactiver' },
  CHANGE_PASSWORD: { variant: 'warning', label: 'Changement MDP' },
  DOWNLOAD: { variant: 'info', label: 'Téléchargement' },
  UPLOAD: { variant: 'info', label: 'Téléversement' },
  ASSIGN: { variant: 'primary', label: 'Assignation' },
  DISPATCH: { variant: 'primary', label: 'Dispatch' },
  TRANSFER: { variant: 'primary', label: 'Transfert' },
  COMPLETE: { variant: 'success', label: 'Complétion' },
  OTHER: { variant: 'default', label: 'Autre' },
};

// Périodes de filtrage
const PERIODS = [
  { value: 'DAY', label: 'Aujourd\'hui', icon: CalendarDays },
  { value: 'WEEK', label: 'Cette semaine', icon: CalendarRange },
  { value: 'MONTH', label: 'Ce mois', icon: CalendarClock },
];

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDuration = (ms) => {
  if (ms == null) return '—';
  if (ms < 1000) return ms + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
};

export default function Audit() {
  const { user } = useAuth();
  // sont scopés côté serveur (le paramètre serait ignoré), inutile de l'afficher.
  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionType, setActionType] = useState('');
  const [userId, setUserId] = useState('');
  const [period, setPeriod] = useState('MONTH'); // Par défaut : ce mois
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [users, setUsers] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [anomalies, setAnomalies] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [entrepriseId, setEntrepriseId] = useState('');
  const [entreprises, setEntreprises] = useState([]);

  useEffect(() => {
    auditApi.anomalies().then(r => setAnomalies(r.data?.data || r.data)).catch(() => setAnomalies(null));
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    entrepriseApi.getAll({ page: 0, size: 200 }).then(r => {
      const d = r.data?.data || r.data;
      setEntreprises(Array.isArray(d) ? d : d?.content || []);
    }).catch(() => setEntreprises([]));
  }, [isSuperAdmin]);

  const handleExport = async () => {
    try {
      const res = await auditApi.export({ format: exportFormat, entrepriseId: entrepriseId || undefined });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `audit.${exportFormat}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Export ${exportFormat.toUpperCase()} généré`);
    } catch { toast.error('Export impossible'); }
  };

  // Fonctions de chargement (sans setState synchrone au début)
  const loadStats = useCallback(async () => {
    try {
      const res = await auditApi.getStats({ period });
      const d = res.data?.data || res.data;
      setStats(d);
    } catch (err) {
      console.error('Erreur stats audit:', err);
    }
  }, [period]);

  const load = useCallback(async () => {
    try {
      const params = { page, size: 20, period };
      if (actionType) params.actionType = actionType;
      if (userId) params.userId = userId;
      if (search) params.search = search;
      if (entrepriseId) params.entrepriseId = entrepriseId;
      const res = await auditApi.search(params);
      const d = res.data?.data || res.data;
      setLogs(Array.isArray(d) ? d : d?.content || []);
      setTotalPages(d?.totalPages || 0);
      setTotalElements(d?.totalElements || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur chargement');
    }
  }, [page, actionType, userId, period, search, entrepriseId]);

  // Debouncing de la recherche (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        setPage(0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // Chargement initial
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats().finally(() => setStatsLoading(false));
  }, [loadStats]);

  // Charger les types d'actions
  useEffect(() => {
    auditApi.getActionTypes().then(r => {
      const d = r.data?.data || r.data;
      setActionTypes(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  // Charger les utilisateurs
  useEffect(() => {
    employerApi.getAll({ page: 0, size: 200 }).then(r => {
      const d = r.data?.data || r.data;
      setUsers(Array.isArray(d) ? d : d?.content || []);
    }).catch(() => {});
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setStatsLoading(true);
    load().finally(() => setLoading(false));
    loadStats().finally(() => setStatsLoading(false));
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    setPage(0);
    setLoading(true);
    setStatsLoading(true);
  };

  const handleActionTypeChange = (e) => {
    setActionType(e.target.value);
    setPage(0);
    setLoading(true);
  };

  const handleUserChange = (e) => {
    setUserId(e.target.value);
    setPage(0);
    setLoading(true);
  };

  const handleEntrepriseChange = (e) => {
    setEntrepriseId(e.target.value);
    setPage(0);
    setLoading(true);
  };

  const handlePageChange = (p) => {
    setPage(p);
    setLoading(true);
  };

  const resetFilters = () => {
    setSearch('');
    setSearchInput('');
    setActionType('');
    setUserId('');
    setEntrepriseId('');
    setPeriod('MONTH');
    setPage(0);
    setLoading(true);
    setStatsLoading(true);
  };

  const columns = [
    {
      key: 'timestamp', label: 'Date & heure', nowrap: true,
      render: v => (
        <Flex align="center" gap={8}>
          <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 13 }}>{formatDate(v)}</span>
        </Flex>
      )
    },
    {
      key: 'actionType', label: 'Action',
      render: (v) => {
        const style = ACTION_STYLES[v] || ACTION_STYLES.OTHER;
        return <Badge variant={style.variant} size="sm">{style.label}</Badge>;
      }
    },
    {
      key: 'userName', label: 'Personne responsable',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--color-info-light)', color: 'var(--color-info)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontSize: 11, fontWeight: 600,
          }}>
            {(v || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }}>{v || 'Système'}</p>
            {row.userEmail && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.userEmail}</p>}
            {row.userRole && <Badge size="sm" variant="info" style={{ marginTop: 2 }}>{row.userRole}</Badge>}
          </div>
        </div>
      )
    },
    {
      key: 'actionDescription', label: 'Description',
      render: v => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 250, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {v || '—'}
        </span>
      )
    },
    {
      key: 'entityType', label: 'Entité',
      render: (v, row) => (
        <span style={{ fontSize: 13 }}>{v || '—'}{row.entityId ? ' #' + row.entityId : ''}</span>
      )
    },
    {
      key: 'ipAddress', label: 'IP',
      render: v => <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v || '—'}</span>
    },
    {
      key: 'durationMs', label: 'Durée',
      render: v => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDuration(v)}</span>
    },
    {
      key: 'id', label: '', align: 'right',
      render: (v, row) => (
        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setDetail(row); }}>
          <Eye size={14} />
        </Button>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="Audit & Traçabilité" subtitle="Suivi complet de toutes les actions effectuées sur la plateforme">
        <Button variant="secondary" onClick={handleRefresh}>
          <RefreshCw size={16} /> Actualiser
        </Button>
        <Select
          value={exportFormat}
          onChange={e => setExportFormat(e.target.value)}
          options={[
            { value: 'csv', label: 'CSV' },
            { value: 'json', label: 'JSON' },
          ]}
          aria-label="Format d'export"
          style={{ minWidth: 110 }}
        />
        <Button variant="secondary" onClick={handleExport} title={`Exporter (${exportFormat.toUpperCase()}, scope serveur)`}>
          <Download size={16} /> Exporter
        </Button>
      </PageHeader>

      {anomalies && (anomalies.loginFailures?.length > 0 || anomalies.deleteSpike || anomalies.updateSpike) && (
        <Alert variant="danger" title="Anomalies détectées (fenêtres 24 h / 1 h)" style={{ marginBottom: 16 }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {anomalies.loginFailures?.map(f => (
              <li key={f.email}><AlertTriangle size={12} style={{ marginRight:4 }} />{f.count} échec(s) de connexion — {f.email}</li>
            ))}
            {anomalies.deleteSpike && <li>Pic de suppressions : {anomalies.deletesLastHour} en 1 h</li>}
            {anomalies.updateSpike && <li>Pic de modifications : {anomalies.updatesLastHour} en 1 h</li>}
          </ul>
        </Alert>
      )}

      {anomalies && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px' }}>
          Seuils d'anomalie : {anomalies.seuilLoginFailures24h ?? 5} échec(s) de connexion / 24 h ·{' '}
          {anomalies.seuilDeleteHoraire ?? 20} suppression(s) / h ·{' '}
          {anomalies.seuilUpdateHoraire ?? 100} modification(s) / h
        </p>
      )}

      {/* Sélecteur de période */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {PERIODS.map(p => {
          const Icon = p.icon;
          const active = period === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px',
                border: `1px solid ${active ? 'var(--color-primary)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--color-primary)' : 'var(--bg-surface)',
                color: active ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500,
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={16} />
              {p.label}
            </button>
          );
        })}
      </div>

      <StatsGrid cols={2}>
        <StatCard title="Actions" value={stats?.totalActions ?? '—'} icon={<Activity size={20} />} color="var(--color-primary)" loading={statsLoading} subtitle="Sur la période sélectionnée" />
        <StatCard title="Utilisateurs actifs" value={stats?.topUsers?.length ?? '—'} icon={<User size={20} />} color="var(--color-info)" loading={statsLoading} subtitle="Sur la période sélectionnée" />
      </StatsGrid>

      {/* Statistiques par type d'action avec badges cliquables */}
      {stats?.byActionType && Object.keys(stats.byActionType).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Répartition par type d'action
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(stats.byActionType).map(([key, count]) => {
              const style = ACTION_STYLES[key] || ACTION_STYLES.OTHER;
              const isActive = actionType === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActionType(isActive ? '' : key);
                    setPage(0);
                    setLoading(true);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px',
                    border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--border-default)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--color-primary)' : 'var(--bg-surface)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 600 : 500,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Badge variant={style.variant} size="sm" style={{ background: 'transparent', color: 'inherit', padding: 0, fontSize: 11 }}>
                    {style.label}
                  </Badge>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Card padding={0}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Rechercher..." style={{ flex: 1, minWidth: 180, maxWidth: 280 }} />
          <Select value={actionType} onChange={handleActionTypeChange} options={actionTypes.map(t => ({ value: t.name, label: t.label }))} placeholder="Type d'action" style={{ minWidth: 170 }} />
          <Select value={userId} onChange={handleUserChange} options={users.map(u => ({ value: String(u.id), label: u.name }))} placeholder="Personne responsable" style={{ minWidth: 170 }} />
          {isSuperAdmin && (
            <Select value={entrepriseId} onChange={handleEntrepriseChange} options={entreprises.map(en => ({ value: String(en.id), label: en.name }))} placeholder="Toutes les entreprises" style={{ minWidth: 190 }} />
          )}
          <Button variant="ghost" size="sm" onClick={resetFilters}><Filter size={14} /> Réinitialiser</Button>
        </div>
        <Table columns={columns} data={logs} loading={loading} emptyText="Aucun journal d'audit" onRowClick={setDetail} />
        <div style={{ padding: '8px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalElements > 0 ? totalElements + ' enregistrement(s)' : ''}</span>
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </div>
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Détail du journal d'audit" width={600}>
        {detail && (
          <Flex direction="column" gap={16}>
            <Flex align="center" gap={12} style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-default)' }}>
              <IconBox icon={<Activity size={22} />} color="var(--color-primary)" size={44} radius="var(--radius-lg)" />
              <div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{(ACTION_STYLES[detail.actionType] || ACTION_STYLES.OTHER).label}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(detail.timestamp)}</p>
              </div>
            </Flex>

            {detail.actionDescription && (
              <KeyText title="Description">
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{detail.actionDescription}</span>
              </KeyText>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Personne responsable</p>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{detail.userName || 'Système'}</p>
                {detail.userEmail && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detail.userEmail}</p>}
                {detail.userRole && <Badge size="sm" variant="info" style={{ marginTop: 6 }}>{detail.userRole}</Badge>}
              </div>
              <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Entité</p>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{detail.entityType || '—'}</p>
                {detail.entityId && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {detail.entityId}</p>}
                {detail.entityName && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detail.entityName}</p>}
              </div>
              <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Requête HTTP</p>
                <Flex align="center" gap={8} wrap>
                  {detail.httpMethod && <Badge size="sm" variant="primary">{detail.httpMethod}</Badge>}
                  {detail.requestPath && <span style={{ fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>{detail.requestPath}</span>}
                </Flex>
                {detail.httpStatus > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Statut: {detail.httpStatus}
                  </p>
                )}
              </div>
              <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Informations</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>IP: {detail.ipAddress || '—'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Durée: {formatDuration(detail.durationMs)}</p>
              </div>
            </div>
          </Flex>
        )}
      </Modal>
    </div>
  );
}