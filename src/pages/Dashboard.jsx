import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Building2, Briefcase, FolderKanban, CheckSquare, FileText, Calendar,
  Wallet, UserPlus, FolderOpen, Clock, Target, History, Shield, Award, Zap,
  Globe, TrendingUp, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, StatCard, StatsGrid, Badge, Avatar, Button, Empty } from '../components/ui';
import {
  projetApi, tacheApi, employerApi, departementApi, posteApi, factureApi,
  evenementApi, auditApi, evaluationApi,
} from '../Api';
import { canAccess } from '../roles';
import { useAuth } from '../contexts/Authcontext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PIE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1', '#EC4899', '#14B8A6'];

const STATUT_BADGE = {
  A_FAIRE:    { label: 'À faire',    variant: 'default' },
  EN_COURS:   { label: 'En cours',   variant: 'info' },
  TERMINEE:   { label: 'Terminée',   variant: 'success' },
  EN_ATTENTE: { label: 'En attente', variant: 'warning' },
  PLANIFIE:   { label: 'Planifié',   variant: 'default' },
  EN_RETARD:  { label: 'En retard',  variant: 'danger' },
  ANNULE:     { label: 'Annulé',     variant: 'danger' },
  TERMINE:    { label: 'Terminé',    variant: 'success' },
  BROUILLON:  { label: 'Brouillon',  variant: 'default' },
  SOUMISE:    { label: 'Soumise',    variant: 'warning' },
  VALIDEE:    { label: 'Validée',    variant: 'success' },
  REFUSEE:    { label: 'Refusée',    variant: 'danger' },
};

// Accès rapides — un lien par feature ; filtré par `canAccess` (roles.js),
// donc toujours en parité avec la garde RoleRoute et le menu Sidebar.
const SECTIONS = [
  { id: 'employes',     label: 'Employés',     icon: Users,        to: '/employes',          feature: 'employes' },
  { id: 'projets',      label: 'Projets',      icon: FolderKanban, to: '/projets',           feature: 'projets' },
  { id: 'taches',       label: 'Tâches',       icon: CheckSquare,  to: '/taches',            feature: 'taches' },
  { id: 'evaluations',  label: 'Évaluations',  icon: Target,       to: '/evaluations',       feature: 'evaluations' },
  { id: 'departements', label: 'Départements', icon: Building2,    to: '/departements',      feature: 'departements' },
  { id: 'postes',       label: 'Postes',       icon: Briefcase,    to: '/postes',            feature: 'postes' },
  { id: 'timesheet',    label: 'Timesheet',    icon: Clock,        to: '/timesheet',         feature: 'timesheet' },
  { id: 'factures',     label: 'Factures',     icon: FileText,     to: '/factures',          feature: 'factures' },
  { id: 'evenements',   label: 'Événements',   icon: Calendar,     to: '/evenements',        feature: 'evenements' },
  { id: 'documents',    label: 'Documents',    icon: FolderOpen,   to: '/documents',         feature: 'documents' },
  { id: 'paie',         label: 'Paie',         icon: Wallet,       to: '/paie',              feature: 'paie' },
  { id: 'recrutement',  label: 'Recrutement',  icon: UserPlus,     to: '/recrutement',       feature: 'recrutement' },
  { id: 'audit',        label: 'Audit',        icon: History,      to: '/admin/audit',       feature: 'audit' },
  { id: 'entreprises',  label: 'Entreprises',  icon: Zap,          to: '/admin/entreprises', feature: 'entreprises' },
  { id: 'plateforme',   label: 'Plateforme',   icon: Globe,        to: '/admin/plateforme',  feature: 'plateforme' },
  { id: 'roles',        label: 'Rôles',        icon: Shield,       to: '/admin/roles',       feature: 'roles' },
  { id: 'permissions',  label: 'Permissions',  icon: Award,        to: '/admin/permissions', feature: 'permissions' },
];

// Métadonnées des statistiques (libellé, icône, couleur).
const STAT_META = {
  employes:     { label: 'Employés',     icon: <Users size={20} />,        color: 'var(--color-primary)' },
  departements: { label: 'Départements', icon: <Building2 size={20} />,    color: 'var(--color-accent)' },
  projets:      { label: 'Projets',      icon: <FolderKanban size={20} />, color: 'var(--color-info)' },
  postes:       { label: 'Postes',       icon: <Briefcase size={20} />,    color: 'var(--color-warning)' },
  factures:     { label: 'Factures',     icon: <FileText size={20} />,     color: 'var(--color-success)' },
  evenements:   { label: 'Événements',   icon: <Calendar size={20} />,     color: 'var(--color-danger)' },
  audits:       { label: 'Audits',       icon: <Shield size={20} />,       color: 'var(--color-secondary)' },
};

// Configuration par rôle : stats affichées, nombre d'accès rapides et cartes.
const ROLE_CONFIG = {
  LEAD: {
    title: 'Pilotage de département',
    scope: 'Département',
    stats: ['employes', 'departements', 'projets', 'postes'],
    maxSections: 6,
    cards: ['projets', 'taches', 'evaluations', 'activite'],
  },
  MANAGER: {
    title: 'Pilotage de succursale',
    scope: 'Succursale',
    stats: ['employes', 'projets', 'factures', 'evenements'],
    maxSections: 8,
    cards: ['projets', 'taches', 'evaluations', 'activite'],
  },
  ADMIN: {
    title: "Vue d'ensemble de l'entreprise",
    scope: 'Entreprise',
    stats: ['employes', 'departements', 'projets', 'postes', 'factures', 'evenements', 'audits'],
    maxSections: 10,
    cards: ['projets', 'evaluations', 'activite', 'chart'],
  },
  SUPER_ADMIN: {
    title: 'Opérations plateforme',
    scope: 'Plateforme',
    stats: ['audits'],
    maxSections: 6,
    cards: ['activite', 'chart'],
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.roleName || 'ADMIN';
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.ADMIN;

  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    employes: 0, departements: 0, projets: 0, postes: 0,
    factures: 0, evenements: 0, audits: 0,
  });
  const [stats, setStats] = useState(null);
  const [projets, setProjets] = useState([]);
  const [taches, setTaches] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [statsByStatut, setStatsByStatut] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const request = (feature, call) => canAccess(user, feature)
          ? call()
          : Promise.reject(new Error(`Feature inaccessible: ${feature}`));
        const [empRes, depRes, projRes, posteRes, factRes, evtRes, auditRes, dashRes, projListRes, tacheListRes, statutRes, recentAuditRes, evalRes] = await Promise.allSettled([
          request('employes', () => employerApi.getAll({ page: 0, size: 1 })),
          request('departements', () => departementApi.getAll({ page: 0, size: 1 })),
          request('projets', () => projetApi.getAll({ page: 0, size: 1 })),
          request('postes', () => posteApi.getAll({ page: 0, size: 1 })),
          request('factures', () => factureApi.getAll({ page: 0, size: 1 })),
          request('evenements', () => evenementApi.getAll({ page: 0, size: 1 })),
          request('audit', () => auditApi.getAll({ page: 0, size: 1 })),
          request('projets', () => projetApi.getDashboardGlobal()),
          request('projets', () => projetApi.getAll({ page: 0, size: 5 })),
          request('taches', () => tacheApi.getAll({ page: 0, size: 6 })),
          request('projets', () => projetApi.getStatsByStatut()),
          request('audit', () => auditApi.getAll({ page: 0, size: 8 })),
          request('evaluations', () => evaluationApi.getAll({ page: 0, size: 5 })),
        ]);

        const extractTotal = (res) => {
          if (res.status !== 'fulfilled') return 0;
          const d = res.value.data?.data ?? res.value.data;
          return d?.totalElements ?? (Array.isArray(d) ? d.length : 0);
        };
        const extractList = (res) => {
          if (res.status !== 'fulfilled') return [];
          const d = res.value.data?.data ?? res.value.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.content)) return d.content;
          if (Array.isArray(d?.data)) return d.data;
          return [];
        };

        setTotals({
          employes: extractTotal(empRes),
          departements: extractTotal(depRes),
          projets: extractTotal(projRes),
          postes: extractTotal(posteRes),
          factures: extractTotal(factRes),
          evenements: extractTotal(evtRes),
          audits: extractTotal(auditRes),
        });

        if (dashRes.status === 'fulfilled') setStats(dashRes.value.data?.data ?? dashRes.value.data);
        setProjets(extractList(projListRes).slice(0, 5));
        setTaches(extractList(tacheListRes).slice(0, 6));
        setEvaluations(extractList(evalRes).slice(0, 5));
        setRecentAudits(extractList(recentAuditRes).slice(0, 6));
        if (statutRes.status === 'fulfilled') {
          const raw = statutRes.value.data?.data ?? statutRes.value.data ?? {};
          setStatsByStatut(
            Array.isArray(raw)
              ? raw
              : Object.entries(raw).map(([name, value]) => ({ name, value: Number(value) || 0 }))
          );
        }
      } catch { /* chargement partiel : les cartes vides affichent leur état vide */ }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  const sections = SECTIONS
    .filter((s) => canAccess(user, s.feature))
    .slice(0, cfg.maxSections);

  const evaluationsPending = evaluations.filter(
    (e) => e?.statut === 'SOUMISE' || e?.statut === 'EN_ATTENTE'
  ).length;

  // Données du graphique d'activité : réel si l'API dashboard global l'expose,
  // sinon repli sur une série mockée pour ne jamais laisser un trou dans la carte.
  const activityData = Array.isArray(stats?.activiteMensuelle) && stats.activiteMensuelle.length
    ? stats.activiteMensuelle
    : [
        { mois: 'Jan', projets: 3, taches: 12 }, { mois: 'Fév', projets: 5, taches: 18 },
        { mois: 'Mar', projets: 4, taches: 24 }, { mois: 'Avr', projets: 7, taches: 30 },
        { mois: 'Mai', projets: 6, taches: 28 }, { mois: 'Jun', projets: 9, taches: 42 },
      ];

  const listRow = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 12px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)', background: 'var(--bg-surface)',
    margin: '1px 0 0',
  };

  const cardTitle = {
    fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── En-tête ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Avatar name={user?.name || 'U'} size={48} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {greeting}, {user?.name || user?.email}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })} · {cfg.title}
          </p>
        </div>
        <Badge variant="info" size="sm">{cfg.scope}</Badge>
        {canAccess(user, 'audit') && (
          <Link to="/admin/audit">
            <Button variant="secondary" size="sm">
              <TrendingUp size={14} /> Activité
            </Button>
          </Link>
        )}
      </div>

      {/* ── Statistiques (variables selon le rôle) ───────────── */}
      <StatsGrid cols={cfg.stats.length <= 4 ? cfg.stats.length : undefined}>
        {cfg.stats.map((key) => {
          const meta = STAT_META[key];
          if (!meta) return null;
          return (
            <StatCard
              key={key}
              title={meta.label}
              value={loading ? '—' : totals[key]}
              icon={meta.icon}
              color={meta.color}
              loading={loading}
            />
          );
        })}
      </StatsGrid>

      {/* ── Accès rapides ────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={cardTitle}>Accès rapides</h3>
          <Badge variant="default" size="sm">{sections.length}</Badge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.id} to={s.to} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  fontSize: 13, fontWeight: 600, transition: 'border-color .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                >
                  <Icon size={16} color="var(--color-primary)" />
                  {s.label}
                  <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* ── Cartes principales ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>

        {/* ── Projets actifs ──────────────────────────────── */}
        {cfg.cards.includes('projets') && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ ...cardTitle, marginBottom: 0 }}>Projets actifs</h3>
              <Link to="/projets" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Tout voir <ArrowRight size={13} style={{ verticalAlign: -2 }} />
              </Link>
            </div>
            {loading ? (
              <div>{[1, 2, 3].map((i) => <div key={i} style={{ ...listRow, height: 46 }} />)}</div>
            ) : projets.length === 0 ? (
              <Empty title="Aucun projet" description="Aucun projet récent à afficher." icon={<FolderKanban size={32} />} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projets.map((p) => {
                  const badge = STATUT_BADGE[p?.statut] || { label: p?.statut || 'Actif', variant: 'default' };
                  const avancement = p?.avancement ?? p?.progression ?? null;
                  return (
                    <div key={p?.id} style={listRow}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 'var(--radius-md)', flexShrink: 0,
                        background: 'color-mix(in srgb, var(--color-info) 14%, transparent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FolderKanban size={16} color="var(--color-info)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p?.nom || 'Projet sans nom'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {p?.code ? `${p.code} · ` : ''}
                          {avancement != null ? `${avancement}%` : 'En cours'}
                        </div>
                      </div>
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ── Tâches récentes ─────────────────────────────── */}
        {cfg.cards.includes('taches') && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ ...cardTitle, marginBottom: 0 }}>Tâches récentes</h3>
              <Link to="/taches" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Tout voir <ArrowRight size={13} style={{ verticalAlign: -2 }} />
              </Link>
            </div>
            {loading ? (
              <div>{[1, 2, 3].map((i) => <div key={i} style={{ ...listRow, height: 46 }} />)}</div>
            ) : taches.length === 0 ? (
              <Empty title="Aucune tâche" description="Rien à traiter pour le moment." icon={<CheckSquare size={32} />} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {taches.map((t) => {
                  const badge = STATUT_BADGE[t?.statut] || { label: t?.statut || 'À faire', variant: 'default' };
                  return (
                    <div key={t?.id} style={listRow}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 'var(--radius-md)', flexShrink: 0,
                        background: 'color-mix(in srgb, var(--color-warning) 14%, transparent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckSquare size={16} color="var(--color-warning)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t?.titre || t?.nom || 'Tâche'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {t?.projetNom || t?.projet?.nom || '—'}
                          {t?.echeance ? ` · échéance ${format(new Date(t.echeance), 'dd/MM/yyyy')}` : ''}
                        </div>
                      </div>
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ── Évaluations ─────────────────────────────────── */}
        {cfg.cards.includes('evaluations') && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ ...cardTitle, marginBottom: 0 }}>Évaluations</h3>
              <Link to="/evaluations" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Tout voir <ArrowRight size={13} style={{ verticalAlign: -2 }} />
              </Link>
            </div>
            {evaluationsPending > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px',
                borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600,
                background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
                color: 'var(--color-warning)',
              }}>
                <Clock size={14} /> {evaluationsPending} évaluation{evaluationsPending > 1 ? 's' : ''} en attente de traitement
              </div>
            )}
            {loading ? (
              <div>{[1, 2, 3].map((i) => <div key={i} style={{ ...listRow, height: 46 }} />)}</div>
            ) : evaluations.length === 0 ? (
              <Empty title="Aucune évaluation" description="Aucune évaluation récente." icon={<Target size={32} />} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {evaluations.map((ev) => {
                  const badge = STATUT_BADGE[ev?.statut] || { label: ev?.statut || '—', variant: 'default' };
                  const date = ev?.dateEvaluation || ev?.date || null;
                  return (
                    <div key={ev?.id} style={listRow}>
                      <Avatar name={ev?.employeNom || ev?.employerNom || ev?.evaluateurNom || '?'} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ev?.employeNom || ev?.employerNom || 'Employé'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {ev?.periode || ev?.type || 'Évaluation'}
                          {date ? ` · ${format(new Date(date), 'dd/MM/yyyy')}` : ''}
                          {ev?.note != null ? ` · note ${ev.note}` : ''}
                        </div>
                      </div>
                      <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ── Activité récente (journal d'audit) ──────────── */}
        {cfg.cards.includes('activite') && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ ...cardTitle, marginBottom: 0 }}>Activité récente</h3>
              {canAccess(user, 'audit') && (
                <Link to="/admin/audit" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                  Journal <ArrowRight size={13} style={{ verticalAlign: -2 }} />
                </Link>
              )}
            </div>
            {loading ? (
              <div>{[1, 2, 3].map((i) => <div key={i} style={{ ...listRow, height: 46 }} />)}</div>
            ) : recentAudits.length === 0 ? (
              <Empty title="Aucune activité" description="Le journal est vide." icon={<History size={32} />} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentAudits.map((a, i) => (
                  <div key={a?.id ?? i} style={listRow}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: 'color-mix(in srgb, var(--color-secondary) 14%, transparent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <History size={15} color="var(--color-secondary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, margin: '1px 0 0' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a?.actionDescription || a?.action || 'Action'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {a?.userName || a?.userEmail || (a?.user ? `${a.user.prenom || ''} ${a.user.nom || ''}`.trim() : '') || 'Système'}
                        {a?.dateAction || a?.createdAt
                          ? ` · ${format(new Date(a.dateAction || a.createdAt), 'dd/MM HH:mm')}`
                          : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── Graphiques ──────────────────────────────────── */}
        {cfg.cards.includes('chart') && (
          <Card>
            <h3 style={cardTitle}>Activité &amp; répartition des projets</h3>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>
              Activité (6 mois)
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={activityData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProjets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradTaches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="projets" stroke="var(--color-info)" strokeWidth={2} fill="url(#gradProjets)" />
                  <Area type="monotone" dataKey="taches" stroke="var(--color-primary)" strokeWidth={2} fill="url(#gradTaches)" />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '18px 0 8px' }}>
              Projets par statut
            </div>
            {statsByStatut.length === 0 ? (
              <Empty title="Aucune statistique" icon={<Globe size={32} />} />
            ) : (
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statsByStatut}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {statsByStatut.map((entry, i) => (
                        <Cell key={`cell-${entry.name ?? i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}






