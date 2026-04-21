import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderKanban, CheckSquare, FileText, TrendingUp, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, StatCard, Badge, Avatar, Skeleton, PageHeader } from '../components/ui';
import { projetApi, tacheApi, employerApi, factureApi } from '../Api';
import { useAuth } from '../contexts/Authcontext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PIE_COLORS = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6'];

const STATUT_BADGE = {
  'A_FAIRE':    { label:'À faire',    variant:'default' },
  'EN_COURS':   { label:'En cours',   variant:'info' },
  'TERMINEE':   { label:'Terminée',   variant:'success' },
  'EN_ATTENTE': { label:'En attente', variant:'warning' },
  'PLANIFIE':   { label:'Planifié',   variant:'default' },
  'EN_RETARD':  { label:'En retard',  variant:'danger' },
  'ANNULE':     { label:'Annulé',     variant:'danger' },
  'TERMINE':    { label:'Terminé',    variant:'success' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projets, setProjets] = useState([]);
  const [taches, setTaches] = useState([]);
  const [statsByStatut, setStatsByStatut] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, projRes, tacheRes, statutRes] = await Promise.allSettled([
          projetApi.getDashboardGlobal(),
          projetApi.getAll({ page: 0, size: 5 }),
          tacheApi.getAll({ page: 0, size: 6 }),
          projetApi.getStatsByStatut(),
        ]);
        if (dashRes.status === 'fulfilled') setStats(dashRes.value.data?.data || dashRes.value.data);
        if (projRes.status === 'fulfilled') {
          const d = projRes.value.data?.data || projRes.value.data;
          setProjets(Array.isArray(d) ? d : d?.content || []);
        }
        if (tacheRes.status === 'fulfilled') {
          const d = tacheRes.value.data?.data || tacheRes.value.data;
          setTaches(Array.isArray(d) ? d.slice(0,6) : (d?.content || []).slice(0,6));
        }
        if (statutRes.status === 'fulfilled') {
          const d = statutRes.value.data?.data || statutRes.value.data || {};
          setStatsByStatut(Object.entries(d).map(([name, value]) => ({ name, value })));
        }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const mockActivity = [
    { mois:'Jan', projets:3, taches:12 },
    { mois:'Fév', projets:5, taches:18 },
    { mois:'Mar', projets:4, taches:24 },
    { mois:'Avr', projets:7, taches:30 },
    { mois:'Mai', projets:6, taches:28 },
    { mois:'Jun', projets:9, taches:42 },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:8 }}>
          <Avatar name={user?.name || 'U'} size={48}/>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.5px' }}>
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })} — Vue d'ensemble du système
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16, marginBottom:28 }}>
        <StatCard title="Projets actifs" value={loading ? '—' : stats?.projetsEnCours ?? '—'} icon={<FolderKanban size={22}/>} color="var(--color-primary)" loading={loading} subtitle="En cours"/>
        <StatCard title="Tâches du jour" value={loading ? '—' : stats?.tachesEnCours ?? '—'} icon={<CheckSquare size={22}/>} color="var(--color-accent)" loading={loading} subtitle="En cours"/>
        <StatCard title="Projets en retard" value={loading ? '—' : stats?.projetsEnRetard ?? '—'} icon={<AlertTriangle size={22}/>} color="var(--color-danger)" loading={loading} subtitle="Attention requise"/>
        <StatCard title="Projets terminés" value={loading ? '—' : stats?.projetsTermines ?? '—'} icon={<TrendingUp size={22}/>} color="var(--color-success)" loading={loading} subtitle="Ce mois"/>
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:28 }}>
        {/* Activity chart */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div>
              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Activité mensuelle</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Projets et tâches sur 6 mois</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockActivity}>
              <defs>
                <linearGradient id="colorProjets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTaches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)"/>
              <XAxis dataKey="mois" tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:12, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)', borderRadius:10, fontSize:13 }}/>
              <Area type="monotone" dataKey="projets" stroke="#2563EB" strokeWidth={2} fill="url(#colorProjets)" name="Projets"/>
              <Area type="monotone" dataKey="taches" stroke="#10B981" strokeWidth={2} fill="url(#colorTaches)" name="Tâches"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart statuts */}
        <Card>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>Statuts projets</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Répartition par statut</p>
          {statsByStatut.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statsByStatut} cx="50%" cy="45%" outerRadius={80} dataKey="value" nameKey="name" labelLine={false}>
                  {statsByStatut.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:'var(--bg-surface)', border:'1px solid var(--border-default)', borderRadius:10, fontSize:12 }}/>
                <Legend iconSize={10} wrapperStyle={{ fontSize:12 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:14 }}>
              {loading ? <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--bg-muted)', animation:'pulse 1.5s infinite' }}/> : 'Aucune donnée'}
            </div>
          )}
        </Card>
      </div>

      {/* Lists */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Recent projets */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-primary)' }}>Projets récents</h3>
            <Link to="/projets" style={{ fontSize:13, color:'var(--color-primary)', textDecoration:'none', fontWeight:500 }}>Voir tout →</Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3].map(i => <Skeleton key={i} height={52} radius="var(--radius-md)"/>)}
            </div>
          ) : projets.length === 0 ? (
            <p style={{ color:'var(--text-muted)', fontSize:14, textAlign:'center', padding:'24px 0' }}>Aucun projet</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {projets.map(p => {
                const st = STATUT_BADGE[p.statut] || { label: p.statut, variant:'default' };
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--bg-muted)', borderRadius:'var(--radius-md)' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: p.statut==='EN_COURS'?'var(--color-primary)':p.statut==='TERMINE'?'var(--color-success)':p.statut==='EN_RETARD'?'var(--color-danger)':'var(--color-warning)', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:500, fontSize:14, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nom}</p>
                      <p style={{ fontSize:12, color:'var(--text-muted)' }}>{p.codeProjet}</p>
                    </div>
                    <Badge variant={st.variant} size="sm">{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent taches */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--text-primary)' }}>Tâches récentes</h3>
            <Link to="/taches" style={{ fontSize:13, color:'var(--color-primary)', textDecoration:'none', fontWeight:500 }}>Voir tout →</Link>
          </div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} height={44} radius="var(--radius-md)"/>)}
            </div>
          ) : taches.length === 0 ? (
            <p style={{ color:'var(--text-muted)', fontSize:14, textAlign:'center', padding:'24px 0' }}>Aucune tâche</p>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {taches.map(t => {
                const st = STATUT_BADGE[t.statut] || { label: t.statut, variant:'default' };
                const prio = { 'URGENTE':'var(--color-danger)', 'HAUTE':'var(--color-warning)', 'NORMALE':'var(--color-primary)', 'BASSE':'var(--color-success)' };
                return (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:'var(--radius-md)', border:'1px solid var(--border-muted)' }}>
                    <div style={{ width:3, height:32, borderRadius:2, background: prio[t.priorite]||'var(--border-default)', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:500, fontSize:13, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.titre}</p>
                      {t.dateEcheance && <p style={{ fontSize:11, color:'var(--text-muted)' }}>Échéance: {t.dateEcheance}</p>}
                    </div>
                    <Badge variant={st.variant} size="sm">{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}