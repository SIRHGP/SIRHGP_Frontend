// Cards détaillées + drawer de détail (interpellés, KPI, critères, rapport figé).
// LEAD : voit son département et soumet au MANAGER. MANAGER : consulte/valide.
// ADMIN : entreprise. STAFF/STAGIAIRE : aucun accès (roles.js + SecurityConfig).
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ClipboardList, CheckCheck, Eye, Plus, Trash2, Users } from 'lucide-react';
import { evaluationApi, employerApi } from '../Api';
import { useAuth } from '../contexts/Authcontext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  PageHeader, Card, Badge, Button, Input, Select, Textarea,
  StatsGrid, StatCard, Tabs, Flex, Empty, Drawer, InfoRow, SectionTitle, Alert, FormRow,
} from '../components/ui';
import toast from 'react-hot-toast';

const TYPE_META = {
  ANNUELLE: { label: 'Annuelle' },
  TRIMESTRIELLE: { label: 'Trimestrielle' },
  A_DATE: { label: 'À date' },
};
const CATEGORIE_META = {
  PROMOTION: { label: 'Promotion', variant: 'success' },
  RENVOI: { label: 'Renvoi', variant: 'danger' },
  RECADREMENT: { label: 'Recadrement', variant: 'warning' },
};
const STATUT_META = {
  BROUILLON: { label: 'Brouillon', variant: 'default' },
  SOUMISE: { label: 'Soumise', variant: 'warning' },
  VALIDEE: { label: 'Validée', variant: 'success' },
};
const CAT_KEYS = Object.keys(CATEGORIE_META);
const TYPE_KEYS = Object.keys(TYPE_META);

const critereVide = () => ({ libelle: '', note: '' });

export default function Evaluations() {
  const { user } = useAuth();
  const { notifyEvaluation } = useNotifications();
  const [tab, setTab] = useState('toutes');
  const [data, setData] = useState([]);
  const [employesSelection, setEmployesSelection] = useState([]); // employés évaluables (scopés LEAD)
  const [loading, setLoading] = useState(true);
  const [selectionDrawer, setSelectionDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null); // évaluation ouverte en drawer
  const [detailKpi, setDetailKpi] = useState(null);
  const [creationKpi, setCreationKpi] = useState(null);
  const [creationKpiLoading, setCreationKpiLoading] = useState(false);
  const [criteres, setCriteres] = useState([critereVide()]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'ANNUELLE', categorie: 'PROMOTION', objet: '',
    annee: new Date().getFullYear(),
    commentaire: '', dateEvaluation: new Date().toISOString().slice(0, 10), evalueId: '',
  });

  const isManager = user?.roleName === 'MANAGER' || user?.roleName === 'ADMIN';
  const rangRole = { STAGIAIRE: 1, STAFF: 2, LEAD: 3, MANAGER: 4, ADMIN: 5 };
  const rangEvaluateur = rangRole[user?.roleName] || 0;
  const employesEligibles = employesSelection.filter(employee =>
    String(employee.id) !== String(user?.id)
    && (rangRole[employee.roleName] || 0) < rangEvaluateur
  );
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const continuerAvecEvalue = async () => {
    if (!form.evalueId) {
      toast.error("Sélectionnez la personne à évaluer");
      return;
    }
    setSelectionDrawer(false);
    setCreationKpi(null);
    setCreationKpiLoading(true);
    setModal(true);
    try {
      const response = await evaluationApi.kpi(Number(form.evalueId));
      setCreationKpi(response.data?.data || response.data);
    } catch {
      setCreationKpi(null);
    } finally {
      setCreationKpiLoading(false);
    }
  };

  const fermerCreation = () => {
    setModal(false);
    setCreationKpi(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evals, emps] = await Promise.all([
        evaluationApi.getAll().catch(() => null),
        employerApi.getAll({ page: 0, size: 100 }).catch(() => null),
      ]);
      setData(Array.isArray(evals?.data) ? evals.data : (evals?.data?.data || []));
      const d = emps?.data?.data || emps?.data;
      const premierLot = Array.isArray(d) ? d : d?.content || [];
      const totalPages = Array.isArray(d) ? 1 : Math.max(1, Number(d?.totalPages) || 1);
      const autresLots = await Promise.all(Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
        employerApi.getAll({ page: index + 1, size: 100 })
      ));
      const tousEmployes = [
        ...premierLot,
        ...autresLots.flatMap(response => {
          const pageData = response.data?.data || response.data;
          return Array.isArray(pageData) ? pageData : pageData?.content || [];
        }),
      ];
      // L'API limite déjà les employés visibles selon le rôle : entreprise pour
      // ADMIN, succursale pour MANAGER et départements supervisés pour LEAD.
      setEmployesSelection(tousEmployes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => { if (active) load(); }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [load]);

  // Onglet « À valider » : uniquement les évaluations SOUMISES d'un LEAD (MANAGER/ADMIN)
  const aValider = useMemo(
    () => data.filter(e => e.statut === 'SOUMISE' && e.evaluateurRole === 'LEAD'),
    [data]);
  const filtered = useMemo(
    () => (tab === 'valider' ? aValider : data), [tab, aValider, data]);

  const notees = filtered.filter(e => e.noteGlobale != null);
  const noteMoy = notees.length
    ? (notees.reduce((s, e) => s + parseFloat(e.noteGlobale), 0) / notees.length).toFixed(2)
    : '—';
  const nbValidees = data.filter(e => e.statut === 'VALIDEE').length;

  const setCritere = (i, k, v) => {
    const next = [...criteres];
    next[i][k] = v;
    setCriteres(next);
  };

  const ouvrirDetail = async (ev) => {
    setDetail(ev);
    setDetailKpi(null);
    try {
      const res = await evaluationApi.kpi(ev.evalueId);
      setDetailKpi(res.data?.data || res.data);
    } catch { setDetailKpi(null); }
  };


  const save = async (e) => {
    e.preventDefault();
    if (!form.evalueId) { toast.error("L'employé évalué est obligatoire"); return; }
    if (!form.objet.trim()) { toast.error("L'objet de l'évaluation est obligatoire"); return; }
    const criteresOk = criteres
      .filter(c => c.libelle.trim() !== '')
      .map(c => ({ libelle: c.libelle.trim(), note: Number(c.note) || 0 }));
    if (criteresOk.length === 0) { toast.error('Ajoutez au moins un critère'); return; }
    setSaving(true);
    try {
      // L'évaluateur est toujours l'utilisateur courant (forcé côté backend).
      const res = await evaluationApi.create({
        type: form.type, categorie: form.categorie, objet: form.objet.trim(),
        annee: parseInt(form.annee) || null,
        commentaire: form.commentaire || null, dateEvaluation: form.dateEvaluation || null,
        evalueId: parseFloat(form.evalueId), criteres: criteresOk,
      });
      const created = res.data?.data || res.data;
      if (created?.statut === 'SOUMISE' && created?.valideurId) {
        notifyEvaluation({ action: 'soumise', evaluation: created, targetUserId: created.valideurId });
      } else {
        toast.success(created?.statut === 'VALIDEE'
          ? 'Évaluation enregistrée et validée' : 'Évaluation enregistrée');
      }
      setModal(false);
      setCriteres([critereVide()]);
      setForm(f => ({ ...f, objet: '', commentaire: '', evalueId: '' }));
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const changeStatut = async (ev, statut) => {
    try {
      const res = await evaluationApi.changeStatut(ev.id, statut);
      const updated = res.data?.data || res.data;
      if (statut === 'SOUMISE' && updated?.valideurId) {
        notifyEvaluation({ action: 'soumise', evaluation: updated, targetUserId: updated.valideurId });
      } else if (statut === 'VALIDEE') {
        notifyEvaluation({ action: 'validee', evaluation: updated, targetUserId: updated?.evaluateurId });
      } else {
        toast.success(`Évaluation ${STATUT_META[statut]?.label.toLowerCase()}`);
      }
      if (detail?.id === ev.id) setDetail(updated);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Changement de statut refusé');
    }
  };

  const peutSoumettre = (ev) => ev.statut === 'BROUILLON' && ev.evaluateurId === user?.id;
  const peutValider = (ev) => ev.statut === 'SOUMISE' && ev.evaluateurRole === 'LEAD'

  return (
    <div>
      <PageHeader
        title="Évaluations"
        subtitle="LEAD évalue son département — MANAGER consulte et valide"
      >
        <Button variant="primary" onClick={() => setSelectionDrawer(true)}>
            <Plus size={16} /> Nouvelle évaluation
        </Button>
      </PageHeader>

      <StatsGrid cols={4}>
        <StatCard title="Total" value={data.length} icon={<ClipboardList size={22} />} />
        <StatCard title="À valider" value={aValider.length} icon={<CheckCheck size={22} />}
          color={aValider.length > 0 ? '#F59E0B' : '#64748B'} />
        <StatCard title="Validées" value={nbValidees} icon={<CheckCheck size={22} />} color="#10B981" />
        <StatCard title="Note moyenne" value={noteMoy} icon={<Users size={22} />} color="#8B5CF6" />
      </StatsGrid>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'toutes', label: 'Toutes', icon: <ClipboardList size={15} />, count: data.length },
          ...(isManager ? [{ key: 'valider', label: 'À valider', icon: <CheckCheck size={15} />, count: aValider.length }] : []),
        ]}
      />

      {loading ? (
        <Empty title="Chargement…" description="Lecture des évaluations" />
      ) : filtered.length === 0 ? (
        <Empty title="Aucune évaluation"
          description="Utilisez « Nouvelle évaluation » ou le bouton « À évaluer » dans la page Employés" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(ev => {
            const cm = CATEGORIE_META[ev.categorie] || { label: ev.categorie || '—', variant: 'default' };
            const tm = TYPE_META[ev.type] || { label: ev.type || '—' };
            const sm = STATUT_META[ev.statut] || { label: ev.statut, variant: 'default' };
            return (
              <Card key={ev.id} padding={16}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}
                onClick={() => ouvrirDetail(ev)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={ev.objet}>{ev.objet || '—'}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {tm.label} · {ev.dateEvaluation || '—'}
                    </span>
                  </div>
                  <Badge variant={sm.variant} size="sm">{sm.label}</Badge>
                </div>

                <Flex gap={6} wrap>
                  <Badge variant={cm.variant} size="sm">{cm.label}</Badge>
                  {ev.noteGlobale != null && (
                    <Badge variant="info" size="sm">Note {ev.noteGlobale}/20</Badge>
                  )}
                </Flex>

                {/* Les 2 interpellés */}
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>Évaluateur : <strong>{ev.evaluateurName || '—'}</strong>
                    {ev.evaluateurRole && <span style={{ color: 'var(--text-muted)' }}> ({ev.evaluateurRole})</span>}</span>
                  <span>Évalué : <strong>{ev.evalueName || '—'}</strong>
                    {ev.evalueRole && <span style={{ color: 'var(--text-muted)' }}> ({ev.evalueRole})</span>}</span>
                </div>

                {ev.commentaire && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                    {ev.commentaire}
                  </p>
                )}

                <Flex gap={8} style={{ marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => ouvrirDetail(ev)}>
                    <Eye size={14} /> Détail
                  </Button>
                  {peutSoumettre(ev) && (
                    <Button size="sm" onClick={() => changeStatut(ev, 'SOUMISE')}>
                      Soumettre
                    </Button>
                  )}
                  {peutValider(ev) && (
                    <Button size="sm" variant="primary" onClick={() => changeStatut(ev, 'VALIDEE')}>
                      <CheckCheck size={14} /> Valider
                    </Button>
                  )}
                </Flex>
              </Card>
            );
          })}
        </div>
      )}


      <Drawer open={!!detail} onClose={() => setDetail(null)} width={660}
        title={`Évaluation — ${detail?.evalueName || ''}`}>
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card padding={14}>
              <SectionTitle>A. Interpellés</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <InfoRow label="Évaluateur" value={`${detail.evaluateurName || '—'}${detail.evaluateurRole ? ` (${detail.evaluateurRole})` : ''}`} />
                <InfoRow label="Évalué" value={`${detail.evalueName || '—'}${detail.evalueRole ? ` (${detail.evalueRole})` : ''}`} />
                <InfoRow label="Objet" value={detail.objet} />
                <InfoRow label="Catégorie" value={CATEGORIE_META[detail.categorie]?.label || detail.categorie} />
                <InfoRow label="Type" value={TYPE_META[detail.type]?.label || detail.type} />
                <InfoRow label="Statut" value={STATUT_META[detail.statut]?.label || detail.statut} />
                <InfoRow label="Date" value={detail.dateEvaluation} />
                <InfoRow label="Note globale" value={detail.noteGlobale != null ? `${detail.noteGlobale}/20` : '—'} />
                {detail.valideurNom && <InfoRow label="Destinataire validation" value={detail.valideurNom} />}
              </div>
            </Card>

            <Card padding={14}>
              <SectionTitle>B. KPI de l'évalué</SectionTitle>
              {!detailKpi ? (
                <Empty title="KPI indisponibles" description="Chargement ou accès refusé" />
              ) : (
                <>
                  <StatsGrid cols={4}>
                    <StatCard title="Tâches" value={detailKpi.tachesTotal ?? 0} />
                    <StatCard title="Terminées" value={detailKpi.tachesTerminees ?? 0} color="#10B981" />
                    <StatCard title="En retard" value={detailKpi.tachesEnRetard ?? 0} color="#EF4444" />
                    <StatCard title="Taux" value={`${detailKpi.tauxCompletion ?? 0} %`} color="#8B5CF6" />
                  </StatsGrid>
                  <StatsGrid cols={3} style={{ marginTop: 8 }}>
                    <StatCard title="Jours pointés" value={`${detailKpi.joursPointes ?? 0}/${detailKpi.joursOuvres ?? 0}`} color="#3B82F6" />
                    <StatCard title="Retards" value={detailKpi.retards ?? 0} color="#F59E0B" />
                    <StatCard title="Absences" value={detailKpi.absences ?? 0} color="#EF4444" />
                  </StatsGrid>
                </>
              )}
            </Card>

            <Card padding={14}>
              <SectionTitle>C. Critères</SectionTitle>
              {(!detail.criteres || detail.criteres.length === 0) ? (
                <Empty title="Aucun critère" description="Évaluation sans grille de notation" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  {detail.criteres.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span>{c.libelle}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {c.note}/20 × coef {c.coefficient ?? 1}
                      </span>
                    </div>
                  ))}
                  {detail.noteGlobale != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 4 }}>
                      <span>Moyenne pondérée</span><span>{detail.noteGlobale}/20</span>
                    </div>
                  )}
                </div>
              )}
              {detail.commentaire && (
                <p style={{ fontSize: 13, margin: '10px 0 0' }}>💬 {detail.commentaire}</p>
              )}
            </Card>

            <Card padding={14}>
              <SectionTitle>D. Rapport</SectionTitle>
              {detail.rapport ? (
                <>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
                    Figé le {detail.dateRapport || '—'}
                  </p>
                  <pre style={{
                    margin: 0, padding: 12, borderRadius: 8, fontSize: 12, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: 'var(--bg-hover)', fontFamily: 'inherit',
                  }}>{detail.rapport}</pre>
                </>
              ) : (
                <Alert variant="info">
                  Le rapport est généré automatiquement à la validation
                  (récap KPI, critères, note, décision).
                </Alert>
              )}
            </Card>

            <Flex gap={8}>
              {peutSoumettre(detail) && (
                <Button onClick={() => changeStatut(detail, 'SOUMISE')}>Soumettre au manager</Button>
              )}
              {peutValider(detail) && (
                <Button variant="primary" onClick={() => changeStatut(detail, 'VALIDEE')}>
                  <CheckCheck size={15} /> Valider l'évaluation
                </Button>
              )}
            </Flex>
          </div>
        )}
      </Drawer>


      {/* Modal de création — l'évaluateur est toujours l'utilisateur courant */}
      <Drawer open={selectionDrawer} onClose={() => setSelectionDrawer(false)} title="Nouvelle évaluation" width={620}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setSelectionDrawer(false)}>Annuler</Button>
            <Button onClick={continuerAvecEvalue} disabled={!form.evalueId || employesEligibles.length === 0}>Continuer</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Alert variant="info">
            Évaluateur : <strong>{user?.name}</strong> ({user?.roleName}). Choisissez la personne
            à évaluer parmi les employés de votre périmètre.
          </Alert>
          <Card padding={14}>
            <SectionTitle>A. Personne à évaluer</SectionTitle>
            <Select label="Employé évalué *" value={form.evalueId} onChange={setF('evalueId')}
              options={[{ value: '', label: '— Choisir un employé —' },
                ...employesEligibles.map(p => ({ value: String(p.id), label: `${p.name}${p.roleName ? ' (' + p.roleName + ')' : ''}` }))]} />
            {employesEligibles.length === 0 && !loading && (
              <Alert variant="info">Aucun employé évaluable n'est disponible dans votre périmètre.</Alert>
            )}
          </Card>
        </div>
      </Drawer>

      <Drawer open={modal} onClose={fermerCreation}
        title={`Évaluer — ${employesEligibles.find(p => String(p.id) === String(form.evalueId))?.name || ''}`}
        width={620}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={fermerCreation}>Fermer</Button>
            <Button onClick={save} loading={saving} loadingText="Enregistrement…">Enregistrer</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Alert variant="info">
            Évaluateur : <strong>{user?.name}</strong> ({user?.roleName}) — évalué :{' '}
            <strong>{employesEligibles.find(p => String(p.id) === String(form.evalueId))?.name || '—'}</strong>{' '}
            ({employesEligibles.find(p => String(p.id) === String(form.evalueId))?.roleName || '—'}).
          </Alert>

          <Card padding={14}>
            <SectionTitle>A. Indicateurs de {employesEligibles.find(p => String(p.id) === String(form.evalueId))?.name}</SectionTitle>
            {creationKpiLoading ? (
              <Empty title="Chargement…" description="Calcul des indicateurs" />
            ) : !creationKpi ? (
              <Empty title="Aucun indicateur" description="Tâches / assiduité indisponibles" />
            ) : (
              <StatsGrid cols={3}>
                <StatCard title="Tâches terminées" value={`${creationKpi.tachesTerminees ?? 0}/${creationKpi.tachesTotal ?? 0}`} color="#10B981" />
                <StatCard title="Taux complétion" value={`${Math.round(creationKpi.tauxCompletion ?? 0)} %`} color="#3B82F6" />
                <StatCard title="Retards (30 j)" value={creationKpi.nbRetards ?? 0} color="#F59E0B" />
              </StatsGrid>
            )}
          </Card>

          <Card padding={14}>
            <SectionTitle>B. Évaluation</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormRow>
                <Select label="Type *" value={form.type} onChange={setF('type')}
                  options={TYPE_KEYS.map(k => ({ value: k, label: TYPE_META[k].label }))} />
                <Select label="Catégorie *" value={form.categorie} onChange={setF('categorie')}
                  options={CAT_KEYS.map(k => ({ value: k, label: CATEGORIE_META[k].label }))} />
              </FormRow>
              <Input label="Objet *" value={form.objet} onChange={setF('objet')}
                placeholder="ex. Promotion au poste de chef de service" />
              <Input label="Date d'évaluation" type="date" value={form.dateEvaluation} onChange={setF('dateEvaluation')} />
              <Textarea label="Commentaire" value={form.commentaire} onChange={setF('commentaire')} rows={2} />
              <p style={{ fontSize: 12, fontWeight: 600, margin: '4px 0 0' }}>Critères (note /20)</p>
              {criteres.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input placeholder="Libellé (ex. Qualité du travail)" value={c.libelle}
                    onChange={e => setCritere(i, 'libelle', e.target.value)} style={{ flex: 1 }} />
                  <Input placeholder="Note" type="number" step="0.5" min="0" max="20" value={c.note}
                    onChange={e => setCritere(i, 'note', e.target.value)} style={{ width: 100 }} />
                  <button type="button" onClick={() => setCriteres(criteres.filter((_, j) => j !== i))}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => setCriteres([...criteres, critereVide()])}>
                <Plus size={13} /> Ajouter un critère
              </Button>
            </div>
          </Card>
        </div>
      </Drawer>
    </div>
  );
}
