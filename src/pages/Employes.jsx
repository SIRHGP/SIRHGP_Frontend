import { useState, useEffect, useRef } from 'react';
import { UserCheck, UserX, Pencil, Trash2, Eye, Phone, Mail, Download, FileText, Upload, Wallet, Award, Plus } from 'lucide-react';
import { employerApi, departementApi, posteApi, roleApi, paieApi, documentApi, sucursalApi, evaluationApi, fetchAllPages } from '../Api';
import api from '../Api';
import { calcCotisations } from '../utils/paieCalc';
import { useAuth } from '../contexts/Authcontext';
import { useDeferredTask } from '../hooks/useDeferredTask';
import { useNotifications } from '../contexts/NotificationContext';
import { PageHeader, Card, Table, Badge, Button, Modal, Input, Textarea, Select, Confirm, SearchInput, Avatar, StatCard, StatsGrid, FormRow, Drawer, InfoRow, Alert, Empty, SectionTitle } from '../components/ui';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '',
  email: '',
  motDePasse: '',
  dateNaiss: '',
  lieu: '',
  region: '',
  residence: '',
  numeroTelephone: '',
  dateEmbauche: '',
  departementId: null,  // filtre les postes (le département effectif = celui du poste choisi)
  posteId: null,        
  roleId: null,         // ← CHANGÉ: null au lieu de ''
  managerId: null,      // Hiérarchie (2.1)
  sucursalId: null,     // Hiérarchie (3.4) — succursale de rattachement
  // Champs paie (Cameroun)
  salaireBase: '',
  nui: '',
  rib: '',
  contratUrl: '',
  cvUrl: '',
};

export default function Employes() {
  const { user } = useAuth();
  const { notifyEvaluation } = useNotifications();
  // Phase 2 — hiérarchie : LEAD est superviseur → lecture seule sur les employés.
  // par l'API) mais reste en lecture seule : ni création directe (déjà refusée par
  // l'API, il recrute via le module Recrutement), ni édition, ni suppression.
  const lectureSeule = !['SUPER_ADMIN', 'ADMIN'].includes(user?.roleName);
  const peutGererEmployes = user?.roleName === 'ADMIN';
  // Rôle de gestion « globale » : garde aussi les écrans financiers (salaire affiché
  // dans la fiche, cf. plus bas) que le LEAD ne doit pas voir.
  const roleGestion = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.roleName);
  // (garde de périmètre côté API + service). Le LEAD reste en lecture seule
  // pour tout le reste (édition, suppression, activation).
  // Hiérarchie (3.4) : la colonne/filtre/formulaire Succursale est réservé aux
  // rôles qui voient plusieurs succursales (ADMIN = entreprise, SUPER_ADMIN = plateforme).
  const showSucursal = ['ADMIN', 'SUPER_ADMIN'].includes(user?.roleName);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postes, setPostes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [sucursales, setSucursales] = useState([]); // Hiérarchie (3.4)
  // Filtres liste : département / poste / rôle / statut (+ recherche texte existante)
  const [filterDepartement, setFilterDepartement] = useState('');
  const [filterPoste, setFilterPoste] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterSucursal, setFilterSucursal] = useState(''); // Hiérarchie (3.4)
  const cvInputRef = useRef(null);
  const contratInputRef = useRef(null);
  const [stats, setStats] = useState({ total: 0, actifs: 0, inactifs: 0 });
  const [viewEmp, setViewEmp] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Upload CV / contrat de travail (modal création/modification)
  // En création : le fichier est seulement SÉLECTIONNÉ (choisi depuis les dossiers
  // de la machine via l'input file natif) puis téléversé dans handleSave, APRÈS la
  // création de l'employé — le document est alors lié à l'utilisateur via employerId.
  // En édition (employé existant) : téléversement immédiat, lié via employerId.
  const [fileCv, setFileCv] = useState(null);
  const [fileContrat, setFileContrat] = useState(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingContrat, setUploadingContrat] = useState(false);
  const [, setDocIdCv] = useState(null);
  const [, setDocIdContrat] = useState(null);

  const extractDownloadId = (uploadRes) => {
    const d = uploadRes?.data?.data || uploadRes?.data;
    if (d?.id) return d.id;
    return null;
  };

  const buildDocPayload = (file, kind, employeId) => ({
    nom: `${kind}_${form.name || form.email || file.name}`,
    description: kind === 'CV' ? 'CV de ' + (form.name || form.email || '') : 'Contrat de travail de ' + (form.name || form.email || ''),
    type: 'AUTRE',
    publique: false,
    // ⚠️ Le backend exige destinataireId (uploadWithDispatch) : le document est
    // envoyé à l'employé → visible dans ses documents reçus (fiche employé).
    ...(employeId ? { destinataireId: employeId } : {}),
  });

  // Téléverse un fichier et retourne l'URL de téléchargement (ou null en cas d'échec)
  const uploadDocumentFile = async (file, kind, employeId) => {
    const res = await documentApi.upload(buildDocPayload(file, kind, employeId), file);
    const id = extractDownloadId(res);
    return id ? { id, url: `/api/documents/${id}/download` } : { id: null, url: file.name };
  };

  // Handlers du modal : en création on ne fait que SÉLECTIONNER le fichier
  // (choisi depuis les dossiers de la machine) ; en édition on téléverse aussitôt
  // car l'employé existe déjà et le document peut lui être lié via employerId.
  const handleUploadCv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileCv(file);
    if (!editItem?.id) {
      setDocIdCv(null);
      toast.success(`CV "${file.name}" sélectionné — il sera téléversé à la création`);
      return;
    }
    setUploadingCv(true);
    try {
      const { id, url } = await uploadDocumentFile(file, 'CV', editItem.id);
      setDocIdCv(id);
      setForm(prev => ({ ...prev, cvUrl: url }));
      toast.success(`CV "${file.name}" téléversé et lié à l'employé`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erreur lors de l'upload du CV");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleUploadContrat = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileContrat(file);
    if (!editItem?.id) {
      setDocIdContrat(null);
      toast.success(`Contrat "${file.name}" sélectionné — il sera téléversé à la création`);
      return;
    }
    setUploadingContrat(true);
    try {
      const { id, url } = await uploadDocumentFile(file, 'CONTRAT', editItem.id);
      setDocIdContrat(id);
      setForm(prev => ({ ...prev, contratUrl: url }));
      toast.success(`Contrat "${file.name}" téléversé et lié à l'employé`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erreur lors de l'upload du contrat");
    } finally {
      setUploadingContrat(false);
    }
  };

  // Fin des handlers upload

  // Visualisation documents (modal détail employé)
  const [documents, setDocuments] = useState([]);
  const [, setDocsLoading] = useState(false);
  const [, setOpenDocumentsModal] = useState(false);

  const loadDocuments = async (employeId, open = true) => {
    if (!employeId) return;
    setDocsLoading(true);
    try {
      const [recus, envoyes] = await Promise.all([
        documentApi.getReceived(employeId).catch(() => null),
        documentApi.getSent(employeId).catch(() => null),
      ]);
      const list = [
        ...((recus?.data?.data || recus?.data) || []),
        ...((envoyes?.data?.data || envoyes?.data) || []),
      ];
      // Dédupliquer par id
      const seen = new Set();
      setDocuments(list.filter(d => d?.id != null && !seen.has(d.id) && (seen.add(d.id), true)));
      if (open) setOpenDocumentsModal(true);
    } catch {
      toast.error('Erreur chargement des documents');
    } finally {
      setDocsLoading(false);
    }
  };

  const downloadDocument = async (doc) => {
    try {
      const res = await documentApi.download(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nomFichier || doc.nom || `document_${doc.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Impossible de télécharger le document');
    }
  };

  // Card document (CV / Contrat) affichée directement dans la fiche employé
  // ⚠️ Les CV/contrats sont téléversés avec type='AUTRE' (enum backend sans CV) :
  // on les retrouve par le préfixe de nom 'CV_' / 'CONTRAT_' (le plus récent d'abord).
  const findEmployeeDoc = (kind) => {
    const matches = documents.filter(d =>
      (d.nom || '').toUpperCase().startsWith(`${kind}_`));
    if (matches.length > 1) {
      matches.sort((a, b) => new Date(b.dateEnvoi || 0) - new Date(a.dateEnvoi || 0));
    }
    return matches[0] || null;
  };

  const renderDocCard = ({ label, kind, url, color }) => {
    const doc = findEmployeeDoc(kind);
    const has = !!doc || !!url;
    return (
      <div style={{
        flex: '1 1 220px', border: '1px solid var(--border, #e5e7eb)', borderRadius: 'var(--radius-md)',
        padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FileText size={18} style={{ color }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
          <Badge size="sm" variant={has ? 'success' : 'default'}>
            {has ? 'Disponible' : 'Aucun'}
          </Badge>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, minHeight: 30, wordBreak: 'break-word' }}>
          {doc
            ? (doc.nom || doc.nomFichier || `Document #${doc.id}`)
            : url ? `${label} (fiche employé)` : `Aucun ${label.toLowerCase()} téléversé pour cet employé.`}
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
          {doc ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => previewDocument(doc)}><Eye size={14} /> Visualiser</Button>
              <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)}><Download size={14} /> Télécharger</Button>
            </>
          ) : url ? (
            <Button variant="secondary" size="sm" onClick={() => previewUrl(url)}><Eye size={14} /> Visualiser</Button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      </div>
    );
  };

  const previewDocument = async (doc) => {
    try {
      const res = await documentApi.download(doc.id);
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Impossible de visualiser le document');
    }
  };

  // Visualisation d'une URL relative (cvUrl/contratUrl de la fiche) avec le token
  // JWT : on ne peut pas ouvrir le lien directement (header Authorization manquant).
  const previewUrl = async (url) => {
    try {
      const m = url.match(/documents\/(\d+)\/download/);
      if (m) {
        await previewDocument({ id: m[1], nom: 'document' });
        return;
      }
      const res = await api.get(url.replace(/^\/api/, ''), { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      toast.error('Impossible de visualiser le document');
    }
  };

  /* Ouverture de la modal détail au clic sur un employé */
  const openDetail = async (row) => {
    // La ligne du tableau peut venir d'un cache/pagination avec des champs
    // null : on affiche la fiche en mode "chargement" puis on remplit avec
    // le GET byId complet (seule source fiable des vraies valeurs).
    setViewEmp(row);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    setDocuments([]); // reset avant rechargement des documents
    loadDocuments(row.id, false); // cards CV / Contrat de la fiche
    try {
      const d = await employerApi.getById(row.id);
      // d = réponse Axios ; d.data = enveloppe ApiResponse { success, message, data } ;
      // l'employé réel (EmployerResponseDTO) est dans d.data.data.
      // NB : dans certaines configs, d.data.data est une Page (avec "content")
      // et le vrai DTO est un élément de content → on le retrouve par id, sinon 1er.
      // Si l'enveloppe est inattendue, signaler l'échec au lieu d'afficher des valeurs de liste comme détail complet.
      let payload = d?.data?.data ?? d?.data ?? null;
      // Sécurité : si on a encore une enveloppe { success, data }, on déballe une fois de plus
      // (mais PAS si l'objet ressemble déjà à un employé : il a name/email)
      if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload && !('name' in payload) && !('email' in payload)) {
        payload = payload.data;
      }
      let dto = payload;
      if (payload && typeof payload === 'object' && Array.isArray(payload.content) && !('name' in payload)) {
        dto = payload.content.find(e => String(e?.id) === String(row.id)) || payload.content[0] || null;
      }
      // Fusion SÛRE sur le DTO complet du backend (jamais la ligne du tableau :
      // elle peut contenir des null venus du cache/pagination).
      // Les valeurs vides (null / undefined / '') du GET sont ignorées.
      if (dto && typeof dto === 'object') {
        setDetail(dto);
      } else {
        setDetailError('La réponse du serveur ne contient pas la fiche complète de cet employé.');
      }
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Impossible de charger la fiche complète depuis le serveur.');
    } finally {
      setDetailLoading(false);
    }
  };

  const [fiche, setFiche] = useState(null);
  const [ficheData, setFicheData] = useState(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheErr, setFicheErr] = useState('');
  const [fichePeriode, setFichePeriode] = useState(() => {
    const now = new Date();
    return { mois: String(now.getMonth() + 1), annee: String(now.getFullYear()) };
  });
  const [ficheVar, setFicheVar] = useState({ primes: '', motif: '' });
  const [ficheGenerant, setFicheGenerant] = useState(false);

  const RANG = { STAGIAIRE: 1, STAFF: 2, LEAD: 3, MANAGER: 4, ADMIN: 5 };
  const peutEvaluer = (row) => {
    const maRang = RANG[user?.roleName];
    const sonRang = RANG[row?.roleName];
    if (!maRang || !sonRang || sonRang >= maRang) return false;
    if (['LEAD', 'MANAGER', 'ADMIN'].includes(user?.roleName)) return row?.actif !== false;
    return false;
  };

  const [evalTarget, setEvalTarget] = useState(null); // employé à évaluer
  const [evalKpi, setEvalKpi] = useState(null);
  const [evalKpiLoading, setEvalKpiLoading] = useState(false);
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalCriteres, setEvalCriteres] = useState([{ libelle: '', note: '' }]);
  const [evalForm, setEvalForm] = useState({
    type: 'ANNUELLE', categorie: 'PROMOTION', objet: '',
    commentaire: '', dateEvaluation: new Date().toISOString().slice(0, 10),
  });
  const setEvalF = (k) => (e) => setEvalForm(f => ({ ...f, [k]: e.target.value }));

  const openEvaluation = async (row) => {
    setEvalTarget(row);
    setEvalKpi(null);
    setEvalForm({
      type: 'ANNUELLE', categorie: 'PROMOTION', objet: '',
      commentaire: '', dateEvaluation: new Date().toISOString().slice(0, 10),
    });
    setEvalCriteres([{ libelle: '', note: '' }]);
    setEvalKpiLoading(true);
    try {
      const res = await evaluationApi.kpi(row.id);
      setEvalKpi(res.data?.data || res.data);
    } catch { setEvalKpi(null); }
    finally { setEvalKpiLoading(false); }
  };
  const closeEvaluation = () => { setEvalTarget(null); setEvalKpi(null); };

  const setEvalCritere = (i, k, v) => {
    const next = [...evalCriteres];
    next[i][k] = v;
    setEvalCriteres(next);
  };

  const enregistrerEvaluation = async () => {
    if (!evalTarget) return;
    if (!evalForm.objet.trim()) { toast.error("L'objet de l'évaluation est obligatoire"); return; }
    const criteresOk = evalCriteres
      .filter(c => c.libelle.trim() !== '')
      .map(c => ({ libelle: c.libelle.trim(), note: Number(c.note) || 0 }));
    if (criteresOk.length === 0) { toast.error('Ajoutez au moins un critère'); return; }
    setEvalSaving(true);
    try {
      const res = await evaluationApi.create({
        type: evalForm.type, categorie: evalForm.categorie, objet: evalForm.objet.trim(),
        commentaire: evalForm.commentaire || null,
        dateEvaluation: evalForm.dateEvaluation || null,
        evalueId: evalTarget.id, criteres: criteresOk,
      });
      const created = res.data?.data || res.data;
      if (created?.statut === 'SOUMISE' && created?.valideurId) {
        notifyEvaluation({ action: 'soumise', evaluation: created, targetUserId: created.valideurId });
      } else {
        toast.success(created?.statut === 'VALIDEE'
          ? `Évaluation de ${evalTarget.name} enregistrée et validée`
          : 'Évaluation enregistrée (brouillon)');
      }
      closeEvaluation();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Échec de l'enregistrement de l'évaluation");
    } finally {
      setEvalSaving(false);
    }
  };


  const MOIS_OPTIONS = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2024, i, 1);
    return { value: String(i + 1), label: d.toLocaleDateString('fr-FR', { month: 'long' }) };
  });

  const moisfmt = (m, a) => {
    const d = new Date(a, m - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };
  const fmtFa = (v) => v == null || v === '' ? '—' : (Number(v)).toLocaleString('fr-FR') + ' FCFA';

  // Jours ouvrables (lun–ven) du mois courant — même règle que le backend (PaieService)
  const joursOuvresMoisCourant = () => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    let n = 0;
    const d = new Date(y, m, 1);
    while (d.getMonth() === m) {
      const w = d.getDay();
      if (w !== 0 && w !== 6) n++;
      d.setDate(d.getDate() + 1);
    }
    return n || 1; // éviter la division par zéro
  };

  const openFiche = async (row) => {
    setFiche(row);
    setFicheData(null);
    setFicheVar({ primes: '', motif: '' });
    setFicheErr('');
    await loadFiche(row.id);
  };
  const closeFiche = () => { setFiche(null); setFicheData(null); };

  // Génère le bulletin du mois → il apparaît automatiquement dans la liste de la page Paie
  const genererFiche = async () => {
    if (!fiche?.id) return;
    setFicheGenerant(true);
    try {
      await paieApi.genererUnitaire({
        employeId: fiche.id,
        mois: Number(fichePeriode.mois),
        annee: Number(fichePeriode.annee),
        primes: ficheVar.primes !== '' && !isNaN(Number(ficheVar.primes)) ? Number(ficheVar.primes) : 0,
        indemnites: 0,
        retenuesDiverses: Number(ficheData?.retenuesAbsences || 0) + Number(ficheData?.retenuesRetards || 0),
      });
      toast.success('Fiche de paie générée — visible dans la liste de la page Paie');
      closeFiche();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la génération de la fiche');
    } finally { setFicheGenerant(false); }
  };

  const loadFiche = async (empId = fiche?.id, mois = fichePeriode.mois, annee = fichePeriode.annee) => {
    if (!empId) return;
    setFicheLoading(true); setFicheErr('');
    try {
      const res = await paieApi.heuresEmploye(empId, Number(mois), Number(annee));
      const d = res.data?.data || res.data;
      setFicheData(d);
      setFicheVar({
        primes: d.primes ? String(d.primes) : '',
        motif: '',
      });
    } catch (e) {
      setFicheErr(e.response?.data?.message || 'Erreur chargement des heures');
      setFicheData(null);
    } finally { setFicheLoading(false); }
  };

  const load = async (p = 0) => {
    try {
      const res = await employerApi.getAll({ page: p, size: 20 });
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : d?.content || [];
      setData(list);
      setTotalPages(d?.totalPages || 1);
      // Utiliser les stats globales du backend si disponibles, sinon calculer sur la page
      setStats({ 
        total: d?.totalElements ?? list.length, 
        actifs: d?.actifs ?? list.filter(e => e.actif).length, 
        inactifs: d?.inactifs ?? list.filter(e => !e.actif).length 
      });
    } catch { 
      toast.error('Erreur chargement'); 
    } finally { 
      setLoading(false); 
    }
  };

  useDeferredTask(() => load(page), page);

  useEffect(() => {
    const peutLireOrganisation = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LEAD'].includes(user?.roleName);
    Promise.all([
      peutLireOrganisation ? fetchAllPages(posteApi.getAll, 100) : Promise.resolve(null),
      roleApi.filtres(),
      peutLireOrganisation ? fetchAllPages(departementApi.getAll, 100) : Promise.resolve(null),
      peutLireOrganisation ? sucursalApi.getAll() : Promise.resolve(null),
    ]).then(([p, r, d, s]) => {
      const pd = p || [];
      setPostes(Array.isArray(pd) ? pd : pd?.content || []);
      const rd = r.data?.data || r.data; 
      setRoles(Array.isArray(rd) ? rd : rd?.content || []);
      const dd = d || [];
      setDepartements(Array.isArray(dd) ? dd : dd?.content || []);
      const sd = s?.data?.data || s?.data;
      setSucursales(Array.isArray(sd) ? sd : sd?.content || []);

    }).catch(() => {
      // Les listes de référence restent optionnelles ; les erreurs sont gérées
      // séparément du chargement des employés.
    });
  }, [user?.roleName]);

  const filtered = data.filter(e => {
    const q = search.trim().toLowerCase();
    const matchText = !q
      || e.name?.toLowerCase().includes(q)
      || e.email?.toLowerCase().includes(q);
    // Le périmètre d'accès du MANAGER est appliqué par l'API (succursale).
    // Le filtre département ci-dessous ne sert qu'au filtrage volontaire de la liste.
    const matchDept = !filterDepartement
      || String(e.departementId ?? '') === String(filterDepartement);
    const matchPoste = !filterPoste
      || String(e.posteId ?? '') === String(filterPoste);
    const matchRole = !filterRole
      || String(e.roleId ?? e.roleName ?? '') === String(filterRole);
    const matchStatut = filterStatut === ''
      || (filterStatut === 'actif' ? e.actif === true : e.actif === false);
    const matchSucursal = !filterSucursal
      || String(e.sucursalId ?? '') === String(filterSucursal);
    return matchText && matchDept && matchPoste && matchRole && matchStatut && matchSucursal;
  });

  // Postes filtrés par département (modal création/édition)
  const postesFiltresModal = form.departementId
    ? postes.filter(p => String(p.departementId ?? '') === String(form.departementId))
    : postes;

  const openCreate = () => { 
    setForm(EMPTY_FORM); 
    setEditItem(null);
    setFileCv(null); setFileContrat(null);
    setDocIdCv(null); setDocIdContrat(null);
    setModalOpen(true); 
  };

  // CHANGÉ: Correction des IDs + rechargement du détail complet avant édition
  // (la ligne du tableau peut avoir des champs NULL si elle vient d'un cache/pagination ;
  // le GET byId garantit le formulaire pré-rempli avec les vraies valeurs persistées).
  const openEdit = async (item) => {
    let full;
    try {
      const res = await employerApi.getById(item.id);
      // Enveloppe Axios : res.data = ApiResponse { success, message, data? } ou Page.
      // Le DTO employé (objet, sans "content") peut être dans data.data ou data.
      // NB : dans certaines configs, res.data.data est une Page (avec "content")
      // et le vrai DTO est un élément de content → on le retrouve par id, sinon 1er.
      let payload = res?.data?.data ?? res?.data ?? null;
      if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload && !('name' in payload) && !('email' in payload)) {
        payload = payload.data;
      }
      let dto = payload;
      if (payload && typeof payload === 'object' && Array.isArray(payload.content) && !('name' in payload)) {
        dto = payload.content.find(e => String(e?.id) === String(item.id)) || payload.content[0] || null;
      }
      if (dto && typeof dto === 'object') {
        full = dto;
      } else {
        throw new Error('Réponse de détail employé invalide');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible de charger les données complètes de la fiche.');
      return;
    }
    // Le département effectif vient du poste (poste.departement) ; repli sur departementId si présent
    const posteMatch = postes.find(p => String(p.id) === String(full.posteId));
    setEditItem(full);
    setForm({ 
      name: full.name || '', 
      email: full.email || '', 
      motDePasse: '', 
      dateNaiss: full.dateNaiss || '', 
      lieu: full.lieu || '', 
      region: full.region || '', 
      residence: full.residence || '', 
      numeroTelephone: full.numeroTelephone || '', 
      dateEmbauche: full.dateEmbauche || '', 
      departementId: full.departementId ?? posteMatch?.departementId ?? null,
      posteId: full.posteId || null,      // ← CHANGÉ
      roleId: full.roleId || null,        // ← CHANGÉ
      managerId: full.managerId || null,  // Hiérarchie (2.1)
      sucursalId: full.sucursalId || null, // Hiérarchie (3.4)
      salaireBase: full.salaireBase ?? '',
      nui: full.nui || '',
      rib: full.rib || '',
      contratUrl: full.contratUrl || '',
      cvUrl: full.cvUrl || '',
    });
    setFileCv(null); setFileContrat(null);
    setDocIdCv(null); setDocIdContrat(null);
    setModalOpen(true);
  };

  // CHANGÉ: Version complète avec validation
  const handleSave = async (e) => {
    e.preventDefault();
    
    // ✅ Validation
    const errors = [];
    if (!form.name?.trim()) errors.push('Le nom est obligatoire');
    if (!form.email?.trim()) errors.push('L\'email est obligatoire');
    if (!form.email?.includes('@')) errors.push('Format d\'email invalide');
    if (!editItem && !form.motDePasse?.trim()) errors.push('Le mot de passe est obligatoire');
    if (!editItem && form.motDePasse?.length < 8) errors.push('Le mot de passe doit faire au moins 8 caractères');
    if (!form.posteId) errors.push('Le poste est obligatoire');
    if (!form.roleId) errors.push('Le rôle est obligatoire');
    // Hiérarchie (3.4) : le rôle MANAGER doit être ancré à une succursale
    // (le backend refuse la création/modification dans le cas contraire).
    const roleChoisi = roles.find(r => String(r.id) === String(form.roleId));
    if (showSucursal && roleChoisi?.name === 'MANAGER' && !form.sucursalId) {
      errors.push('La succursale est obligatoire pour le rôle MANAGER');
    }
    
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }
    
    // ✅ Préparation des données
    // Le département effectif est celui du poste (backend : poste.departement) :
    // on ne l'envoie pas, on vérifie juste la cohérence poste ↔ département choisi.
    const posteChoisi = postes.find(p => String(p.id) === String(form.posteId));
    if (form.departementId && posteChoisi?.departementId != null
        && String(posteChoisi.departementId) !== String(form.departementId)) {
      toast.error('Le poste choisi appartient à un autre département');
      return;
    }
    // Fichiers CV / contrat : en CRÉATION ils sont téléversés APRÈS la création
    // de l'employé (le backend exige un destinataireId = id de l'employé).
    // En ÉDITION le téléversement est déjà fait immédiatement dans les handlers.
    const cvUrl = form.cvUrl || null;
    const contratUrl = form.contratUrl || null;
    const dataToSend = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      dateNaiss: form.dateNaiss || null,
      lieu: form.lieu || null,
      region: form.region || null,
      residence: form.residence || null,
      numeroTelephone: form.numeroTelephone ? form.numeroTelephone.replace(/\s/g, '') : null,
      dateEmbauche: form.dateEmbauche || null,
      posteId: Number(form.posteId),     // ← CHANGÉ: Conversion en nombre
      roleId: Number(form.roleId),       // ← CHANGÉ: Conversion en nombre
      // Champs paie (Cameroun)
      salaireBase: form.salaireBase ? Number(form.salaireBase) : null,
      nui: form.nui || null,
      rib: form.rib || null,
      contratUrl: contratUrl,
      cvUrl: cvUrl,
      // Hiérarchie (2.1 organigramme)
      managerId: form.managerId ? Number(form.managerId) : null,
      // Hiérarchie (3.4) : null = inchangée côté backend (convention PATCH partiel)
      sucursalId: form.sucursalId ? Number(form.sucursalId) : null,
    };
    
    if (!editItem) {
      dataToSend.motDePasse = form.motDePasse;
    }
    
    setSaving(true);
    try {
      if (editItem) {
        // Le DTO update interdit notamment l'email et les données inchangées en base
        // peuvent être historiques (date/téléphone). N'envoyer que les champs
        // réellement modifiés et gérés par EmployerUpdateDTO.
        const updateFields = [
          'name', 'dateNaiss', 'lieu', 'region', 'residence', 'numeroTelephone',
          'dateEmbauche', 'posteId', 'roleId', 'salaireBase', 'nui', 'rib', 'cvUrl', 'sucursalId',
        ];
        const updatePayload = Object.fromEntries(updateFields
          .filter((key) => {
            const next = dataToSend[key];
            const current = editItem[key];
            if (next === undefined || next === null || next === '') return false;
            if (['posteId', 'roleId', 'sucursalId'].includes(key)) {
              return String(next) !== String(current ?? '');
            }
            if (key === 'salaireBase') return Number(next) !== Number(current ?? 0);
            return String(next).trim() !== String(current ?? '').trim();
          })
          .map((key) => [key, dataToSend[key]]));
        // Si rien n'a changé, ne pas envoyer un PUT vide.
        if (!Object.keys(updatePayload).length) {
          toast.success('Aucune modification');
          setModalOpen(false);
          return;
        }
        await employerApi.update(editItem.id, updatePayload);
      } else {
        const created = await employerApi.create(dataToSend);
        const newId = created?.data?.data?.id ?? created?.data?.id;
        // Téléverser CV / contrat choisis, avec le NOUVEL employé comme
        // destinataire (le backend l'exige) — puis enregistrer les URLs sur sa fiche.
        if (newId && (fileCv || fileContrat)) {
          const jobs = [];
          const linkUrl = (field, url) => employerApi.update(newId, {
            ...dataToSend,
            [field]: url,
          }).catch(() => null);
          if (fileCv) {
            jobs.push(
              uploadDocumentFile(fileCv, 'CV', newId)
                .then(up => { setDocIdCv(up.id); setForm(prev => ({ ...prev, cvUrl: up.url })); return linkUrl('cvUrl', up.id ? up.url : null); })
                .catch(() => null)
            );
          }
          if (fileContrat) {
            jobs.push(
              uploadDocumentFile(fileContrat, 'CONTRAT', newId)
                .then(up => { setDocIdContrat(up.id); setForm(prev => ({ ...prev, contratUrl: up.url })); return linkUrl('contratUrl', up.id ? up.url : null); })
                .catch(() => null)
            );
          }
          await Promise.all(jobs);
        }
      }
      toast.success(editItem ? 'Employé modifié' : 'Employé créé');
      setModalOpen(false);
      load(page);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Erreur';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    try {
      await employerApi.toggleActif(item.id);
      toast.success(`Employé ${item.actif ? 'désactivé' : 'activé'}`);
      load(page);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Impossible de modifier le statut de cet employé.');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { 
      await employerApi.delete(deleteItem.id); 
      toast.success('Employé supprimé'); 
      setDeleteItem(null); 
      load(page); 
    } catch { 
      toast.error('Erreur suppression'); 
    } finally { 
      setDeleting(false); 
    }
  };

  // CHANGÉ: Gestion intelligente des IDs
  const set = (k) => (e) => {
    const value = e.target?.value ?? e;
    
    // Pour les IDs, convertir en nombre ou null
    if (k === 'posteId' || k === 'roleId' || k === 'departementId' || k === 'sucursalId') {
      setForm(f => {
        const next = {
          ...f,
          [k]: value === '' || value === null || value === undefined ? null : Number(value)
        };
        // Changer de département réinitialise le poste si incohérent
        if (k === 'departementId' && next.posteId != null) {
          const p = postes.find(pp => String(pp.id) === String(next.posteId));
          if (next.departementId != null && p?.departementId != null
              && String(p.departementId) !== String(next.departementId)) {
            next.posteId = null;
          }
        }
        // Changer de poste aligne le département affiché
        if (k === 'posteId' && next.posteId != null) {
          const p = postes.find(pp => String(pp.id) === String(next.posteId));
          if (p?.departementId != null) next.departementId = p.departementId;
        }
        return next;
      });
    } else {
      setForm(f => ({ ...f, [k]: value }));
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Employé', 
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={v || '?'} size={36} />
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{v}</p>
            <p style={{ 
              fontSize: 12, 
              color: 'var(--text-muted)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4 
            }}>
              <Mail size={10} />
              {row.email}
            </p>
          </div>
        </div>
      )
    },
    { 
      key: 'posteName', 
      label: 'Poste', 
      render: v => v || '—' 
    },
    { 
      key: 'departementNom', 
      label: 'Département', 
      render: (v, row) => v || row?.departementName || '—'
    },
    // Hiérarchie (3.4) : colonne Succursale — visible seulement par ADMIN/SUPER_ADMIN
    ...(showSucursal ? [{
      key: 'sucursalName',
      label: 'Succursale',
      render: v => v || '—'
    }] : []),
    { 
      key: 'roleName', 
      label: 'Rôle', 
      render: v => v ? <Badge variant="info" size="sm">{v}</Badge> : '—' 
    },
    { 
      key: 'numeroTelephone', 
      label: 'Téléphone', 
      render: v => v ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <Phone size={12} />
          {v}
        </span>
      ) : '—' 
    },
    { 
      key: 'id', 
      label: '', 
      align: 'right', 
      render: (v, row) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              openDetail(row);
            }}
            title="Voir la fiche"
          >
            <Eye size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              openFiche(row);
            }}
            title="Fiche de paie (heures du mois → bulletin)"
          >
            <FileText size={15} />
          </Button>
          {peutEvaluer(row) && (
            <Button
              variant="primary"
              size="sm"
              onClick={e => {
                e.stopPropagation();
                openEvaluation(row);
              }}
              title="Évaluer cet employé (LEAD → son département, MANAGER → LEAD, ADMIN → MANAGER)"
            >
              <Award size={16} />
            </Button>
          )}
          {peutGererEmployes && String(row.id) !== String(user?.id) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={e => { 
                e.stopPropagation(); 
                handleToggle(row); 
              }} 
              title={row.actif ? 'Désactiver' : 'Activer'}
            >
              {row.actif ? <UserX size={15} /> : <UserCheck size={15} />}
            </Button>
          )}
          {!lectureSeule && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={e => { 
                e.stopPropagation(); 
                openEdit(row); 
              }}
            >
              <Pencil size={15} />
            </Button>
          )}
          {!lectureSeule && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={e => { 
                e.stopPropagation(); 
                setDeleteItem(row); 
              }} 
              style={{ color: 'var(--color-danger)' }}
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      )
    },
  ];

  // Exporter la liste filtrée en CSV
  const handleExport = () => {
    const rows = filtered.length ? filtered : data;
    const header = ['Nom', 'Email', 'Téléphone', 'Département', 'Poste', 'Rôle', 'Statut', 'Date embauche'];
    const lines = rows.map(e => [
      e.name || '',
      e.email || '',
      e.numeroTelephone || '',
      e.departementNom || e.departementName || '',
      e.posteName || '',
      e.roleName || '',
      e.actif ? 'Actif' : 'Inactif',
      e.dateEmbauche || '',
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'));
    const csv = '\uFEFF' + [header.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employes_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} employé(s) exporté(s)`);
  };

  const REGIONS = ['Centre', 'Littoral', 'Ouest', 'Nord-Ouest', 'Sud-Ouest', 'Adamaoua', 'Est', 'Nord', 'Extrême-Nord', 'Sud'];

  return (
    <div>
      <PageHeader title="Employés" subtitle="Gestion des ressources humaines">
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" onClick={handleExport} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} /> Exporter
          </Button>
          {!lectureSeule && (
            <Button onClick={openCreate}>
              Nouvel employé
            </Button>
          )}
        </div>
      </PageHeader>

      <StatsGrid cols={3}>
        <StatCard title="Total employés" value={stats.total} icon={<Eye size={20} />} color="var(--color-primary)" />
        <StatCard title="Actifs" value={stats.actifs} icon={<UserCheck size={20} />} color="var(--color-success)" />
        <StatCard title="Inactifs" value={stats.inactifs} icon={<UserX size={20} />} color="var(--color-danger)" />
      </StatsGrid>

      <Card padding={0}>
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid var(--border-default)', 
          display: 'flex', 
          gap: 12, 
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}>
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Rechercher par nom ou email..." 
            style={{ flex: 1, maxWidth: 360, minWidth: 220 }} 
          />
          {/* Hiérarchie (3.4) : filtre Succursale — ADMIN/SUPER_ADMIN seulement */}
          {showSucursal && sucursales.length > 0 && (
            <Select
              label="Succursale"
              value={filterSucursal}
              onChange={e => setFilterSucursal(e.target.value)}
              options={[
                { value: '', label: 'Toutes les succursales' },
                ...sucursales.map(s => ({ value: String(s.id), label: s.name })),
              ]}
            />
          )}
          <Select
            label="Département"
            value={filterDepartement}
            onChange={e => { setFilterDepartement(e.target.value); setFilterPoste(''); }}
            options={[
              { value: '', label: 'Tous les départements' },
              ...departements.map(d => ({ value: String(d.id), label: d.name })),
            ]}
          />
          <Select
            label="Poste"
            value={filterPoste}
            onChange={e => setFilterPoste(e.target.value)}
            options={[
              { value: '', label: 'Tous les postes' },
              ...(filterDepartement
                ? postes.filter(p => String(p.departementId ?? '') === String(filterDepartement))
                : postes
              ).map(p => ({ value: String(p.id), label: p.name })),
            ]}
          />
          <Select
            label="Rôle"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            options={[
              { value: '', label: 'Tous les rôles' },
              ...roles.map(r => ({ value: String(r.id), label: r.name })),
            ]}
          />
          <Select
            label="Statut"
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            options={[
              { value: '', label: 'Tous' },
              { value: 'actif', label: 'Actif' },
              { value: 'inactif', label: 'Inactif' },
            ]}
          />
          {(filterDepartement || filterPoste || filterRole || filterStatut || filterSucursal) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFilterDepartement(''); setFilterPoste(''); setFilterRole(''); setFilterStatut(''); setFilterSucursal(''); }}
            >
              Réinitialiser
            </Button>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Table columns={columns} data={filtered} loading={loading} emptyText="Aucun employé trouvé" onRowClick={openDetail} />
        <div style={{ padding: '0 20px 8px' }}>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0' }}>
              {Array.from({ length: totalPages }, (_, i) => i).map(p => (
                <button 
                  key={p} 
                  onClick={() => setPage(p)} 
                  style={{ 
                    padding: '5px 10px', 
                    border: '1px solid var(--border-default)', 
                    borderRadius: 'var(--radius-md)', 
                    background: p === page ? 'var(--color-primary)' : 'var(--bg-surface)', 
                    color: p === page ? '#fff' : 'var(--text-secondary)', 
                    cursor: 'pointer', 
                    fontSize: 13 
                  }}
                >
                  {p + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editItem ? 'Modifier l\'employé' : 'Nouvel employé'} 
        width={640}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editItem ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormRow>
              <Input 
                label="Nom complet *" 
                value={form.name} 
                onChange={set('name')} 
                placeholder="Jean Dupont" 
                required 
              />
              <Input 
                label="Email *" 
                type="email" 
                value={form.email} 
                onChange={set('email')} 
                placeholder="jean@sirhgp.cm" 
                required 
              />
            </FormRow>
            {!editItem && (
              <Input 
                label="Mot de passe *" 
                type="password" 
                value={form.motDePasse} 
                onChange={set('motDePasse')} 
                required 
              />
            )}
            <FormRow>
              <Input 
                label="Téléphone" 
                value={form.numeroTelephone} 
                onChange={set('numeroTelephone')} 
                placeholder="+237 6XX XXX XXX" 
              />
              <Input 
                label="Date de naissance" 
                type="date" 
                value={form.dateNaiss} 
                onChange={set('dateNaiss')} 
              />
            </FormRow>
            <FormRow>
              <Input 
                label="Lieu de naissance" 
                value={form.lieu} 
                onChange={set('lieu')} 
                placeholder="Yaoundé" 
              />
              <Select 
                label="Région" 
                value={form.region} 
                onChange={set('region')} 
                options={REGIONS.map(r => ({ value: r, label: r }))} 
                placeholder="Sélectionner..." 
              />
            </FormRow>
            <FormRow>
              <Input 
                label="Résidence" 
                value={form.residence} 
                onChange={set('residence')} 
                placeholder="Bastos" 
              />
              <Input 
                label="Date d'embauche" 
                type="date" 
                value={form.dateEmbauche} 
                onChange={set('dateEmbauche')} 
              />
            </FormRow>
            {/* Champs paie (Cameroun) */}
            <FormRow>
              <Input 
                label="Salaire brut (FCFA)" 
                type="number" 
                value={form.salaireBase} 
                onChange={set('salaireBase')} 
                placeholder="ex: 250000" 
              />
              <Input 
                label="NUI (Numéro Unique d'Identité)" 
                value={form.nui} 
                onChange={set('nui')} 
                placeholder="ex: 12345678901234" 
              />
            </FormRow>
            <FormRow>
              <Input 
                label="RIB / Numéro de compte bancaire" 
                value={form.rib} 
                onChange={set('rib')} 
                placeholder="ex: 0004000000000000000012345678" 
              />
              <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  CV {form.cvUrl ? '(téléversé)' : fileCv ? '(à téléverser à la création)' : ''}
                </span>
                <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
                  <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{display:'none'}}
                    onChange={handleUploadCv} />
                  <Button type="button" variant="secondary" size="sm"
                    disabled={uploadingCv || uploadingContrat}
                    onClick={() => cvInputRef.current?.click()}>
                    <Upload size={14} /> {uploadingCv ? 'Envoi…' : 'Choisir CV'}
                  </Button>
                  {fileCv && (
                    <span style={{ fontSize: 12, color: 'var(--color-info)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={13} />
                      {fileCv.name}
                    </span>
                  )}
                  {form.cvUrl && (
                    <a href={form.cvUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      Voir
                    </a>
                  )}
                </div>
              </div>
            </FormRow>
            <FormRow>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Contrat de travail {form.contratUrl ? '(téléversé)' : fileContrat ? '(à téléverser à la création)' : ''}
                </span>
                <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap'}}>
                  <input ref={contratInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{display:'none'}}
                    onChange={handleUploadContrat} />
                  <Button type="button" variant="secondary" size="sm"
                    disabled={uploadingCv || uploadingContrat}
                    onClick={() => contratInputRef.current?.click()}>
                    <Upload size={14} /> {uploadingContrat ? 'Envoi…' : 'Choisir contrat'}
                  </Button>
                  {fileContrat && (
                    <span style={{ fontSize: 12, color: 'var(--color-info)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={13} />
                      {fileContrat.name}
                    </span>
                  )}
                  {form.contratUrl && (
                    <a href={form.contratUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      Voir
                    </a>
                  )}
                </div>
              </div>
            </FormRow>
            <FormRow>
              <Select
                label="Département"
                value={form.departementId ?? ''}
                onChange={set('departementId')}
                options={[
                  { value: '', label: 'Aucun (défini par le poste)' },
                  ...departements.map(d => ({ value: d.id, label: d.name })),
                ]}
                placeholder="Sélectionner..."
              />
              <Select
                label="Poste *"
                value={form.posteId}
                onChange={set('posteId')}
                options={postesFiltresModal.map(p => ({
                  value: p.id,
                  label: p.departementName ? `${p.name} (${p.departementName})` : p.name,
                }))}
                placeholder={form.departementId ? 'Postes du département…' : 'Sélectionner...'}
              />
            </FormRow>
            <FormRow>
              <Select
                label="Rôle"
                value={form.roleId}
                onChange={set('roleId')}
                options={roles.map(r => ({ value: r.id, label: r.name }))}
                placeholder="Sélectionner..."
              />
              {/* Hiérarchie (3.4) : succursale — choix ADMIN/SUPER_ADMIN uniquement.
                  Pour un MANAGER qui crée un compte, le backend ancre automatiquement
                  à SA succursale (le select n'a pas de sens hors de son périmètre). */}
              {showSucursal && (
                <Select
                  label={(() => {
                    const r = roles.find(rr => String(rr.id) === String(form.roleId));
                    return r?.name === 'MANAGER' ? 'Succursale *' : 'Succursale';
                  })()}
                  value={form.sucursalId ?? ''}
                  onChange={set('sucursalId')}
                  options={[
                    { value: '', label: 'Aucune (siège)' },
                    ...sucursales.map(s => ({ value: s.id, label: s.name })),
                  ]}
                  placeholder="Sélectionner..."
                />
              )}
            </FormRow>
          </div>
        </form>
      </Modal>

      <Confirm 
        open={!!deleteItem} 
        onClose={() => setDeleteItem(null)} 
        onConfirm={handleDelete}
        loading={deleting} 
        title="Supprimer l'employé"
        message={`Êtes-vous sûr de vouloir supprimer ${deleteItem?.name} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
      />

      <Drawer open={!!fiche} onClose={closeFiche} width={660}
        title={`Fiche de paie — ${fiche?.name || ''}`}>
        {fiche && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Période */}
            <Card padding={14}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {/* Changement de période → rechargement automatique du détail du mois */}
                <Select label="Mois" value={fichePeriode.mois} options={MOIS_OPTIONS}
                  onChange={e => { const v = e.target.value; setFichePeriode(p => ({ ...p, mois: v })); loadFiche(fiche?.id, v, fichePeriode.annee); }} />
                <Select label="Année" value={fichePeriode.annee}
                  options={Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - i; return { value: String(y), label: String(y) }; })}
                  onChange={e => { const v = e.target.value; setFichePeriode(p => ({ ...p, annee: v })); loadFiche(fiche?.id, fichePeriode.mois, v); }} />
              </div>
            </Card>

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

                {/* B. Résumé des heures / débiteurs */}
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

                {/* D. Éléments variables */}
                <Card padding={14}>
                  <SectionTitle>D. Éléments variables</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FormRow>
                      <Input label="Primes (FCFA)" type="number" min={0} value={ficheVar.primes}
                        onChange={e => setFicheVar(v => ({ ...v, primes: e.target.value }))} placeholder="ex: 10000" />
                      <Input label="Motif de l'indemnité" type="text" value={ficheVar.motif}
                        onChange={e => setFicheVar(v => ({ ...v, motif: e.target.value }))} placeholder="ex: indemnité de transport" />
                    </FormRow>
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
                  </div>
                </Card>

                {/* Génération : ajoute le bulletin à la liste de la page Paie */}
                <Button style={{ width: '100%', padding: 12 }} loading={ficheGenerant} loadingText="Génération…"
                  onClick={genererFiche}>
                  <FileText size={16} /> Générer la fiche de paie (ajouter à la liste Paie)
                </Button>
              </>
            )}
          </div>
        )}
      </Drawer>

      <Drawer open={!!evalTarget} onClose={closeEvaluation} width={620}
        title={`Évaluer — ${evalTarget?.name || ''}`}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeEvaluation}>Fermer</Button>
            <Button onClick={() => enregistrerEvaluation(false)} loading={evalSaving}
              loadingText="Enregistrement…">Enregistrer</Button>
          </div>
        }>
        {evalTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Alert variant="info">
              Évaluateur : <strong>{user?.name}</strong> ({user?.roleName}) — évalué :{' '}
              <strong>{evalTarget?.name}</strong> ({evalTarget?.roleName || '—'}).
            </Alert>

            {/* A. KPI temps réel de l'évalué */}
            <Card padding={14}>
              <SectionTitle>A. Indicateurs de {evalTarget?.name}</SectionTitle>
              {evalKpiLoading ? (
                <Empty title="Chargement…" description="Calcul des indicateurs" />
              ) : !evalKpi ? (
                <Empty title="Aucun indicateur" description="Tâches / assiduité indisponibles" />
              ) : (
                <StatsGrid cols={3}>
                  <StatCard title="Tâches terminées" value={`${evalKpi.tachesTerminees ?? 0}/${evalKpi.tachesTotal ?? 0}`} color="#10B981" />
                  <StatCard title="Taux complétion" value={`${Math.round(evalKpi.tauxCompletion ?? 0)} %`} color="#3B82F6" />
                  <StatCard title="Retards (30 j)" value={evalKpi.nbRetards ?? 0} color="#F59E0B" />
                </StatsGrid>
              )}
            </Card>

            {/* B. Formulaire */}
            <Card padding={14}>
              <SectionTitle>B. Évaluation</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FormRow>
                  <Select label="Type *" value={evalForm.type} onChange={setEvalF('type')}
                    options={[
                      { value: 'ANNUELLE', label: 'Annuelle' },
                      { value: 'TRIMESTRIELLE', label: 'Trimestrielle' },
                      { value: 'A_DATE', label: 'À date' },
                    ]} />
                  <Select label="Catégorie *" value={evalForm.categorie} onChange={setEvalF('categorie')}
                    options={[
                      { value: 'PROMOTION', label: 'Promotion' },
                      { value: 'RENVOI', label: 'Renvoi' },
                      { value: 'RECADREMENT', label: 'Recadrement' },
                    ]} />
                </FormRow>
                <Input label="Objet *" value={evalForm.objet} onChange={setEvalF('objet')}
                  placeholder="ex. Promotion au poste de chef de service" />
                <Input label="Date d'évaluation" type="date" value={evalForm.dateEvaluation} onChange={setEvalF('dateEvaluation')} />
                <Textarea label="Commentaire" value={evalForm.commentaire} onChange={setEvalF('commentaire')} rows={2} />
                <p style={{ fontSize: 12, fontWeight: 600, margin: '4px 0 0' }}>Critères (note /20)</p>
                {evalCriteres.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input placeholder="Libellé (ex. Qualité du travail)" value={c.libelle}
                      onChange={e => setEvalCritere(i, 'libelle', e.target.value)} style={{ flex: 1 }} />
                    <Input placeholder="Note" type="number" step="0.5" min="0" max="20" value={c.note}
                      onChange={e => setEvalCritere(i, 'note', e.target.value)} style={{ width: 100 }} />
                    <button type="button" onClick={() => setEvalCriteres(evalCriteres.filter((_, j) => j !== i))}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <Button size="sm" variant="secondary"
                  onClick={() => setEvalCriteres([...evalCriteres, { libelle: '', note: '' }])}>
                  <Plus size={13} /> Ajouter un critère
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* Modal détail employé (clic sur la ligne ou l'icône œil) */}
      <Modal
        open={!!viewEmp}
        onClose={() => setViewEmp(null)}
        title="Fiche employé"
        width={640}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setViewEmp(null)}>Fermer</Button>
            {peutGererEmployes && String(viewEmp?.id) !== String(user?.id) && (
              <Button
                variant={viewEmp?.actif ? 'secondary' : 'primary'}
                onClick={() => { handleToggle(viewEmp); setViewEmp(null); }}
              >
                {viewEmp?.actif ? <><UserX size={15} /> Désactiver</> : <><UserCheck size={15} /> Activer</>}
              </Button>
            )}
            {peutGererEmployes && (
              <Button onClick={() => { openEdit(viewEmp); setViewEmp(null); }}>
                <Pencil size={15} /> Modifier
              </Button>
            )}
          </div>
        }
      >
        {detailLoading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>
            Chargement de la fiche…
          </p>
        ) : detailError ? (
          <Alert variant="danger" title="Fiche non chargée">{detailError}</Alert>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={viewEmp?.name || 'U'} size={56} />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{viewEmp?.name}</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {detail?.roleName && <Badge variant="purple">{detail.roleName}</Badge>}
                  {detail?.posteName ? <Badge variant="primary">{detail.posteName}</Badge> : null}
                  {detail?.departementNom ? <Badge variant="default">{detail.departementNom}</Badge> : null}
                  <Badge variant={detail?.actif ? 'success' : 'danger'} dot>
                    {detail?.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Informations — valeurs du GET byId (detail). En attendant la
                réponse, le modal affiche "Chargement de la fiche…".
                Repli sur la ligne du tableau (viewEmp) uniquement si le
                détail n'a pas renvoyé la valeur. */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Informations
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Nom complet', detail?.name],
                  ['Téléphone', detail?.numeroTelephone],
                  ['Date de naissance', detail?.dateNaiss ? new Date(detail.dateNaiss).toLocaleDateString('fr-FR') : null],
                  ['Lieu de naissance', detail?.lieu],
                  ['Région', detail?.region],
                  ['Résidence', detail?.residence],
                  ['Date d\'embauche', detail?.dateEmbauche ? new Date(detail.dateEmbauche).toLocaleDateString('fr-FR') : null],
                  ['NUI', detail?.nui],
                  ['RIB / N° de compte bancaire', detail?.rib],
                  ['Email', detail?.email],
                  ['Entreprise', detail?.entrepriseNom],
                  ['Sucursal', detail?.sucursalName],
                  ['Responsable', detail?.managerName],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {roleGestion && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-muted)',
              }}>
                <Wallet size={16} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Salaire brut</p>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>
                    {(detail?.salaireBase ?? viewEmp?.salaireBase) != null
                      ? new Intl.NumberFormat('fr-FR').format(detail?.salaireBase ?? viewEmp?.salaireBase) + ' FCFA'
                      : 'Non renseigné'}
                  </p>
                  {(detail?.salaireBase ?? viewEmp?.salaireBase) != null && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Taux journalier (mois courant, {joursOuvresMoisCourant()} jours ouvrables) :{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {new Intl.NumberFormat('fr-FR').format(
                          Math.round(Number(detail?.salaireBase ?? viewEmp?.salaireBase) / joursOuvresMoisCourant()))} FCFA
                      </strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Documents : cards CV / Contrat directement dans la fiche */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={12} /> Documents
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {renderDocCard({ label: 'CV', kind: 'CV', url: detail?.cvUrl, color: 'var(--color-primary)' })}
                {renderDocCard({ label: 'Contrat de travail', kind: 'CONTRAT', url: detail?.contratUrl, color: 'var(--color-info)' })}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* Visualiseur documents supprimé : cards CV / Contrat directement dans la fiche */}

    </div>
  );
}
