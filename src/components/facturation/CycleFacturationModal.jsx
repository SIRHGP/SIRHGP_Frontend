// components/facturation/CycleFacturationModal.jsx
// ─── Modal unique de facturation — barre de progression 3 points ─────────────
// Une facture = un cycle séquentiel : 1) PROFORMA (PDF reçu) →
// 2) BON DE COMMANDE (champs de saisie + PDF généré) →
// 3) FACTURE RÉGULIÈRE (après paiement) → clôture.
// Règle : on ne peut pas passer à l'étape 2 sans l'étape 1, ni à la 3 sans la 2.
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check, Lock, Upload, Download, FileText, Plus, Trash2, CreditCard,
  ArrowLeft, ArrowRight, RefreshCw, CheckCircle, UploadCloud, PenLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { facturationCycleApi, factureApi, documentApi } from '../../Api';
import { Modal, Button, Input, Select, Textarea, FormRow, Badge, Alert, Progress } from '../ui';

const fmt = (n) => n !== undefined && n !== null
  ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(Number(n))
  : '—';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TVA_DEFAUT = 19.25;
const COMPTES_PRODUITS = [
  { value: '701', label: '701 — Ventes de produits finis' },
  { value: '706', label: '706 — Prestations de services' },
  { value: '707', label: '707 — Ventes de marchandises' },
];
const MODULES = ['500', '501', '502', '503', '504', 'AUTRE'];
const MODES_PAIEMENT = [
  { value: 'ESPECES',      label: 'Espèces (571 Caisse)' },
  { value: 'VIREMENT',     label: 'Virement bancaire (512)' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (512)' },
  { value: 'CHEQUE',       label: 'Chèque (532)' },
];

const ETAPES_META = [
  { n: 1, label: 'Proforma',          sous: 'PDF reçu',        color: '#F59E0B' },
  { n: 2, label: 'Bon de commande',   sous: 'Saisie + PDF',    color: '#F97316' },
  { n: 3, label: 'Facture régulière', sous: 'Après paiement',  color: '#6366F1' },
];

/** Télécharge un blob retourné par l'API (axios responseType blob). */
async function downloadBlob(promise, filename) {
  const res = await promise;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const err = (e, def) => e?.response?.data?.message || e?.response?.data?.error || def || 'Erreur';

// ─── Barre de progression 3 points ───────────────────────────────────────────
/**
 * @param {number}  etapeCourante  1..3 (4 = clôturé)
 * @param {object}  faits          { 1: bool, 2: bool, 3: bool }
 * @param {boolean} cloturee
 * @param {function} onSelect      navigation (uniquement vers les étapes accessibles)
 */
export function Stepper({ etapeCourante, faits, cloturee, etapeActive, onSelect }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, padding: '0 8px' }}>
      {ETAPES_META.map((e, i) => {
        const faite = !!faits[e.n];
        const active = etapeActive === e.n;
        const accessible = faite || e.n <= etapeCourante;
        const locked = !accessible;
        return (
          <div key={e.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <button
              type="button"
              disabled={locked}
              onClick={() => accessible && onSelect?.(e.n)}
              title={locked ? 'Étape verrouillée — complétez les étapes précédentes' : e.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: accessible ? 'pointer' : 'not-allowed',
                opacity: locked ? 0.55 : 1, minWidth: 96, padding: 0,
              }}
            >
              <span style={{
                width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: faite ? 'var(--color-success)' : active ? e.color : 'var(--bg-muted)',
                color: faite || active ? '#fff' : 'var(--text-muted)',
                border: active && !faite ? `2px solid ${e.color}` : '2px solid transparent',
                transition: 'all var(--transition-fast)',
                boxShadow: active ? `0 0 0 4px ${e.color}22` : 'none',
              }}>
                {faite ? <Check size={16} strokeWidth={3} /> : locked ? <Lock size={13} /> : e.n}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? e.color : 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.25 }}>
                {e.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{e.sous}</span>
            </button>
            {i < ETAPES_META.length - 1 && (
              <div style={{
                flex: 1, height: 3, borderRadius: 2, margin: '16px -12px 0', minWidth: 24,
                background: faits[e.n + 1] || (faits[e.n] && e.n + 1 <= etapeCourante)
                  ? 'var(--color-success)' : 'var(--border-default)',
              }} />
            )}
          </div>
        );
      })}
      {cloturee && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 96 }}>
          <span style={{
            width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-success)', color: '#fff',
          }}>
            <CheckCircle size={17} />
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-success)' }}>Clôturé</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Cycle complet</span>
        </div>
      )}
    </div>
  );
}

// ─── Saisie des lignes (étapes 2 et 3) ───────────────────────────────────────
function LignesSaisie({ lignes, setLignes, assujetti, tauxTVA }) {
  const set = (i, k) => (e) => setLignes(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: e.target?.value ?? e } : l));
  const ajouter = () => setLignes(ls => [...ls, ligneVide()]);
  const retirer = (i) => setLignes(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls);

  const ht = lignes.reduce((s, l) => s + (parseFloat(l.prixUnitaire) || 0) * (parseInt(l.quantite, 10) || 0), 0);
  const tva = assujetti ? (Math.round(ht * (parseFloat(tauxTVA) || 0)) / 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Lignes de saisie (spécifications + prix) *
        </label>
        <Button variant="secondary" size="sm" onClick={ajouter} leftIcon={<Plus size={13} />}>Ligne</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lignes.map((l, i) => (
          <div key={l.id || `ligne-${i}`} style={{
            display: 'grid', gridTemplateColumns: '2fr 70px 1fr 1fr 32px', gap: 8, alignItems: 'end',
            padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-muted)',
          }}>
            <Input label={i === 0 ? 'Désignation' : undefined} value={l.description} onChange={set(i, 'description')}
              placeholder="Prestation / produit…" />
            <Input label={i === 0 ? 'Qté' : undefined} type="number" min="1" value={l.quantite} onChange={set(i, 'quantite')} />
            <Input label={i === 0 ? 'Prix unitaire (XAF)' : undefined} type="number" min="0" value={l.prixUnitaire}
              onChange={set(i, 'prixUnitaire')} placeholder="0" />
            <Select label={i === 0 ? 'Compte (SYSCOHADA)' : undefined} value={l.compteComptable}
              onChange={set(i, 'compteComptable')} options={COMPTES_PRODUITS} />
            <button type="button" onClick={() => retirer(i)} disabled={lignes.length <= 1} title="Retirer la ligne"
              style={{
                height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)', color: 'var(--color-danger)', cursor: 'pointer',
                opacity: lignes.length <= 1 ? 0.4 : 1,
              }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 12, padding: '10px 14px',
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
        fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
      }}>
        <span>HT : {fmt(ht)}</span>
        <span style={{ color: assujetti ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          TVA : {assujetti ? fmt(tva) : 'non applicable'}
        </span>
        <span>TTC : {fmt(ht + tva)}</span>
      </div>
    </div>
  );
}

const ligneVide = () => ({ id: `nouvelle-${Date.now()}-${Math.random()}`, description: '', quantite: 1, prixUnitaire: '', compteComptable: '706' });

function validerLignes(lignes) {
  for (let index = 0; index < lignes.length; index += 1) {
    const ligne = lignes[index];
    if (!ligne.description?.trim()) return `Ligne ${index + 1} : la désignation est obligatoire.`;
    const quantite = Number(ligne.quantite);
    if (!Number.isInteger(quantite) || quantite < 1) return `Ligne ${index + 1} : la quantité doit être un entier supérieur ou égal à 1.`;
    if (ligne.prixUnitaire === '' || ligne.prixUnitaire == null || !Number.isFinite(Number(ligne.prixUnitaire)) || Number(ligne.prixUnitaire) < 0) {
      return `Ligne ${index + 1} : indiquez un prix unitaire valide (zéro est accepté).`;
    }
  }
  return null;
}

// ─── Étape 1 — PROFORMA (upload PDF reçu) ────────────────────────────────────
function EtapeProforma({ cycle, onRefresh, verrouillee }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      toast.error('Le proforma doit être un fichier PDF');
      return;
    }
    setUploading(true);
    try {
      await facturationCycleApi.uploadProforma(cycle.id, file);
      toast.success('Proforma reçu — étape 1/3 validée');
      setFile(null);
      onRefresh(true);   // recharge et propose l'étape suivante
    } catch (e) {
      toast.error(err(e, 'Échec de l’upload du proforma'));
    } finally {
      setUploading(false);
    }
  };

  const telecharger = async () => {
    try {
      await downloadBlob(documentApi.download(cycle.proforma.documentId), `${cycle.numeroReference}-proforma.pdf`);
    } catch { toast.error('Téléchargement impossible'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Alert variant="info" title="Étape 1 — Proforma (PDF)">
        Téléversez le document PDF du proforma : il constitue la base de référence du cycle.
        Horodatage automatique à la réception.
      </Alert>

      {cycle.proforma ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
          background: 'var(--color-success-light)', border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-md)', flexWrap: 'wrap',
        }}>
          <FileText size={22} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{cycle.proforma.nom}</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Reçu le {cycle.proforma.date ? new Date(cycle.proforma.date).toLocaleString('fr-FR') : '—'}
              {cycle.proforma.taille ? ` · ${(cycle.proforma.taille / 1024).toFixed(1)} Ko` : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={telecharger} leftIcon={<Download size={14} />}>PDF</Button>
          {!verrouillee && (
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}
              leftIcon={<RefreshCw size={14} />} title="Remplacer le proforma">Remplacer</Button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !verrouillee && fileRef.current?.click()}
          style={{
            border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
            padding: '36px 20px', textAlign: 'center', cursor: verrouillee ? 'not-allowed' : 'pointer',
            background: 'var(--bg-muted)', opacity: verrouillee ? 0.5 : 1,
          }}>
          <UploadCloud size={34} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Cliquez pour sélectionner le PDF du proforma
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Format PDF uniquement</p>
        </div>
      )}

      <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
        onChange={e => setFile(e.target.files?.[0] || null)} />

      {file && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)',
        }}>
          <FileText size={16} style={{ color: 'var(--color-warning)' }} />
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{file.name}</span>
          <Button size="sm" onClick={upload} loading={uploading} leftIcon={<Upload size={14} />}>
            Valider l'étape 1
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Étape 2 — BON DE COMMANDE (saisie + PDF généré) ─────────────────────────
function EtapeBonCommande({ cycle, onRefresh, verrouillee }) {
  const [form, setForm] = useState({
    titre: cycle.titre || '', description: cycle.description || '',
    dateEmission: todayISO(), module: 'AUTRE',
  });
  const [lignes, setLignes] = useState([ligneVide()]);
  const [tauxTVA] = useState(String(TVA_DEFAUT));
  const [saving, setSaving] = useState(false);
  const [edition, setEdition] = useState(false);   // réouvre le formulaire si BC déjà généré
  const bc = cycle.bonCommande;
  const assujetti = !cycle.clientId;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const ouvrirEdition = () => {
    if (bc?.lignesFacture) {
      setForm({
        titre: bc.titre || '',
        description: bc.description || '',
        dateEmission: bc.dateEmission ? String(bc.dateEmission).slice(0, 10) : todayISO(),
        module: bc.module || 'AUTRE',
      });
      setLignes(bc.lignesFacture.map(l => ({
        id: l.id,
        description: l.description || '',
        quantite: String(l.quantite || 1),
        prixUnitaire: String(l.prixUnitaire || ''),
        compteComptable: l.compteComptable || '706',
      })));
    }
    setEdition(true);
  };

  const generer = async () => {
    if (!form.titre?.trim()) return toast.error('Le titre est obligatoire');
    if (!form.dateEmission) return toast.error("La date d'émission est obligatoire");
    const erreurLigne = validerLignes(lignes);
    if (erreurLigne) return toast.error(erreurLigne);
    setSaving(true);
    try {
      await facturationCycleApi.genererBonCommande(cycle.id, {
        titre: form.titre.trim(),
        description: form.description?.trim() || null,
        dateEmission: form.dateEmission,
        module: form.module,
        tauxTVA: parseFloat(tauxTVA) || TVA_DEFAUT,
        assujettiTVA: assujetti,
        lignesFacture: lignes.map(l => ({
          description: l.description.trim(),
          quantite: Number(l.quantite),
          prixUnitaire: Number(l.prixUnitaire),
          compteComptable: l.compteComptable || '706',
          remisePct: 0,
          tauxTVA: parseFloat(tauxTVA) || TVA_DEFAUT,
        })),
      });
      toast.success('Bon de commande généré — étape 2/3 validée');
      setEdition(false);
      onRefresh(true);
    } catch (e) {
      toast.error(err(e, 'Génération du bon de commande impossible'));
    } finally {
      setSaving(false);
    }
  };

  const telechargerPdf = async () => {
    try {
      await downloadBlob(facturationCycleApi.pdfBonCommande(cycle.id), `${bc?.numero || cycle.numeroReference}-bon-de-commande.pdf`);
    } catch { toast.error('Génération du PDF impossible'); }
  };

  if (verrouillee && !bc) {
    return <Alert variant="warning" title="Étape verrouillée">
      Téléversez d'abord le proforma (étape 1) pour construire le bon de commande.
    </Alert>;
  }

  // ── BC déjà généré : récap + PDF (sauf mode édition) ──────────────────────
  if (bc && !edition) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '14px 16px', background: 'var(--color-warning-light)',
          border: '1px solid var(--color-warning)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <FileText size={18} style={{ color: '#B45309' }} />
            <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
              {bc.numero} — {bc.titre}
            </p>
            <Badge variant="warning" size="sm">Bon de commande</Badge>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <span>Émis le {bc.dateEmission || '—'}</span>
            <span>HT : <b>{fmt(bc.montantHT)}</b></span>
            <span>TVA : <b>{fmt(bc.montantTVA)}</b></span>
            <span>TTC : <b style={{ color: 'var(--text-primary)' }}>{fmt(bc.montantTTC)}</b></span>
          </div>
        </div>
        {bc.lignesFacture?.length > 0 && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  {['Désignation', 'Qté', 'Prix unitaire', 'Montant HT'].map(label => (
                    <th key={label} style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bc.lignesFacture.map((ligne, index) => (
                  <tr key={ligne.id || `bc-ligne-${index}`} style={{ borderTop: '1px solid var(--border-muted)' }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{ligne.description}</td>
                    <td style={{ padding: '9px 12px' }}>{ligne.quantite}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{fmt(ligne.prixUnitaire)}</td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{fmt(ligne.montantTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button onClick={telechargerPdf} leftIcon={<Download size={15} />}>Télécharger le PDF du bon de commande</Button>
          {!cycle.cloturee && (
            <Button variant="secondary" onClick={ouvrirEdition} leftIcon={<PenLine size={15} />}>
              Modifier et régénérer
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Formulaire de saisie ────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Alert variant="info" title="Étape 2 — Bon de commande">
        Renseignez les spécifications demandées par le client et les prix, puis générez le bon de commande
        en PDF pour proposition / validation.
      </Alert>

      <FormRow>
        <Input label="Titre *" value={form.titre} onChange={set('titre')} placeholder="Objet du bon de commande…" />
        <Input label="Date d'émission *" type="date" value={form.dateEmission} onChange={set('dateEmission')} />
      </FormRow>
      <FormRow>
        <Textarea label="Description / spécifications" rows={2} value={form.description} onChange={set('description')}
          placeholder="Détail des prestations convenues…" />
        <Select label="Module comptable" value={form.module} onChange={set('module')}
          options={MODULES.map(m => ({ value: m, label: m === 'AUTRE' ? 'Hors module' : `Module ${m}` }))} />
      </FormRow>

      <LignesSaisie lignes={lignes} setLignes={setLignes} assujetti={assujetti} tauxTVA={tauxTVA} />

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {edition && <Button variant="secondary" onClick={() => setEdition(false)}>Annuler</Button>}
        <Button onClick={generer} loading={saving} leftIcon={<FileText size={15} />}>
          {bc ? 'Régénérer le bon de commande' : 'Générer le bon de commande'}
        </Button>
      </div>
    </div>
  );
}

// ─── Étape 3 — FACTURE RÉGULIÈRE (après paiement) ────────────────────────────
function EtapeFinale({ cycle, onRefresh, verrouillee }) {
  const [mode, setMode] = useState('saisie');           // saisie | upload
  const [form, setForm] = useState({
    titre: cycle.titre || '', description: cycle.description || '', dateEmission: todayISO(),
  });
  const [lignes, setLignes] = useState([ligneVide()]);
  const tauxTVA = String(TVA_DEFAUT);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [paiement, setPaiement] = useState({ mode: 'VIREMENT', montant: '', reference: '', note: '' });
  const [paiements, setPaiements] = useState([]);
  const fileRef = useRef(null);

  const fin = cycle.factureFinale;
  const assujetti = !cycle.clientId;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const setP = (k) => (e) => setPaiement(p => ({ ...p, [k]: e.target?.value ?? e }));

  // Synchro voulue : pré-remplit le montant + recharge l'historique à chaque nouvelle facture finale.
  useEffect(() => {
    if (fin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaiement(p => ({ ...p, montant: fin.montantRestant != null ? String(fin.montantRestant) : '' }));
      facturationCycleApi.getPaiements(cycle.id)
        .then(res => setPaiements(res.data?.data || res.data || []))
        .catch(() => setPaiements([]));
    }
  }, [fin, cycle.id]);

  const creer = async () => {
    if (!form.titre?.trim()) return toast.error('Le titre est obligatoire');
    if (!form.dateEmission) return toast.error("La date d'émission est obligatoire");
    const erreurLigne = validerLignes(lignes);
    if (erreurLigne) return toast.error(erreurLigne);
    setSaving(true);
    try {
      await facturationCycleApi.creerFactureFinale(cycle.id, {
        titre: form.titre.trim(),
        description: form.description?.trim() || null,
        dateEmission: form.dateEmission,
        module: 'AUTRE',
        tauxTVA: parseFloat(tauxTVA) || TVA_DEFAUT,
        assujettiTVA: assujetti,
        lignesFacture: lignes.map(l => ({
          description: l.description.trim(),
          quantite: Number(l.quantite),
          prixUnitaire: Number(l.prixUnitaire),
          compteComptable: l.compteComptable || '706',
          remisePct: 0,
          tauxTVA: parseFloat(tauxTVA) || TVA_DEFAUT,
        })),
      });
      toast.success('Facture régulière enregistrée — étape 3/3 validée');
      onRefresh(true);
    } catch (e) {
      toast.error(err(e, 'Enregistrement de la facture régulière impossible'));
    } finally {
      setSaving(false);
    }
  };

  const uploader = async () => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      toast.error('La facture finale doit être un fichier PDF');
      return;
    }
    setUploading(true);
    try {
      await facturationCycleApi.uploadFactureFinalePdf(cycle.id, file);
      toast.success('Facture finale reçue — étape 3/3 validée');
      setFile(null);
      onRefresh(true);
    } catch (e) {
      toast.error(err(e, 'Échec de l’upload'));
    } finally {
      setUploading(false);
    }
  };

  const encaisser = async () => {
    const montant = parseFloat(paiement.montant) || 0;
    if (montant <= 0) return toast.error('Le montant réglé doit être positif');
    setSaving(true);
    try {
      await facturationCycleApi.enregistrerPaiement(cycle.id, {
        mode: paiement.mode,
        montant,
        datePaiement: todayISO(),
        reference: paiement.reference || null,
        note: paiement.note || null,
      });
      toast.success('Règlement enregistré (écriture comptable générée)');
      onRefresh(false);
    } catch (e) {
      toast.error(err(e, 'Encaissement impossible'));
    } finally {
      setSaving(false);
    }
  };

  const telechargerPdfFinale = async () => {
    try {
      await downloadBlob(factureApi.pdf(fin.id), `${fin.numero || 'facture'}.pdf`);
    } catch { toast.error('Téléchargement du PDF impossible'); }
  };

  if (verrouillee && !fin && !cycle.pieceFinale) {
    return <Alert variant="warning" title="Étape verrouillée">
      Générez d'abord le bon de commande (étape 2) avant la facture régulière.
    </Alert>;
  }

  // ── Facture régulière créée : récap + encaissement ────────────────────────
  if (fin) {
    const payePct = fin.montantTTC > 0 ? Math.min(100, Math.round((fin.montantPaye / fin.montantTTC) * 100)) : 0;
    const restant = fin.montantRestant || 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '14px 16px', background: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <FileText size={18} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{fin.numero} — {fin.titre}</p>
            <Badge variant="primary" size="sm">Facture régulière</Badge>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <span>Émis le {fin.dateEmission || '—'}</span>
            <span>TTC : <b style={{ color: 'var(--text-primary)' }}>{fmt(fin.montantTTC)}</b></span>
            <span>Payé : <b style={{ color: 'var(--color-success)' }}>{fmt(fin.montantPaye)}</b></span>
            <span>Restant : <b style={{ color: restant > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{fmt(restant)}</b></span>
          </div>
          <div style={{ marginTop: 10 }}>
            <Progress value={payePct} color={payePct >= 100 ? 'var(--color-success)' : 'var(--color-primary)'} size="sm" />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button variant="secondary" size="sm" onClick={telechargerPdfFinale} leftIcon={<Download size={14} />}>
            Télécharger le PDF de la facture
          </Button>
        </div>

        {!cycle.cloturee && restant > 0 && (
          <div style={{
            padding: '14px 16px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Encaissement (OHADA 411 → trésorerie)
            </p>
            <FormRow>
              <Select label="Mode de règlement" value={paiement.mode} onChange={setP('mode')} options={MODES_PAIEMENT} />
              <Input label="Montant réglé (XAF) *" type="number" value={paiement.montant} onChange={setP('montant')}
                placeholder={String(fin.montantRestant ?? '')} />
            </FormRow>
            <FormRow>
              <Input label="Référence (n° virement, chèque…)" value={paiement.reference} onChange={setP('reference')}
                placeholder="ex: VIR-2026-0045" />
              <Input label="Note" value={paiement.note} onChange={setP('note')} />
            </FormRow>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <Button onClick={encaisser} loading={saving} leftIcon={<CreditCard size={15} />}>
                Enregistrer le règlement
              </Button>
            </div>
          </div>
        )}

        {paiements.length > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Règlements
            </p>
            {paiements.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid var(--border-muted)' }}>
                <span>{p.datePaiement} · {p.mode}{p.reference ? ` (${p.reference})` : ''}</span>
                <b style={{ fontFamily: 'var(--font-mono)' }}>{fmt(p.montant)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Pièce PDF finale reçue (alternative à la saisie) ──────────────────────
  if (cycle.pieceFinale) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
          background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)', flexWrap: 'wrap',
        }}>
          <FileText size={22} style={{ color: 'var(--color-primary)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13 }}>{cycle.pieceFinale.nom}</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Reçue le {cycle.pieceFinale.date ? new Date(cycle.pieceFinale.date).toLocaleString('fr-FR') : '—'}
            </p>
          </div>
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}
            onClick={() => downloadBlob(documentApi.download(cycle.pieceFinale.documentId), `${cycle.numeroReference}-facture-finale.pdf`).catch(() => toast.error('Téléchargement impossible'))}>
            PDF
          </Button>
        </div>
        <Alert variant="success" title="Étape 3 validée">
          La facture régulière a été reçue sous forme de pièce PDF — le dossier peut être clôturé.
        </Alert>
      </div>
    );
  }

  // ── Choix : saisir la facture OU recevoir son PDF ─────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Alert variant="info" title="Étape 3 — Facture régulière (après paiement)">
        Saisissez la facture finale (elle sera chaînée au bon de commande) ou téléversez le PDF reçu.
        Après encaissement complet, le dossier pourra être clôturé.
      </Alert>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant={mode === 'saisie' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('saisie')}
          leftIcon={<PenLine size={14} />}>Saisir la facture</Button>
        <Button variant={mode === 'upload' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('upload')}
          leftIcon={<Upload size={14} />}>Recevoir un PDF</Button>
      </div>

      {mode === 'saisie' ? (
        <>
          <FormRow>
            <Input label="Titre *" value={form.titre} onChange={set('titre')} placeholder="Objet de la facture…" />
            <Input label="Date d'émission *" type="date" value={form.dateEmission} onChange={set('dateEmission')} />
          </FormRow>
          <Textarea label="Description" rows={2} value={form.description} onChange={set('description')} />
          <LignesSaisie lignes={lignes} setLignes={setLignes} assujetti={assujetti} tauxTVA={tauxTVA} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={creer} loading={saving} leftIcon={<CheckCircle size={15} />}>
              Enregistrer la facture régulière
            </Button>
          </div>
        </>
      ) : (
        <>
          <div onClick={() => fileRef.current?.click()} style={{
            border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
            padding: '30px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-muted)',
          }}>
            <UploadCloud size={30} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Cliquez pour sélectionner le PDF de la facture finale
            </p>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] || null)} />
          {file && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
              <FileText size={16} style={{ color: 'var(--color-warning)' }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{file.name}</span>
              <Button size="sm" onClick={uploader} loading={uploading} leftIcon={<Upload size={14} />}>
                Valider l'étape 3
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Modal principal — wizard 3 étapes ───────────────────────────────────────
/**
 * @param {number}  cycleId   Dossier à ouvrir
 * @param {boolean} open
 * @param {function} onClose  Fermeture
 * @param {function} onRefresh Rafraîchit la liste parente
 */
export default function CycleFacturationModal({ cycleId, open, onClose, onRefresh }) {
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etape, setEtape] = useState(null);   // null = synchronisé à l'étape courante
  const [cloturant, setCloturant] = useState(false);

  const charger = useCallback(async (avancer = false) => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const res = await facturationCycleApi.getById(cycleId);
      const d = res.data?.data || res.data;
      setCycle(d);
      const courante = Math.min(d?.etapeCourante || 1, 3);
      setEtape(prev => (avancer ? courante : (prev ?? courante)));
    } catch {
      toast.error('Dossier de facturation introuvable');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    if (open && cycleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCycle(null);
      setEtape(null);
      charger(false);
    }
  }, [open, cycleId, charger]);

  if (!open) return null;

  const faits = { 1: !!cycle?.etape1Faite, 2: !!cycle?.etape2Faite, 3: !!cycle?.etape3Faite };
  const etapeActive = Math.min(etape ?? 1, 3);
  const peutSuivant = etapeActive === 1 ? !!cycle?.etape1Faite : etapeActive === 2 ? !!cycle?.etape2Faite : false;
  const peutCloturer = !!cycle?.etape3Faite && !cycle?.cloturee;

  const cloturer = async () => {
    setCloturant(true);
    try {
      await facturationCycleApi.cloturer(cycle.id);
      toast.success('Dossier clôturé — cycle de facturation complet');
      charger(false);
      onRefresh?.();
    } catch (e) {
      toast.error(err(e, 'Clôture impossible'));
    } finally {
      setCloturant(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={760}
      title={cycle ? `Facture — ${cycle.numeroReference}` : 'Dossier de facturation'}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Une facture n'existe pleinement qu'une fois les 3 étapes complétées.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {etapeActive > 1 && (
              <Button variant="secondary" onClick={() => setEtape(e => Math.max(1, e - 1))}
                leftIcon={<ArrowLeft size={15} />}>Précédent</Button>
            )}
            {peutSuivant && (
              <Button onClick={() => setEtape(e => Math.min(3, e + 1))} rightIcon={<ArrowRight size={15} />}>
                Étape suivante
              </Button>
            )}
            {peutCloturer && (
              <Button variant="success" onClick={cloturer} loading={cloturant}
                leftIcon={<CheckCircle size={15} />}>Clôturer le cycle</Button>
            )}
            <Button variant={peutSuivant || peutCloturer ? 'secondary' : 'primary'} onClick={onClose}>
              {peutSuivant || peutCloturer ? 'Fermer' : 'Terminer'}
            </Button>
          </div>
        </div>
      }
    >
      {loading && !cycle ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</div>
      ) : cycle ? (
        <>
          {/* En-tête dossier */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
            padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-muted)', marginBottom: 18,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{cycle.titre}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                {[cycle.projetNom, cycle.clientNom || cycle.nomFournisseur].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge variant={cycle.sens === 'ACHAT' ? 'warning' : 'primary'} size="sm">
                {cycle.sens === 'ACHAT' ? 'Achat' : 'Vente'}
              </Badge>
              {cycle.montantTTC != null && (
                <Badge variant="success" size="sm">TTC {fmt(cycle.montantTTC)}</Badge>
              )}
              {cycle.cloturee && <Badge variant="success" size="sm" dot>Clôturé</Badge>}
            </div>
          </div>

          {/* Barre de progression linéaire avec % */}
          <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Progression du cycle</span>
            <span>{cycle.avancementPct ?? Math.round((Object.values(faits).filter(Boolean).length / 3) * 100)}% complété</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border-muted)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${cycle.avancementPct ?? Math.round((Object.values(faits).filter(Boolean).length / 3) * 100)}%`,
                background: cycle.cloturee ? 'var(--color-success)' : 'var(--color-primary)',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Barre de progression 3 points */}
          <Stepper
            etapeCourante={cycle.etapeCourante}
            faits={faits}
            cloturee={cycle.cloturee}
            etapeActive={etapeActive}
            onSelect={(n) => setEtape(n)}
          />

          {etapeActive === 1 && (
            <EtapeProforma cycle={cycle} onRefresh={charger} verrouillee={cycle.cloturee} />
          )}
          {etapeActive === 2 && (
            <EtapeBonCommande cycle={cycle} onRefresh={charger} verrouillee={!cycle.etape1Faite || cycle.cloturee} />
          )}
          {etapeActive === 3 && (
            <EtapeFinale cycle={cycle} onRefresh={charger} verrouillee={!cycle.etape2Faite || cycle.cloturee} />
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Dossier introuvable.
        </div>
      )}
    </Modal>
  );
}
