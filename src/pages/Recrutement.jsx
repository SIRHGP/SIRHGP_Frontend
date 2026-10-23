// pages/Recrutement.jsx — Module Recrutement (2.2) : offres & pipeline de candidatures
import { useState, useMemo, useRef } from 'react';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { UserPlus, Briefcase, Users, Pencil, Trash2, Eye, Building2, FileText, Award, UserCheck, Upload } from 'lucide-react';
import { offreApi, candidatureApi, posteApi, departementApi, documentApi } from '../Api';
import { useAuth } from '../contexts/Authcontext';
import { useSucursales } from '../hooks/useSucursales';
import { PageHeader, Card, Badge, Button, Modal, Input, Select, Textarea, Confirm, FormRow, StatsGrid, StatCard, Drawer, Flex, InfoRow, Alert, SectionTitle, SucursaleBadge, SucursaleField } from '../components/ui';
import toast from 'react-hot-toast';

const TYPE_META = {
  CDI: { label: 'CDI', color: '#6366F1' },
  CDD: { label: 'CDD', color: '#F59E0B' },
  STAGE: { label: 'Stage', color: '#0EA5E9' },
  FREELANCE: { label: 'Freelance', color: '#8B5CF6' },
  TEMPS_PARTIEL: { label: 'Temps partiel', color: '#10B981' },
};

const OFFRE_STATUT_META = {
  OUVERTE: { label: 'Ouverte', variant: 'success' },
  SUSPENDUE: { label: 'Suspendue', variant: 'warning' },
  FERMEE: { label: 'Fermée', variant: 'danger' },
};

const PIPELINE = ['NOUVELLE', 'ENTRETIEN', 'EVALUATION', 'RECRUTE', 'REFUSEE'];
const PIPELINE_META = {
  NOUVELLE: { label: 'Nouvelle', color: '#3B82F6', variant: 'info' },
  ENTRETIEN: { label: 'Entretien', color: '#F59E0B', variant: 'warning' },
  EVALUATION: { label: 'Évaluation', color: '#A855F7', variant: 'info' },
  RECRUTE: { label: 'Recruté', color: '#10B981', variant: 'success' },
  REFUSEE: { label: 'Refusée', color: '#EF4444', variant: 'danger' },
  // statuts — affichables tant qu'ils n'ont pas été déplacés vers le pipeline simplifié.
  PRESELECTION: { label: 'Présélection (ancien)', color: '#8B5CF6', variant: 'info' },
  TEST: { label: 'Test (ancien)', color: '#0EA5E9', variant: 'info' },
  OFFRE: { label: 'Offre (ancien)', color: '#6366F1', variant: 'info' },
};

const TRANSITIONS_AUTORISEES = {
  NOUVELLE: ['ENTRETIEN', 'REFUSEE'],
  ENTRETIEN: ['EVALUATION', 'REFUSEE'],
  EVALUATION: ['RECRUTE', 'REFUSEE'],
  // (ou refus), en miroir du backend — aucune transition n'y mène.
  PRESELECTION: ['ENTRETIEN', 'REFUSEE'],
  TEST: ['EVALUATION', 'REFUSEE'],
  OFFRE: ['EVALUATION', 'REFUSEE'],
  RECRUTE: [],
  REFUSEE: [],
};

// Refonte candidature : étapes affichées du cycle de vie (miroir du backend,
// CandidatureService.TRANSITIONS) — RECRUTE est l'issue favorable terminale.
const PIPELINE_ETAPES = ['NOUVELLE', 'ENTRETIEN', 'EVALUATION', 'RECRUTE'];

/**
 * Stepper du cycle de vie d'une candidature : étapes parcourues colorées,
 * étape courante surlignée, issue fatale (REFUSEE) en bandeau rouge.
 */
function PipelineStepper({ statut }) {
  if (statut === 'REFUSEE') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: '#EF444414' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Candidature refusée</span>
      </div>
    );
  }
  // le stepper 4 étapes ne les connaît plus : bandeau explicite + bouton de sortie.
  if (!PIPELINE_ETAPES.includes(statut)) {
    const meta = PIPELINE_META[statut];
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: '#8B5CF614' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: meta?.color || 'var(--text-secondary)' }}>
          Ancien statut : {meta?.label || statut} — déplacez le dossier vers le pipeline simplifié
        </span>
      </div>
    );
  }
  const idx = Math.max(0, PIPELINE_ETAPES.indexOf(statut));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
      {PIPELINE_ETAPES.map((s, i) => {
        const meta = PIPELINE_META[s];
        const passed = i < idx;
        const active = i === idx;
        const reached = passed || active;
        return (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && (
              <span style={{ width: 12, height: 2, borderRadius: 2, background: i <= idx ? PIPELINE_META[PIPELINE_ETAPES[i - 1]].color : 'var(--border-default)' }} />
            )}
            <span title={meta.label} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: active ? 20 : 15, height: active ? 20 : 15, borderRadius: '50%',
              fontSize: active ? 10 : 8, fontWeight: 700,
              background: reached ? meta.color : 'var(--bg-hover)',
              color: reached ? '#FFFFFF' : 'var(--text-muted)',
              outline: active ? `3px solid ${meta.color}30` : 'none',
            }}>{i + 1}</span>
            <span style={{ fontSize: active ? 11 : 10, fontWeight: active ? 700 : 500, color: reached ? meta.color : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {meta.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

const DECISION_META = {
  PENDING: { label: 'En attente', variant: 'default' },
  A_EVALUER: { label: 'À évaluer', variant: 'info' },
  EN_STAGE: { label: 'En stage', variant: 'warning' },
  ENGAGE: { label: 'Engagé', variant: 'success' },
  REFUSE_AVANT: { label: 'Refusé', variant: 'danger' },
};

const EMPTY_OFFRE = { titre: '', description: '', typeContrat: 'CDI', lieu: '', posteId: '', departementId: '', sucursalId: '' };
// est un CV (fichier optionnel) + identité, le suivi se fait par le pipeline.
const EMPTY_CAND = { offreId: '', nomCandidat: '', email: '', telephone: '', commentaire: '' };

const CV_ACCEPT = '.pdf,.doc,.docx';
const CV_MAX_MO = 10;

export default function Recrutement() {
  const { user } = useAuth();
  const isAdmin = user?.roleName === 'ADMIN' || user?.roleName === 'SUPER_ADMIN';
  // gère le cycle de vie des offres (créer / clôturer / supprimer) — l'API borne
  // chaque opération à son périmètre via LeadPerimetreService.
  // La SUPPRESSION d'une CANDIDATURE, elle, reste réservée à l'ADMIN (@PreAuthorize).
  const peutGererOffres = isAdmin || user?.roleName === 'LEAD';
  // /auth/login (UserSummaryDTO.departementsSupervises). Sert de seconde barrière :
  // le backend filtre déjà /api/departements et /api/postes, mais on ne veut pas
  // afficher un département hors périmètre si la réponse change un jour.
  // `null` = information absente (ADMIN/MANAGER ou session ancienne) → pas de filtre.
  const departementsSupervises = user?.departementsSupervises ?? null;
  const estFiltreParPerimetre = Array.isArray(departementsSupervises);
  const [tab, setTab] = useState('offres');
  const [offres, setOffres] = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [postes, setPostes] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [offreModal, setOffreModal] = useState(false);
  const [editOffre, setEditOffre] = useState(null);
  const [offreForm, setOffreForm] = useState(EMPTY_OFFRE);
  const [deleteOffre, setDeleteOffre] = useState(null);

  const [candModal, setCandModal] = useState(false);
  const [candForm, setCandForm] = useState(EMPTY_CAND);
  const [candCvFile, setCandCvFile] = useState(null);
  const [uploadCvFor, setUploadCvFor] = useState(null); // candidature cible (affichage)
  const cvInputRef = useRef(null);  // input fichier caché partagé (ajout de CV)
  const cvTargetRef = useRef(null); // candidature réellement ciblée par l'upload
  const [filterOffre, setFilterOffre] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const { showSucursal, optionsFiltre: sucursalFiltreOptions,
          optionsFormulaire: sucursalFormOptions, correspond: sucursalMatch,
          compteAncre, sucursalUtilisateurNom } = useSucursales();
  const [filterSuc, setFilterSuc] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [cvCandMeta, setCvCandMeta] = useState(null);

  const [dossier, setDossier] = useState(null);
  const [verdict, setVerdict] = useState({ note: '', avis: '' });
  const [embaucheModal, setEmbaucheModal] = useState(false);
  const [embForm, setEmbForm] = useState({ posteId: '', salaireBase: '', nui: '', dateEmbauche: '', roleName: 'STAFF' });
  const setEmb = (k) => (e) => setEmbForm(f => ({ ...f, [k]: e.target.value }));

  const setOf = (k) => (e) => setOffreForm(f => ({ ...f, [k]: e.target.value }));
  const setC = (k) => (e) => setCandForm(f => ({ ...f, [k]: e.target.value }));

  // (le back refuse une candidature sur une offre fermée) + détail de l'offre choisie.
  const offresOuvertes = useMemo(() => offres.filter(o => o.statut === 'OUVERTE'), [offres]);
  const filteredOffres = useMemo(() => offres.filter(o => sucursalMatch(o, filterSuc)), [offres, filterSuc, sucursalMatch]);
  const offreSelectionnee = useMemo(
    () => offresOuvertes.find(o => String(o.id) === String(candForm.offreId)) || null,
    [offresOuvertes, candForm.offreId],
  );

  const load = async () => {
    try {
      const [o, c, p, d] = await Promise.all([
        offreApi.getAll().catch(() => null),
        candidatureApi.getAll().catch(() => null),
        posteApi.getAll({ size: 200 }).catch(() => null),
        departementApi.getAll({ size: 200 }).catch(() => null),
      ]);
      const od = Array.isArray(o?.data) ? o.data : (o?.data?.data || []);
      const cd = Array.isArray(c?.data) ? c.data : (c?.data?.data || []);
      setOffres(Array.isArray(od) ? od : []);
      setCandidatures(Array.isArray(cd) ? cd : []);
      const pd = p?.data?.data || p?.data;
      const dd = d?.data?.data || d?.data;
      const listePostes = Array.isArray(pd) ? pd : pd?.content || [];
      const listeDepartements = Array.isArray(dd) ? dd : dd?.content || [];
      // Un LEAD dont la liste est VIDE ne dirige aucun département : ses sélecteurs
      // doivent rester vides (le backend refusera de toute façon toute écriture).
      if (estFiltreParPerimetre) {
        const autorises = new Set(departementsSupervises.map(Number));
        setDepartements(listeDepartements.filter(d => autorises.has(Number(d.id))));
        setPostes(listePostes.filter(p => p.departementId != null && autorises.has(Number(p.departementId))));
      } else {
        setPostes(listePostes);
        setDepartements(listeDepartements);
      }
    } finally {
      setLoading(false);
    }
  };

  useDeferredTask(load, 'mount');

  const openCreateOffre = () => { setOffreForm(EMPTY_OFFRE); setEditOffre(null); setOffreModal(true); };
  const openEditOffre = (o) => {
    setEditOffre(o);
    setOffreForm({
      titre: o.titre || '', description: o.description || '',
      typeContrat: o.typeContrat || 'CDI', lieu: o.lieu || '',
      posteId: o.posteId || '', departementId: o.departementId || '',
      sucursalId: o.sucursalId ? String(o.sucursalId) : '',
    });
    setOffreModal(true);
  };
  const saveOffre = async (e) => {
    e.preventDefault();
    if (!offreForm.titre.trim()) { toast.error('Le titre est obligatoire'); return; }
    const payload = { ...offreForm, posteId: offreForm.posteId || null, departementId: offreForm.departementId || null, sucursalId: offreForm.sucursalId ? Number(offreForm.sucursalId) : null };
    try {
      if (editOffre) await offreApi.update(editOffre.id, payload);
      else await offreApi.create(payload);
      toast.success(editOffre ? 'Offre modifiée' : 'Offre créée');
      setOffreModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };
  const toggleOffre = async (o) => {
    const next = o.statut === 'OUVERTE' ? 'FERMEE' : 'OUVERTE';
    try { await offreApi.changeStatut(o.id, next); toast.success(`Offre ${OFFRE_STATUT_META[next].label.toLowerCase()}`); load(); }
    catch { toast.error('Erreur changement de statut'); }
  };

  const validerCvFile = (file) => {
    if (!file) return null;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) return 'Le CV doit être au format PDF, DOC ou DOCX';
    if (file.size > CV_MAX_MO * 1024 * 1024) return `Le CV dépasse ${CV_MAX_MO} Mo`;
    return null;
  };

  const openCandModal = (offreId) => {
    setCandForm({ ...EMPTY_CAND, offreId: offreId ? String(offreId) : '' });
    setCandCvFile(null);
    setCandModal(true);
  };
  const openCreateCand = () => {
    // présélection : l'offre du filtre courant si elle est encore ouverte,
    // sinon l'unique offre ouverte quand il n'y en a qu'une.
    const filtree = offresOuvertes.find(o => String(o.id) === String(filterOffre));
    const preselect = filtree ? filtree.id
      : (offresOuvertes.length === 1 ? offresOuvertes[0].id : '');
    openCandModal(preselect);
  };
  const saveCand = async (e) => {
    e.preventDefault();
    if (!candForm.offreId) { toast.error('Sélectionnez une offre'); return; }
    if (!offreSelectionnee) { toast.error("L'offre sélectionnée n'est plus ouverte aux candidatures"); return; }
    if (!candForm.nomCandidat.trim() || !candForm.email.trim()) { toast.error('Nom et email obligatoires'); return; }
    const cvErr = validerCvFile(candCvFile);
    if (cvErr) { toast.error(cvErr); return; }
    const payload = {
      ...candForm,
      offreId: Number(candForm.offreId),
      telephone: candForm.telephone.trim() || null,
    };
    try {
      if (candCvFile) await candidatureApi.createAvecCv(payload, candCvFile);
      else await candidatureApi.create(payload);
      toast.success(candCvFile ? 'Candidature enregistrée avec CV' : 'Candidature enregistrée');
      setCandModal(false);
      setCandCvFile(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const joindreCv = (c) => {
    cvTargetRef.current = c;
    setUploadCvFor(c);
    cvInputRef.current?.click();
  };
  const saveCvExistant = async (id, file) => {
    const err = validerCvFile(file);
    if (err) { toast.error(err); return; }
    try {
      await candidatureApi.uploadCv(id, file);
      toast.success('CV ajouté à la candidature');
      setUploadCvFor(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur'); }
  };
  const moveCand = async (c, statut) => {
    try {
      const res = await candidatureApi.changeStatut(c.id, statut);
      const employe = res?.data?.data?.employeName;
      if (statut === 'RECRUTE' && employe) {
        toast.success(`${employe} ajouté(e) aux employés — complétez sa fiche depuis la page Employés`);
      } else {
        toast.success(`Candidature → ${PIPELINE_META[statut].label}`);
      }
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Transition non autorisée'); }
  };

  const openDossier = (c) => {
    setDossier(c);
    setVerdict({ note: c.noteEvaluation != null ? String(c.noteEvaluation) : '', avis: c.avisEvaluation || '' });
  };
  const voirCv = async (c) => {
    try {
      if (c.documentId) {
        const res = await documentApi.download(c.documentId);
        const url = URL.createObjectURL(res.data);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else if (c.cvUrl) {
        window.open(c.cvUrl, '_blank');
      } else {
        toast.error('Aucun CV pour ce candidat');
      }
    } catch { toast.error('Impossible de charger le CV'); }
  };
  const enregistrerVerdict = async (decision) => {
    try {
      await candidatureApi.evaluer(dossier.id, {
        decision,
        note: verdict.note !== '' ? Number(verdict.note) : null,
        avis: verdict.avis || null,
      });
      toast.success(`Verdict : ${DECISION_META[decision]?.label || decision}`);
      setDossier(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };
  // intelligemment depuis la candidature et son offre (poste, identité, date du jour).
  // on récupère ses métadonnées pour l'afficher (nom du fichier) sans re-téléversement.
  const openEmbauche = (c) => {
    const off = offres.find(o => o.id === c.offreId);
    setDossier(c);
    setCvCandMeta(null);
    if (c.documentId) {
      documentApi.getMetadata(c.documentId)
        .then(r => setCvCandMeta(r?.data?.data || r?.data || null))
        .catch(() => setCvCandMeta(null));
    }
    setEmbForm({
      posteId: off?.posteId ? String(off.posteId) : '',
      salaireBase: '', nui: '',
      dateEmbauche: new Date().toISOString().slice(0, 10), roleName: 'STAFF',
    });
    setEmbaucheModal(true);
  };
  const saveEmbauche = async () => {
    try {
      await candidatureApi.embaucher(dossier.id, {
        posteId: embForm.posteId || null,
        salaireBase: embForm.salaireBase !== '' ? Number(embForm.salaireBase) : null,
        nui: embForm.nui || null,
        dateEmbauche: embForm.dateEmbauche || null,
        roleName: embForm.roleName || 'STAFF',
      });
      toast.success(`${dossier.nomCandidat} ajouté(e) aux employés — complétez sa fiche depuis la page Employés`);
      setEmbaucheModal(false);
      setDossier(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Erreur lors de l'embauche"); }
  };

  const filteredCand = useMemo(() => candidatures.filter(c => {
    if (filterOffre && c.offreId !== Number(filterOffre)) return false;
    if (filterStatut && c.statut !== filterStatut) return false;
    if (filterDept) {
      const off = offres.find(o => o.id === c.offreId);
      if (String(off?.departementId || '') !== String(filterDept)) return false;
    }
    return true;
  }), [candidatures, offres, filterOffre, filterStatut, filterDept]);

  const stats = {
    ouvertes: offres.filter(o => o.statut === 'OUVERTE').length,
    candidatures: candidatures.length,
    entretien: candidatures.filter(c => c.statut === 'ENTRETIEN').length,
    recrutes: candidatures.filter(c => c.statut === 'RECRUTE').length,
  };

  return (
    <div>
      <PageHeader title="Recrutement" subtitle="Offres d'emploi et pipeline de candidatures">
        {peutGererOffres && (
          <Button onClick={() => { setTab('offres'); openCreateOffre(); }}>
            <Briefcase size={16} /> Nouvelle offre
          </Button>
        )}
      </PageHeader>

      <StatsGrid cols={4}>
        <StatCard title="Offres ouvertes" value={stats.ouvertes} icon={<Briefcase size={22} />} color="#10B981" />
        <StatCard title="Candidatures" value={stats.candidatures} icon={<Users size={22} />} color="#3B82F6" />
        <StatCard title="En entretien" value={stats.entretien} icon={<UserPlus size={22} />} color="#F59E0B" />
        <StatCard title="Recrutés" value={stats.recrutes} icon={<UserPlus size={22} />} color="#8B5CF6" />
      </StatsGrid>

      <div style={{ display: 'flex', gap: 2, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content', marginBottom: 20 }}>
        {[
          { id: 'offres', label: `Offres (${offres.length})` },
          { id: 'candidatures', label: `Candidatures (${candidatures.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', border: 'none', borderRadius: 'var(--radius-sm)',
            background: tab === t.id ? 'var(--bg-surface)' : 'transparent',
            color: tab === t.id ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            boxShadow: tab === t.id ? 'var(--shadow-xs)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Chargement…</p>
      ) : tab === 'offres' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {showSucursal && offres.length > 0 && (
            <select value={filterSuc} onChange={e => setFilterSuc(e.target.value)} title="Filtrer par succursale d'origine" style={{ padding: '9px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' }}>
              {sucursalFiltreOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {filteredOffres.length === 0 ? (
            <Card><p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              {offres.length === 0 ? "Aucune offre. Créez votre première offre d'emploi." : 'Aucune offre pour cette succursale.'}
            </p></Card>
          ) : filteredOffres.map(o => {
            const sm = OFFRE_STATUT_META[o.statut] || OFFRE_STATUT_META.OUVERTE;
            const tm = TYPE_META[o.typeContrat] || TYPE_META.CDI;
            const nbCand = candidatures.filter(c => c.offreId === o.id).length;
            return (
              <div key={o.id} style={{
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                borderLeft: `4px solid ${sm.variant === 'success' ? '#10B981' : sm.variant === 'warning' ? '#F59E0B' : '#EF4444'}`,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{o.titre}</p>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${tm.color}18`, color: tm.color, fontWeight: 700 }}>{tm.label}</span>
                    <Badge variant={sm.variant}>{sm.label}</Badge>
                    <Badge variant="default" size="sm">{nbCand} candidature{nbCand !== 1 ? 's' : ''}</Badge>
<SucursaleBadge sucursalNom={o.sucursalNom} />
                  </div>
                  {o.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description}</p>}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                    {o.lieu && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={11} />{o.lieu}</span>}
                    {o.posteName && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Briefcase size={11} />{o.posteName}</span>}
                    {o.departementNom && <span>{o.departementNom}</span>}
                    {o.datePublication && <span>Publiée le {new Date(o.datePublication).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {o.statut === 'OUVERTE' && (
                    <Button variant="ghost" size="sm" title="Nouvelle candidature pour cette offre"
                      onClick={() => openCandModal(o.id)}>
                      <UserPlus size={14} />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" title="Voir les candidatures"
                    onClick={() => { setFilterOffre(String(o.id)); setTab('candidatures'); }}>
                    <Eye size={14} />
                  </Button>
                  {peutGererOffres && (
                    <>
                      <Button variant="ghost" size="sm" title={o.statut === 'OUVERTE' ? 'Fermer l\'offre' : 'Réouvrir'} onClick={() => toggleOffre(o)}>
                        {o.statut === 'OUVERTE' ? 'Fermer' : 'Réouvrir'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditOffre(o)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)' }} onClick={() => setDeleteOffre(o)}><Trash2 size={14} /></Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Select label="Offre" value={filterOffre} onChange={e => setFilterOffre(e.target.value)}
                  options={[{ value: '', label: 'Toutes' }, ...offres.map(o => ({ value: o.id, label: o.titre }))]} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Select label="Statut" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                  options={[{ value: '', label: 'Tous' }, ...PIPELINE.map(s => ({ value: s, label: PIPELINE_META[s].label }))]} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Select label="Département" value={filterDept} onChange={e => setFilterDept(e.target.value)}
                  options={[{ value: '', label: 'Tous' }, ...departements.map(d => ({ value: d.id, label: d.name }))]} />
              </div>
              <Button onClick={openCreateCand}><UserPlus size={15} /> Nouvelle candidature</Button>
            </div>
          </Card>

          {filteredCand.length === 0 ? (
            <Card><p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              Aucune candidature pour ces filtres.
            </p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredCand.map(c => {
                const pm = PIPELINE_META[c.statut] || PIPELINE_META.NOUVELLE;
                const nexts = TRANSITIONS_AUTORISEES[c.statut] || [];
                const suivant = nexts.find(s => s !== 'REFUSEE');
                const terminal = nexts.length === 0;
                const aCv = Boolean(c.documentId || c.cvUrl);
                const cvEnCours = uploadCvFor?.id === c.id;
                return (
                  <div key={c.id} style={{
                    background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-default)', borderLeft: `4px solid ${pm.color}`,
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    {/* Vignette « document CV » — la candidature est d'abord un dossier CV */}
                    <div style={{
                      width: 82, minHeight: 104, flexShrink: 0, borderRadius: 10,
                      border: cvEnCours ? '2px solid var(--color-primary)' : (aCv ? '1px solid var(--border-default)' : '1px dashed #F59E0B'),
                      background: aCv ? 'var(--bg-hover)' : '#F59E0B10',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 5, padding: '8px 6px', textAlign: 'center',
                    }}>
                      <FileText size={22} color={aCv ? pm.color : '#F59E0B'} />
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.2, color: aCv ? 'var(--text-secondary)' : '#B45309' }}>
                        {c.documentId ? 'CV JOINT' : c.cvUrl ? 'LIEN CV' : 'AUCUN CV'}
                      </span>
                      <Button size="sm" variant={aCv ? 'secondary' : 'primary'}
                        style={{ fontSize: 10, padding: '3px 9px' }}
                        title={aCv ? 'Ouvrir le CV' : 'Joindre le CV du candidat'}
                        onClick={() => (aCv ? voirCv(c) : joindreCv(c))}>
                        {cvEnCours ? 'Fichier…' : aCv ? 'Ouvrir' : 'Joindre'}
                      </Button>
                      {aCv && (
                        <button type="button" title={c.documentId ? 'Remplacer le CV' : 'Joindre un CV'}
                          onClick={() => joindreCv(c)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                          <Upload size={12} />
                        </button>
                      )}
                    </div>

                    {/* Métadonnées du dossier + cycle de vie */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{c.nomCandidat}</p>
                        <Badge variant={pm.variant}>{pm.label}</Badge>
                        {c.employeName && (c.statut === 'RECRUTE'
                          ? <Badge variant="success" size="sm">Embauché : {c.employeName}</Badge>
                          : <Badge variant="purple" size="sm">Interne : {c.employeName}</Badge>)}
                        {c.decision && c.decision !== 'PENDING' && <Badge variant={DECISION_META[c.decision]?.variant || 'default'} size="sm">{DECISION_META[c.decision]?.label || c.decision}</Badge>}
                        {c.noteEvaluation != null && <Badge variant="default" size="sm"><Award size={10} /> {c.noteEvaluation}/20</Badge>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={11} />{c.offreTitre}</span>
                        {c.dateCandidature && <span>Candidature le {new Date(c.dateCandidature).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      <PipelineStepper statut={c.statut} />
                    </div>
                    {/* Boutons du cycle de vie */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
                      {!terminal && (
                        <Flex gap={6} wrap>
                          {suivant && suivant !== 'RECRUTE' && (
                            <Button size="sm" title={`Avancer vers « ${PIPELINE_META[suivant].label} »`}
                              onClick={() => moveCand(c, suivant)}>
                              Étape suivante : {PIPELINE_META[suivant].label}
                            </Button>
                          )}
                          {/* EVALUATION → RECRUTE : « Engager » ouvre le modal Nouvel employé pré-rempli */}
                          {suivant === 'RECRUTE' && (
                            <Button size="sm" title="Engager : modal Nouvel employé pré-rempli (identité, poste de l'offre)"
                              onClick={() => openEmbauche(c)}>
                              <UserCheck size={14} /> Engager
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" style={{ color: 'var(--color-danger)' }}
                            title="Marquer la candidature comme refusée"
                            onClick={() => moveCand(c, 'REFUSEE')}>
                            Refuser
                          </Button>
                        </Flex>
                      )}
                      <Flex gap={4} wrap>
                        <Button variant="ghost" size="sm" title="Dossier candidat (CV, évaluation, embauche)" onClick={() => openDossier(c)}>
                          <FileText size={14} />
                        </Button>
                        {aCv && (
                          <Button variant="ghost" size="sm" title="Voir le CV du candidat" onClick={() => voirCv(c)}>
                            <Eye size={14} /> Voir le CV
                          </Button>
                        )}
                        {/* Suppression réservée à l'ADMIN (aligné sur le @PreAuthorize du backend) */}
                        {isAdmin && (
                          <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)' }} title="Supprimer la candidature"
                            onClick={async () => { try { await candidatureApi.delete(c.id); toast.success('Candidature supprimée'); load(); } catch { toast.error('Erreur'); } }}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </Flex>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal offre */}
      <Modal open={offreModal} onClose={() => setOffreModal(false)}
        title={editOffre ? 'Modifier l\'offre' : 'Nouvelle offre d\'emploi'} width={620}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setOffreModal(false)}>Annuler</Button>
            <Button onClick={saveOffre}>{editOffre ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Titre *" value={offreForm.titre} onChange={setOf('titre')} placeholder="ex: Développeur Full Stack" />
          <Textarea label="Description" value={offreForm.description} onChange={setOf('description')} rows={3} placeholder="Missions, profil recherché…" />
          <FormRow>
            <Select label="Type de contrat *" value={offreForm.typeContrat} onChange={setOf('typeContrat')}
              options={Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.label }))} />
            <Input label="Lieu" value={offreForm.lieu} onChange={setOf('lieu')} placeholder="ex: Douala" />
          </FormRow>
          <FormRow>
            <Select label="Poste à pourvoir" value={offreForm.posteId} onChange={setOf('posteId')}
              options={[{ value: '', label: 'Aucun' }, ...postes.map(p => ({ value: p.id, label: p.name }))]} />
            <Select label="Département" value={offreForm.departementId} onChange={setOf('departementId')}
              options={[{ value: '', label: 'Aucun' }, ...departements.map(d => ({ value: d.id, label: d.name }))]} />
          </FormRow>
          <SucursaleField showSucursal={showSucursal} value={offreForm.sucursalId} onChange={setOf('sucursalId')}
            options={sucursalFormOptions} compteAncre={compteAncre} sucursalUtilisateurNom={sucursalUtilisateurNom} />
        </div>
      </Modal>

      {/* Modal candidature */}
      <Modal open={candModal} onClose={() => setCandModal(false)}
        title="Nouvelle candidature" width={620}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setCandModal(false)}>Annuler</Button>
            <Button onClick={saveCand}>Enregistrer</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Offre *" value={candForm.offreId} onChange={setC('offreId')}
            options={[{ value: '', label: 'Sélectionner une offre…' },
              ...offresOuvertes.map(o => ({ value: o.id, label: o.lieu ? `${o.titre} — ${o.lieu}` : o.titre }))]} />
          {offresOuvertes.length === 0 ? (
            <Alert variant="warning" title="Aucune offre ouverte">
              Créez ou rouvrez une offre depuis l'onglet « Offres » pour y déposer une candidature.
            </Alert>
          ) : offreSelectionnee && (
            <Card padding={12} shadow={false}
              style={{ background: 'var(--bg-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoRow label="Poste à pourvoir" value={offreSelectionnee.posteName} />
              <InfoRow label="Département" value={offreSelectionnee.departementNom} />
              <InfoRow label="Contrat" value={TYPE_META[offreSelectionnee.typeContrat]?.label || offreSelectionnee.typeContrat} />
              <InfoRow label="Lieu" value={offreSelectionnee.lieu} />
              <InfoRow label="Candidatures reçues" value={offreSelectionnee.nbCandidatures ?? 0} />
            </Card>
          )}
          <FormRow>
            <Input label="Nom du candidat *" value={candForm.nomCandidat} onChange={setC('nomCandidat')} />
            <Input label="Email *" type="email" value={candForm.email} onChange={setC('email')} />
          </FormRow>
          <Input label="Téléphone" value={candForm.telephone} onChange={setC('telephone')} />
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Fichier CV (optionnel)
            </label>
            <Flex align="center" gap={8} wrap>
              <input type="file" accept={CV_ACCEPT}
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  e.target.value = '';
                  if (!f) return;
                  const err = validerCvFile(f);
                  if (err) { toast.error(err); return; }
                  setCandCvFile(f);
                }} />
              {candCvFile && (
                <Button type="button" size="sm" variant="ghost" style={{ color: 'var(--color-danger)' }}
                  onClick={() => setCandCvFile(null)}>Retirer</Button>
              )}
            </Flex>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              {candCvFile ? `Sélectionné : ${candCvFile.name}` : 'Formats acceptés : PDF, DOC, DOCX (10 Mo max).'}
            </p>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            Le CV est optionnel au dépôt : s'il est joint, il suivra automatiquement le
            candidat jusqu'à sa fiche employé (aucun second téléversement).
          </p>
        </div>
      </Modal>

      <Drawer open={!!dossier} onClose={() => setDossier(null)} title={`Dossier candidat — ${dossier?.nomCandidat || ''}`} width={560}>
        {dossier && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card padding={16}>
              <SectionTitle>Identité</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <InfoRow label="Email" value={dossier.email} />
                <InfoRow label="Téléphone" value={dossier.telephone || '—'} />
                <InfoRow label="Offre" value={dossier.offreTitre || '—'} />
                <InfoRow label="Statut pipeline" value={PIPELINE_META[dossier.statut]?.label || dossier.statut} />
                <InfoRow label="Candidaté le" value={dossier.dateCandidature ? new Date(dossier.dateCandidature).toLocaleDateString('fr-FR') : '—'} />
              </div>
              <Flex gap={8} style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" onClick={() => voirCv(dossier)}><FileText size={14} /> Voir le CV</Button>
                <Button size="sm" variant="secondary" onClick={() => joindreCv(dossier)}>
                  <Upload size={14} /> {dossier.documentId ? 'Remplacer le CV' : 'Joindre un CV'}
                </Button>
              </Flex>
            </Card>

            <Card padding={16}>
              <SectionTitle>Pré-évaluation</SectionTitle>
              {dossier.avisEvaluation && <Alert variant="info" style={{ marginBottom: 10 }}>{dossier.avisEvaluation}</Alert>}
              <FormRow>
                <Input label="Note /20 (optionnel)" type="number" min={0} max={20} step="0.5"
                  value={verdict.note} onChange={e => setVerdict(v => ({ ...v, note: e.target.value }))} />
                <Select label="Verdict actuel" value={dossier.decision || 'PENDING'}
                  options={Object.entries(DECISION_META).map(([k, v]) => ({ value: k, label: v.label }))} disabled />
              </FormRow>
              <Textarea label="Avis (optionnel)" rows={2} value={verdict.avis}
                onChange={e => setVerdict(v => ({ ...v, avis: e.target.value }))}
                placeholder="Points forts, réserves…" />
              <Flex gap={8} style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" onClick={() => enregistrerVerdict('A_EVALUER')}><Award size={14} /> À évaluer</Button>
                <Button size="sm" variant="secondary" onClick={() => enregistrerVerdict('EN_STAGE')}><UserCheck size={14} /> En stage</Button>
                <Button size="sm" onClick={() => openEmbauche(dossier)}><UserPlus size={14} /> Engager</Button>
                <Button size="sm" variant="danger" onClick={() => enregistrerVerdict('REFUSE_AVANT')}><Trash2 size={14} /> Refuser</Button>
              </Flex>
            </Card>
          </div>
        )}
      </Drawer>

      <Modal open={embaucheModal} onClose={() => setEmbaucheModal(false)}
        title={`Nouvel employé — ${dossier?.nomCandidat || ''}`} width={560}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEmbaucheModal(false)}>Annuler</Button>
            <Button onClick={saveEmbauche}><UserCheck size={15} /> Confirmer l'embauche</Button>
          </div>
        }>
        <Alert variant="info" style={{ marginBottom: 14 }}>
          Identité reprise de la candidature — un compte actif sera créé (mot de passe temporaire généré).
          Le CV joint à la candidature est reconduit automatiquement sur la fiche employé.
          Les informations restantes (date de naissance, NUI, RIB…) se complètent ensuite depuis la page Employés.
        </Alert>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {dossier && (
            <Card padding={12}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <InfoRow label="Candidat" value={dossier.nomCandidat} />
                <InfoRow label="Email" value={dossier.email} />
                {dossier.telephone && <InfoRow label="Téléphone" value={dossier.telephone} />}
                <InfoRow label="Offre" value={dossier.offreTitre || '—'} />
              </div>
            </Card>
          )}
          {(dossier?.documentId || dossier?.cvUrl) ? (
            <Card padding={12} style={{ background: 'var(--bg-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <InfoRow label="CV repris de la candidature"
                    value={cvCandMeta?.nomFichier || cvCandMeta?.nom || 'document joint au dossier'} />
                  <InfoRow label="Rattachement" value="Fiche employé + documents reçus" />
                </div>
                <Button size="sm" variant="secondary" onClick={() => voirCv(dossier)}><Eye size={14} /> Voir le CV</Button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                Aucun second téléversement : le CV déposé avec la candidature devient le CV de l'employé
                (visible dans sa fiche, page Employés).
              </p>
            </Card>
          ) : (
            <Alert variant="warning">
              Aucun CV au dossier : le CV de l'employé pourra être joint plus tard depuis la page Employés
              ou depuis le dossier candidat.
            </Alert>
          )}
          <FormRow>
            <Select label="Poste" value={embForm.posteId} onChange={setEmb('posteId')}
              options={[{ value: '', label: offres.find(o => o.id === dossier?.offreId)?.posteName ? `Poste de l'offre : ${offres.find(o => o.id === dossier?.offreId)?.posteName}` : 'Poste de l\'offre' }, ...postes.map(p => ({ value: p.id, label: p.name }))]} />
            <Select label="Rôle" value={embForm.roleName} onChange={setEmb('roleName')}
              options={[{ value: 'STAFF', label: 'Employé (STAFF)' }, { value: 'LEAD', label: 'Lead (chef de département)' }, { value: 'MANAGER', label: 'Manager' }, { value: 'ADMIN', label: 'Admin' }]} />
          </FormRow>
          <FormRow>
            <Input label="NUI" value={embForm.nui} onChange={setEmb('nui')} placeholder="Auto si vide" />
            <Input label="Date d'embauche" type="date" value={embForm.dateEmbauche} onChange={setEmb('dateEmbauche')} />
          </FormRow>
          <Input label="Salaire brut (FCFA)" type="number" min={0} value={embForm.salaireBase} onChange={setEmb('salaireBase')} placeholder="ex: 250000" />
        </div>
      </Modal>

      <Confirm
        open={!!deleteOffre}
        onClose={() => setDeleteOffre(null)}
        onConfirm={async () => { try { await offreApi.delete(deleteOffre.id); toast.success('Offre supprimée'); setDeleteOffre(null); load(); } catch { toast.error('Erreur'); } }}
        title="Supprimer l'offre"
        message={`Supprimer l'offre « ${deleteOffre?.titre} » et toutes ses candidatures ?`}
        confirmLabel="Supprimer"
      />

      <input ref={cvInputRef} type="file" accept={CV_ACCEPT} style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0] || null;
          e.target.value = '';
          const cible = cvTargetRef.current;
          if (f && cible) saveCvExistant(cible.id, f);
        }} />
    </div>
  );
}
