// pages/Factures.jsx
import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  SquarePlus, Pencil, Trash2, DollarSign, Clock, CheckCircle, FileText,
  CreditCard, ChevronLeft, ChevronRight, Calendar, Building2,
  User, TrendingUp, AlertTriangle, BarChart2, Filter, Check, FolderOpen
} from 'lucide-react';
import { factureApi, facturationCycleApi, projetApi, employerApi, departementApi } from '../Api';
import {
  PageHeader, Card, Badge, Button, Modal, Input, Select,
  Confirm, SearchInput, FormRow, Textarea, Avatar, Progress, StatsGrid, StatCard, SucursaleBadge, SucursaleField
} from '../components/ui';
import CycleFacturationModal from '../components/facturation/CycleFacturationModal';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, isWithinInterval, parseISO,
  format, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears
} from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNotifications } from '../contexts/NotificationContext';
import { NOTIF_TYPES } from '../constants/notificationTypes';
import { useSucursales } from '../hooks/useSucursales';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUTS = ['BROUILLON', 'VALIDEE', 'EN_ATTENTE', 'PAYEE', 'PARTIELLEMENT_PAYEE', 'ANNULEE'];
const STATUT_META = {
  BROUILLON:          { label: 'Brouillon',           color: '#94A3B8', variant: 'default' },
  VALIDEE:            { label: 'Validee (comptabilisee)', color: '#0EA5E9', variant: 'info' },
  EN_ATTENTE:         { label: 'En attente',          color: '#F59E0B', variant: 'warning' },
  PAYEE:              { label: 'Payee',               color: '#10B981', variant: 'success' },
  PARTIELLEMENT_PAYEE: { label: 'Partiellement payee', color: '#6366F1', variant: 'info' },
  ANNULEE:            { label: 'Annulee',             color: '#EF4444', variant: 'danger' },
  EN_RETARD:          { label: 'En retard',           color: '#F97316', variant: 'danger' },
};

// Comptes produits SYSCOHADA (refonte OHADA)
const COMPTES_PRODUITS = [
  { value: '701', label: '701 — Ventes de produits finis' },
  { value: '706', label: '706 — Prestations de services' },
  { value: '707', label: '707 — Ventes de marchandises' },
];
const MODES_PAIEMENT = [
  { value: 'ESPECES',     label: 'Especes (571 Caisse)' },
  { value: 'VIREMENT',    label: 'Virement bancaire (512)' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (512)' },
  { value: 'CHEQUE',      label: 'Cheque (532)' },
];
const TVA_DEFAUT = '19.25';

const TYPES = ['REGULIERE', 'AVOIR', 'ACOMPTE', 'SOLDE', 'PROFORMA', 'BON_COMMANDE'];
const TYPE_META = {
  REGULIERE:   { label: 'Reguliere',      color: '#6366F1' },
  AVOIR:       { label: 'Avoir',          color: '#10B981' },
  ACOMPTE:     { label: 'Acompte',        color: '#0EA5E9' },
  SOLDE:       { label: 'Solde',          color: '#8B5CF6' },
  PROFORMA:    { label: 'Proforma (sans valeur comptable)', color: '#F59E0B' },
  BON_COMMANDE:{ label: 'Bon de commande', color: '#F97316' },
};

// Sens du flux achat/vente (Lot 1 : cycle proforma → BC → facture)
const SENS = ['VENTE', 'ACHAT'];
const SENS_META = {
  VENTE: { label: 'Vente (entreprise → client)', color: '#6366F1' },
  ACHAT: { label: 'Achat (fournisseur → entreprise)', color: '#F97316' },
};

// Transition autorisee du cycle documentaire
const CONVERSION_SUIVANTE = { PROFORMA: 'BON_COMMANDE', BON_COMMANDE: 'REGULIERE' };

// ─── Dossiers de facturation (refonte interface — cycle 3 étapes) ────────────
const CYCLE_STATUT_META = {
  BROUILLON:       { label: 'Ouvert — proforma attendu',     color: '#94A3B8', variant: 'default' },
  PROFORMA_RECU:   { label: 'Proforma reçu (1/3)',           color: '#F59E0B', variant: 'warning' },
  BC_GENERE:       { label: 'Bon de commande généré (2/3)',  color: '#F97316', variant: 'warning' },
  BC_VALIDE:       { label: 'Bon de commande validé (2/3)',  color: '#F97316', variant: 'warning' },
  FACTURE_RECU:    { label: 'Facture régulière reçue (3/3)', color: '#6366F1', variant: 'info' },
  CLOTURE:         { label: 'Clôturé',                       color: '#10B981', variant: 'success' },
};

// Plan comptable SYSCOHADA — libellés des comptes rencontrés au journal
const LIBELLES_COMPTES = {
  '411': 'Clients', '4431': 'TVA collectée', '512': 'Banque', '571': 'Caisse',
  '701': 'Ventes de produits finis', '706': 'Prestations de services',
  '707': 'Ventes de marchandises', '709': 'RRR accordées',
};

const CATEGORIES = ['MISSION', 'DEPLACEMENT', 'CONFERENCE', 'FORMATION', 'AUTRE'];
const CAT_META = {
  MISSION:    { label: 'Mission',     color: '#8B5CF6', icon: FileText },
  DEPLACEMENT: { label: 'Deplacement', color: '#F59E0B', icon: TrendingUp },
  CONFERENCE: { label: 'Conference',  color: '#0EA5E9', icon: BarChart2 },
  FORMATION:  { label: 'Formation',   color: '#10B981', icon: CheckCircle },
  AUTRE:      { label: 'Autre',       color: '#94A3B8', icon: FileText },
};

// Modules comptables OHADA (1.8) : regroupement 500/501/502/... puis par type
const MODULES = ['500', '501', '502', '503', '504', 'AUTRE'];
const MODULE_META = {
  '500':  { label: 'Module 500',  color: '#6366F1' },
  '501':  { label: 'Module 501',  color: '#8B5CF6' },
  '502':  { label: 'Module 502',  color: '#0EA5E9' },
  '503':  { label: 'Module 503',  color: '#10B981' },
  '504':  { label: 'Module 504',  color: '#F59E0B' },
  AUTRE:  { label: 'Hors module', color: '#94A3B8' },
};

const PERIODS = [
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois',    label: 'Mois' },
  { key: 'annee',   label: 'Annee' },
];

/** Date du jour ISO (AAAA-MM-JJ) — émission par défaut d'une nouvelle facture. */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMPTY = {
  titre: '', description: '', categorie: 'MISSION',
  dateEmission: todayISO(),
  module: 'AUTRE', nomDestinataire: '', clientId: '',
  montantHT: '', montantTVA: '',
  tauxTVA: TVA_DEFAUT, compteProduit: '706',
  typeFacture: 'REGULIERE', statut: 'BROUILLON',
  sens: 'VENTE', nomFournisseur: '', factureOrigineId: '',
  projetId: '', departementId: '', sucursalId: '',
  creePar: '',
  montantPaye: 0,
};

const fmt = (n) => n !== undefined && n !== null
  ? new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(Number(n))
  : '—';

function pct(a, b) {
  if (!b) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}

function getPeriodInterval(period, anchor) {
  if (period === 'semaine') return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
  if (period === 'mois') return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  return { start: startOfYear(anchor), end: endOfYear(anchor) };
}

function periodLabel(period, anchor) {
  if (period === 'semaine') {
    const s = startOfWeek(anchor, { weekStartsOn: 1 });
    const e = endOfWeek(anchor, { weekStartsOn: 1 });
    return `${format(s, 'd MMM', { locale: fr })} – ${format(e, 'd MMM yyyy', { locale: fr })}`;
  }
  if (period === 'mois') return format(anchor, 'MMMM yyyy', { locale: fr });
  return format(anchor, 'yyyy');
}

function navigate(period, anchor, dir) {
  if (period === 'semaine') return dir > 0 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
  if (period === 'mois') return dir > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  return dir > 0 ? addYears(anchor, 1) : subYears(anchor, 1);
}

// ── Invoice row card ─────────────────────────────────────────────────────────
function InvoiceRow({ f, employes, departements, onEdit, onDelete, onPaiement, onValider, onConvertir }) {
  const sm = STATUT_META[f.statut] || STATUT_META.BROUILLON;
  const tm = TYPE_META[f.typeFacture] || TYPE_META.REGULIERE;
  const sensM = SENS_META[f.sens] || SENS_META.VENTE;
  const cm = CAT_META[f.categorie] || CAT_META.AUTRE;
  const mm = MODULE_META[f.module] || MODULE_META.AUTRE;
  const CatIcon = cm.icon;
  const createur = employes.find(e => e.id === f.creePar);
  const dept = departements.find(d => d.id === f.departementId);
  const ttc = f.montantTTC || (parseFloat(f.montantHT || 0) + parseFloat(f.montantTVA || 0));
  const payePct = pct(f.montantPaye || 0, ttc);

  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-default)', borderLeft: `4px solid ${sm.color}`,
      padding: '14px 18px', transition: 'box-shadow var(--transition-fast)',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: `${cm.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CatIcon size={16} style={{ color: cm.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{f.titre}</p>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${tm.color}18`, color: tm.color, fontWeight: 700 }}>{tm.label}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${sensM.color}18`, color: sensM.color, fontWeight: 700 }}>{sensM.label}</span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${cm.color}18`, color: cm.color, fontWeight: 700 }}>{cm.label}</span>
            {f.factureOrigineNumero && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontWeight: 600 }}>
                ← {f.factureOrigineNumero}
              </span>
            )}
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${mm.color}18`, color: mm.color, fontWeight: 700 }}>{mm.label}</span>
<SucursaleBadge sucursalNom={f.sucursalNom} />
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4,
              background: `${sm.color}18`, color: sm.color, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sm.color }} />
              {sm.label}
            </span>
          </div>

          {f.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{f.description}</p>}

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
            {f.dateEmission && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} />Emis : {f.dateEmission}</span>}
            {(f.client?.name || f.clientName || f.nomDestinataire) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <User size={11} />
                {f.client?.name || f.clientName || f.nomDestinataire}
                {!f.clientId && f.nomDestinataire && <span style={{ opacity: 0.6 }}>(hors système)</span>}
              </span>
            )}
            {f.sens === 'ACHAT' && f.nomFournisseur && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <User size={11} />Fournisseur : {f.nomFournisseur}
              </span>
            )}
            {dept && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={11} />{dept.nom}</span>}
            {createur && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Avatar name={createur.name} size={14} />Creee par {createur.name}
              </span>
            )}
            {f.projetNom && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FileText size={11} />{f.projetNom}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 130 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{fmt(f.montantHT)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>HT</p>
          {['PAYEE', 'PARTIELLEMENT_PAYEE'].includes(f.statut) && (
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: 10, color: sm.color, fontWeight: 700 }}>{fmt(f.montantPaye)} paye</p>
              <Progress value={payePct} color={sm.color} size="sm" />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {f.statut === 'BROUILLON' && onValider && (
            <Button variant="ghost" size="sm" onClick={() => onValider(f)} title="Valider comptablement (OHADA)" style={{ color: 'var(--color-info)' }}><CheckCircle size={13} /></Button>
          )}
          {CONVERSION_SUIVANTE[f.typeFacture] && onConvertir && (
            <Button variant="ghost" size="sm" onClick={() => onConvertir(f)}
              title={`Convertir en ${TYPE_META[CONVERSION_SUIVANTE[f.typeFacture]]?.label || CONVERSION_SUIVANTE[f.typeFacture]}`}
              style={{ color: 'var(--color-warning)' }}><SquarePlus size={13} /></Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onPaiement(f)} title="Enregistrer un reglement" style={{ color: 'var(--color-success)' }}><CreditCard size={13} /></Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(f)}><Pencil size={13} /></Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(f)} style={{ color: 'var(--color-danger)' }}><Trash2 size={13} /></Button>
        </div>
      </div>
    </div>
  );
}

// ── Category breakdown ────────────────────────────────────────────────────────
function CategoryBreakdown({ data }) {
  const totals = {};
  data.forEach(f => {
    const cat = f.categorie || 'AUTRE';
    totals[cat] = (totals[cat] || 0) + (f.montantHT || 0);
  });
  const grand = Object.values(totals).reduce((a, b) => a + b, 0);
  if (!grand) return null;

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 20 }}>
      <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Repartition par categorie</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
          const m = CAT_META[cat] || CAT_META.AUTRE;
          const p = pct(total, grand);
          return (
            <div key={cat}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{fmt(total)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({p}%)</span></span>
              </div>
              <Progress value={p} color={m.color} size="sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Payment modal (OHADA) ────────────────────────────────────────────────────
function PaiementModal({ facture, open, onClose, onRefresh, onNotify }) {
  const [mode, setMode] = useState('VIREMENT');
  const [montant, setMontant] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [paiements, setPaiements] = useState([]);

  const loadPaiements = async (id) => {
    try {
      const res = await factureApi.getPaiements(id);
      const d = res.data?.data || res.data;
      setPaiements(Array.isArray(d) ? d : []);
    } catch { setPaiements([]); }
  };

  useEffect(() => {
    if (facture) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('VIREMENT');
      setMontant(facture.montantRestant || '');
      setReference('');
      setNote('');
      loadPaiements(facture.id);
    }
  }, [facture]);

  if (!open || !facture) return null;
  const ttc = facture.montantTTC || (parseFloat(facture.montantHT || 0) + parseFloat(facture.montantTVA || 0));
  const restant = facture.montantRestant != null
    ? facture.montantRestant
    : (ttc - (facture.montantPaye || 0));

  const handleSave = async () => {
    setSaving(true);
    try {
      await factureApi.enregistrerPaiement(facture.id, {
        mode,
        montant: parseFloat(montant) || 0,
        datePaiement: new Date().toISOString().slice(0, 10),
        reference,
        note,
      });

      if (onNotify) {
        onNotify({
          facture: { titre: facture.titre, montantHT: facture.montantHT },
          type: parseFloat(montant) >= (restant || 0) ? NOTIF_TYPES.FACTURE_VALIDATED : NOTIF_TYPES.FACTURE_MODIFIED,
        });
      }

      toast.success('Reglement enregistre (ecriture comptable generee)');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Enregistrer un reglement (OHADA)" width={520}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} loading={saving}>Enregistrer le reglement</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{facture.numeroFacture} — {facture.titre}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            TTC : <b>{fmt(ttc)}</b> · Restant : <b style={{ color: 'var(--color-danger)' }}>{fmt(restant)}</b>
          </p>
        </div>

        <FormRow>
          <Select label="Mode de paiement" value={mode} onChange={e => setMode(e.target.value)}
            options={MODES_PAIEMENT} />
          <Input label="Montant regle (XAF) *" type="number" value={montant}
            onChange={e => setMontant(e.target.value)} placeholder={String(restant || '')} />
        </FormRow>

        <Input label="Reference (n° cheque, virement…)" value={reference}
          onChange={e => setReference(e.target.value)} placeholder="ex: VIR-2026-0045" />

        <Input label="Note (optionnel)" value={note} onChange={e => setNote(e.target.value)} rows={2} />

        {paiements.length > 0 && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Reglements precedents
            </label>
            {paiements.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-muted)' }}>
                <span>{p.datePaiement} · {p.mode} {p.reference ? `(${p.reference})` : ''}</span>
                <b style={{ fontFamily: 'var(--font-mono)' }}>{fmt(p.montant)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Mini stepper (3 points) — affichage en liste ─────────────────────────────
function MiniStepper({ cycle }) {
  const etats = [!!cycle.etape1Faite, !!cycle.etape2Faite, !!cycle.etape3Faite];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }} title={`Étape ${Math.min(cycle.etapeCourante, 3)} / 3`}>
      {etats.map((fait, i) => (
        <Fragment key={i}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: cycle.cloturee || fait ? 'var(--color-success)'
              : i + 1 === cycle.etapeCourante ? 'var(--color-primary)' : 'var(--bg-muted)',
            color: cycle.cloturee || fait || i + 1 === cycle.etapeCourante ? '#fff' : 'var(--text-muted)',
            fontSize: 9.5, fontWeight: 800, flexShrink: 0,
            border: !fait && i + 1 !== cycle.etapeCourante && !cycle.cloturee ? '1px solid var(--border-default)' : 'none',
          }}>
            {cycle.cloturee || fait ? <Check size={10} strokeWidth={3.5} /> : i + 1}
          </span>
          {i < 2 && (
            <span style={{
              width: 14, height: 2, borderRadius: 1, flexShrink: 0,
              background: etats[i + 1] || cycle.cloturee ? 'var(--color-success)' : 'var(--border-default)',
            }} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ── Carte dossier de facturation (clic → modal wizard 3 étapes) ──────────────
function CycleCard({ c, onOpen, onDelete }) {
  const sm = CYCLE_STATUT_META[c.statut] || CYCLE_STATUT_META.BROUILLON;
  const supprimable = (c.statut === 'BROUILLON' || c.statut === 'PROFORMA_RECU') && !c.etape2Faite;
  return (
    <div
      onClick={() => onOpen(c)}
      style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)', borderLeft: `4px solid ${sm.color}`,
        padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow var(--transition-fast)',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 'var(--radius-md)', background: `${sm.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <FolderOpen size={17} style={{ color: sm.color }} />
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', color: sm.color }}>
              {c.numeroReference}
            </span>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{c.titre}</p>
            <Badge variant={c.sens === 'ACHAT' ? 'warning' : 'primary'} size="sm">
              {c.sens === 'ACHAT' ? 'Achat' : 'Vente'}
            </Badge>
            <Badge variant={sm.variant} size="sm" dot>{sm.label}</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
            {c.projetNom && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><FileText size={11} />{c.projetNom}</span>}
            {(c.clientNom || c.nomFournisseur) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={11} />{c.clientNom || c.nomFournisseur}</span>
            )}
            {c.dateCreation && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Calendar size={11} />Ouvert le {String(c.dateCreation).slice(0, 10)}
              </span>
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            <MiniStepper cycle={c} />
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 140 }}>
          {c.montantTTC != null ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {fmt(c.montantTTC)}
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
                TTC · payé {fmt(c.montantPaye)}
              </p>
              {Number(c.montantRestant) > 0 && (
                <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-danger)', marginTop: 2 }}>
                  Restant {fmt(c.montantRestant)}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun montant saisi</p>
          )}
          {supprimable && (
            <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)', marginTop: 6 }}
              onClick={e => { e.stopPropagation(); onDelete(c); }} title="Supprimer le dossier">
              <Trash2 size={13} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Factures() {
  const { notifyFacture } = useNotifications();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [filterSens, setFilterSens] = useState('');
  const [filterType, setFilterType] = useState('');
  // plusieurs agences (ADMIN / SUPER_ADMIN) — un MANAGER est déjà scopé à la sienne.
  const { sucursales, showSucursal, optionsFiltre: sucursalFiltreOptions,
          optionsFormulaire: sucursalFormOptions, correspond: sucursalMatch,
          compteAncre, sucursalUtilisateurNom } = useSucursales();
  const [filterSuc, setFilterSuc] = useState('');

  const [period, setPeriod] = useState('mois');
  const [anchor, setAnchor] = useState(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [paiementDoc, setPaiementDoc] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Dossiers de facturation (refonte interface — cycle 3 étapes) ──────────
  const [cycles, setCycles] = useState([]);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [cycleOuvert, setCycleOuvert] = useState(null);   // id du dossier ouvert (wizard)
  const [nouveauCycleOpen, setNouveauCycleOpen] = useState(false);
  const [cycleForm, setCycleForm] = useState({
    titre: '', projetId: '', clientId: '', sens: 'VENTE', nomFournisseur: '', commentaire: '',
  });
  const [cycleSaving, setCycleSaving] = useState(false);
  const [deleteCycleItem, setDeleteCycleItem] = useState(null);
  const [deletingCycle, setDeletingCycle] = useState(false);
  const [searchCycles, setSearchCycles] = useState('');
  const [filterCycleStatut, setFilterCycleStatut] = useState('');

  // ─── Comptabilité OHADA : onglets Journal de vente / Balance âgée ──────────
  const [vue, setVue] = useState('dossiers');   // dossiers | etats | journal | balance | plan | hors-cycle
  const [journal, setJournal] = useState([]);
  const [balance, setBalance] = useState([]);
  const [validating, setValidating] = useState(false); // eslint-disable-line no-unused-vars

  const loadJournal = async () => {
    try {
      const res = await factureApi.getJournalVente();
      const d = res.data?.data || res.data;
      setJournal(Array.isArray(d) ? d : []);
    } catch { setJournal([]); }
  };
  const loadBalance = async () => {
    try {
      const res = await factureApi.getBalanceAgee();
      const d = res.data?.data || res.data;
      setBalance(Array.isArray(d) ? d : []);
    } catch { setBalance([]); }
  };
  const handleValider = async (f) => {
    setValidating(true);
    try {
      await factureApi.valider(f.id);
      toast.success(`Facture ${f.numeroFacture || f.titre} validee — journal de vente genere (D 411 / C 70x / C 4431)`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur validation');
    } finally {
      setValidating(false);
    }
  };
  // Conversion documentaire PROFORMA → BON_COMMANDE → REGULIERE (Lot 1)
  const handleConvertir = async (f) => {
    const cible = CONVERSION_SUIVANTE[f.typeFacture];
    if (!cible) return;
    setValidating(true);
    try {
      const res = await factureApi.convertir(f.id, cible);
      const created = res.data?.data || res.data;
      toast.success(`${f.numeroFacture || f.titre} converti → ${created?.numeroFacture || TYPE_META[cible]?.label || cible}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion impossible');
    } finally {
      setValidating(false);
    }
  };
  const switchVue = (v) => {
    setVue(v);
    if (v === 'journal' || v === 'plan') loadJournal();
    if (v === 'balance') loadBalance();
  };

  // Plan comptable SYSCOHADA : agrégation du journal par compte (411/70x/4431…)
  const planComptable = useMemo(() => {
    const map = {};
    journal.forEach(e => {
      const k = e.compte || '—';
      if (!map[k]) map[k] = { compte: k, libelle: LIBELLES_COMPTES[k] || '—', nb: 0, debit: 0, credit: 0 };
      map[k].nb += 1;
      map[k].debit += parseFloat(e.debit) || 0;
      map[k].credit += parseFloat(e.credit) || 0;
    });
    return Object.values(map).sort((a, b) => a.compte.localeCompare(b.compte));
  }, [journal]);

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [projets, setProjets] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [departements, setDepartements] = useState([]);
  // Fiche du projet sélectionné dans le modal (succursale + responsables)
  const [projetInfo, setProjetInfo] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await factureApi.getAll({ page: 0, size: 500 });
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  // ─── Dossiers de facturation (cycle 3 étapes) ──────────────────────────────
  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const res = await facturationCycleApi.getAll();
      const d = res.data?.data || res.data;
      setCycles(Array.isArray(d) ? d : []);
    } catch {
      setCycles([]);
    } finally {
      setLoadingCycles(false);
    }
  };

  // Chargement initial unique des deux listes (factures + dossiers de facturation).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); loadCycles(); }, []);

  const setCycleField = (k) => (e) => setCycleForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const creerDossier = async () => {
    if (!cycleForm.titre?.trim()) return toast.error('Le titre du dossier est obligatoire');
    if (!cycleForm.projetId) return toast.error('Le projet est obligatoire');
    if (cycleForm.sens === 'ACHAT' && !cycleForm.nomFournisseur?.trim()) {
      return toast.error('Le fournisseur est obligatoire (sens Achat)');
    }
    setCycleSaving(true);
    try {
      const res = await facturationCycleApi.create({
        titre: cycleForm.titre.trim(),
        description: null,
        projetId: cycleForm.projetId,
        clientId: cycleForm.clientId || null,
        sens: cycleForm.sens,
        nomFournisseur: cycleForm.sens === 'ACHAT' ? cycleForm.nomFournisseur.trim() : null,
        commentaire: cycleForm.commentaire?.trim() || null,
      });
      const created = res.data?.data || res.data;
      toast.success(`Dossier ${created?.numeroReference || ''} ouvert — commencez par l'étape 1 (proforma)`);
      setNouveauCycleOpen(false);
      setCycleForm({ titre: '', projetId: '', clientId: '', sens: 'VENTE', nomFournisseur: '', commentaire: '' });
      loadCycles();
      if (created?.id) setCycleOuvert(created.id);   // ouvre directement le wizard
    } catch (e) {
      const details = e.response?.data?.data;
      if (details && typeof details === 'object' && !Array.isArray(details)) {
        Object.values(details).forEach(m => toast.error(m));
      } else {
        toast.error(e.response?.data?.message || 'Ouverture du dossier impossible');
      }
    } finally {
      setCycleSaving(false);
    }
  };

  const supprimerDossier = async () => {
    setDeletingCycle(true);
    try {
      await facturationCycleApi.delete(deleteCycleItem.id);
      toast.success('Dossier supprimé');
      setDeleteCycleItem(null);
      loadCycles();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Suppression impossible');
    } finally {
      setDeletingCycle(false);
    }
  };

  // Dossiers filtrés (recherche + statut)
  const cyclesFiltres = useMemo(() => cycles.filter(c =>
    (!searchCycles || `${c.numeroReference} ${c.titre} ${c.projetNom || ''} ${c.clientNom || ''} ${c.nomFournisseur || ''}`
      .toLowerCase().includes(searchCycles.toLowerCase())) &&
    (!filterCycleStatut || c.statut === filterCycleStatut)
  ), [cycles, searchCycles, filterCycleStatut]);
  
  useEffect(() => {
    Promise.all([
      projetApi.getAll({ size: 200 }),
      employerApi.getAll({ size: 200 }),
      departementApi?.getAll({ size: 200 }).catch(() => ({ data: [] })),
    ]).then(([p, e, d]) => {
      const pd = p.data?.data || p.data;
      setProjets(Array.isArray(pd) ? pd : pd?.content || []);
      const ed = e.data?.data || e.data;
      setEmployes(Array.isArray(ed) ? ed : ed?.content || []);
      const dd = d.data?.data || d.data;
      setDepartements(Array.isArray(dd) ? dd : dd?.content || []);
    }).catch(() => {});
  }, []);

  const { start, end } = useMemo(() => getPeriodInterval(period, anchor), [period, anchor]);

  // Statistiques des dossiers sur la période (onglet États)
  const cycleStats = useMemo(() => {
    const dansPeriode = cycles.filter(c => {
      const date = c.dateCreation;
      if (!date) return false;
      try { return isWithinInterval(parseISO(date), { start, end }); } catch { return false; }
    });
    const totalTTC = dansPeriode.reduce((s, c) => s + (parseFloat(c.montantTTC) || 0), 0);
    const paye = dansPeriode.reduce((s, c) => s + (parseFloat(c.montantPaye) || 0), 0);
    const restant = dansPeriode.reduce((s, c) => s + (parseFloat(c.montantRestant) || 0), 0);
    const clotures = dansPeriode.filter(c => c.cloturee).length;
    const attente = dansPeriode.filter(c => !c.cloturee && !c.etape3Faite).length;
    return { totalTTC, paye, restant, clotures, attente, count: dansPeriode.length };
  }, [cycles, start, end]);

  const periodData = useMemo(() => data.filter(f => {
    const date = f.dateEmission || f.createdAt;
    if (!date) return false;
    try { return isWithinInterval(parseISO(date), { start, end }); } catch { return false; }
  }), [data, start, end]);

  const filtered = useMemo(() => periodData.filter(f =>
    (!search || f.titre?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatut || f.statut === filterStatut) &&
    (!filterSens || (f.sens || 'VENTE') === filterSens) &&
    (!filterType || f.typeFacture === filterType) &&
    (!filterCat || f.categorie === filterCat) &&
    (!filterModule || (f.module || 'AUTRE') === filterModule) &&
    (!filterDept || f.departementId === filterDept) &&
    (!filterEmp || f.creePar === filterEmp || f.clientId === filterEmp) &&
    sucursalMatch(f, filterSuc)
  ), [periodData, search, filterStatut, filterSens, filterType, filterCat, filterModule, filterDept, filterEmp, filterSuc, sucursalMatch]);

  const prevInterval = useMemo(() => {
    const prev = navigate(period, anchor, -1);
    return getPeriodInterval(period, prev);
  }, [period, anchor]);

  const prevTotal = useMemo(() => data.filter(f => {
    const date = f.dateEmission || f.createdAt;
    if (!date) return false;
    try { return isWithinInterval(parseISO(date), prevInterval); } catch { return false; }
  }).reduce((s, f) => s + (parseFloat(f.montantHT) || 0), 0), [data, prevInterval]);

  const totalCourant = useMemo(
    () => (periodData || []).reduce((s, f) => s + (parseFloat(f.montantHT) || 0), 0),
    [periodData]);
  const trendPct = prevTotal ? Math.round(((totalCourant - prevTotal) / prevTotal) * 100) : null;

  // ── Projet sélectionné → succursale + responsables (fetch de la fiche projet) ─
  const appliquerInfoProjet = (p, fillSucursal) => {
    if (!p || !p.id) return;
    setProjetInfo(p);
    if (!fillSucursal || !showSucursal || !p.sucursalId) return;
    // Seul un compte qui voit/choisit l'agence (ADMIN/SUPER_ADMIN, non scopé) reçoit
    // l'auto-attribution → la facture suit la succursale du projet. Pour les autres
    // rôles le champ est masqué/figé et le backend résout lui-même (aucun risque de 400).
    setForm(f => ({ ...f, sucursalId: String(p.sucursalId) }));
  };

  const loadProjetInfo = (projetId, fillSucursal = false) => {
    if (!projetId) { setProjetInfo(null); return; }
    const local = projets.find(p => String(p.id) === String(projetId));
    if (local) appliquerInfoProjet(local, fillSucursal);   // affichage immédiat (liste en mémoire)
    projetApi.getById(projetId)                            // fiche complète (fetch serveur)
      .then(res => appliquerInfoProjet(res.data?.data || res.data, fillSucursal))
      .catch(() => {});                                    // on conserve l'info locale
  };

  const handleProjetChange = (e) => {
    const id = e.target?.value ?? e;
    setForm(f => ({ ...f, projetId: id || '', ...(id ? {} : { sucursalId: '' }) }));
    loadProjetInfo(id, true);
  };

  const openCreate = () => {
    setForm({ ...EMPTY, dateEmission: todayISO() });
    setProjetInfo(null);
    setEditItem(null);
    setModalOpen(true);
  };
  
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      titre: item.titre || '', description: item.description || '',
      categorie: item.categorie || 'MISSION',
      dateEmission: item.dateEmission || '',
      module: item.module || 'AUTRE', nomDestinataire: item.nomDestinataire || '',
      destinataireRecherche: item.client?.name || item.nomDestinataire || item.clientName || '',
      montantHT: item.montantHT || '', montantTVA: item.montantTVA || '',
      tauxTVA: item.tauxTVA || TVA_DEFAUT,
      compteProduit: item.lignesFacture?.[0]?.compteComptable || '706',
      typeFacture: item.typeFacture || 'REGULIERE', statut: item.statut || 'BROUILLON',
      sens: item.sens || 'VENTE', nomFournisseur: item.nomFournisseur || '',
      factureOrigineId: item.factureOrigineId || '',
      projetId: item.projetId || '', clientId: item.clientId || '',
      departementId: item.departementId || '', creePar: item.creePar || '',
      sucursalId: item.sucursalId || '',
      montantPaye: item.montantPaye || 0,
    });
    loadProjetInfo(item.projetId, false); // info affichée seulement, sans écraser l'attribution
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // Le bouton « Créer » du modal est hors du <form> : la validation native HTML
    // n'est jamais déclenchée → on valide ici les champs obligatoires du backend
    // (FactureRequestDTO : titre, dateEmission et montant HT ; le projet est facultatif).
    const erreurs = [];
    if (!form.titre?.trim()) erreurs.push('Le titre est obligatoire');
    if (!form.dateEmission) erreurs.push("La date d'émission est obligatoire");
    if (!(parseFloat(form.montantHT) > 0)) erreurs.push('Le montant HT est obligatoire');
    if (form.sens === 'ACHAT' && !form.nomFournisseur?.trim()) erreurs.push('Le fournisseur est obligatoire (sens Achat)');
    if (erreurs.length) { erreurs.forEach(m => toast.error(m)); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        montantHT: parseFloat(form.montantHT) || 0,
        montantTVA: parseFloat(form.montantTVA) || 0,
        tauxTVA: parseFloat(form.tauxTVA) || 19.25,
        // OHADA contextualisé : facturation INTERNE (client du groupe) => non assujettie à la TVA
        assujettiTVA: !form.clientId,
        // OHADA : chaque facture porte une ligne comptable unique avec le compte produit choisi
        lignesFacture: (parseFloat(form.montantHT) || 0) > 0 ? [{
          description: form.titre || 'Prestation',
          quantite: 1,
          prixUnitaire: parseFloat(form.montantHT) || 0,
          remisePct: 0,
          tauxTVA: parseFloat(form.tauxTVA) || 19.25,
          compteComptable: form.compteProduit || '706',
        }] : [],
        projetId: form.projetId || null,
        clientId: form.clientId || null,
        // Cycle achat/vente (Lot 1) : sens + fournisseur + chaînage
        sens: form.sens || 'VENTE',
        nomFournisseur: form.sens === 'ACHAT' ? (form.nomFournisseur?.trim() || null) : null,
        factureOrigineId: form.factureOrigineId || null,
        departementId: form.departementId || null,
        creePar: form.creePar || null,
        sucursalId: form.sucursalId || null,
      };
      
      if (editItem) {
        await factureApi.update(editItem.id, payload);
        notifyFacture({
          facture: { id: editItem.id, titre: form.titre, montantHT: form.montantHT },
          targetUserId: form.clientId,
          type: NOTIF_TYPES.FACTURE_MODIFIED,
        });
        toast.success('Facture modifiée');
      } else {
        const response = await factureApi.create(payload);
        const created = response.data?.data || response.data;
        notifyFacture({
          facture: { id: created?.id, titre: form.titre, montantHT: form.montantHT },
          targetUserId: form.clientId,
          type: NOTIF_TYPES.FACTURE_CREATED,
        });
        toast.success('Facture créée');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      // Erreurs de validation backend : { message: "Erreur de validation", data: { champ: message } }
      const details = err.response?.data?.data;
      if (details && typeof details === 'object' && !Array.isArray(details)) {
        Object.values(details).forEach(m => toast.error(m));
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.error
          || "Erreur lors de l'enregistrement de la facture");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await factureApi.delete(deleteItem.id);
      notifyFacture({
        facture: { titre: deleteItem.titre, montantHT: deleteItem.montantHT },
        targetUserId: deleteItem.clientId,
        type: NOTIF_TYPES.FACTURE_DELETED,
      });
      toast.success('Facture supprimée');
      setDeleteItem(null);
      load();
    } catch {
      toast.error('Erreur');
    } finally {
      setDeleting(false);
    }
  };

  const handlePaiementNotify = ({ facture, type }) => {
    notifyFacture({
      facture: { titre: facture.titre, montantHT: facture.montantHT },
      targetUserId: null,
      type: type,
    });
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  // Responsable (manager) de la succursale du projet sélectionné — issu de la
  // liste des succursales déjà chargée par useSucursales().
  const managerProjet = projetInfo?.sucursalId
    ? sucursales.find(s => String(s.id) === String(projetInfo.sucursalId))?.managerNom
    : null;
  const activeFilters = [filterStatut, filterSens, filterType, filterCat, filterModule, filterDept, filterEmp, filterSuc].filter(Boolean).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>Facturation</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Une facture = un cycle en 3 étapes : proforma → bon de commande → facture régulière
          </p>
        </div>
        <Button onClick={() => setNouveauCycleOpen(true)}><SquarePlus size={16} /> Nouveau dossier</Button>
      </div>

      {/* ─── Onglets : dossiers (cœur) + modules annexes hors modal ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'dossiers',  label: 'Dossiers de facturation' },
          { key: 'etats',      label: 'États' },
          { key: 'journal',    label: 'Journal de vente (SYSCOHADA)' },
          { key: 'balance',    label: 'Balance âgée clients' },
          { key: 'plan',       label: 'Plan comptable' },
          { key: 'hors-cycle', label: 'Documents hors cycle' },
        ].map(o => (
          <button key={o.key} onClick={() => switchVue(o.key)}
            style={{
              padding: '7px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              border: `1px solid ${vue === o.key ? 'var(--color-primary)' : 'var(--border-default)'}`,
              background: vue === o.key ? 'var(--color-primary-light)' : 'var(--bg-surface)',
              color: vue === o.key ? 'var(--color-primary)' : 'var(--text-secondary)',
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {vue === 'etats' && (
      <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        padding: '12px 16px', background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setAnchor(new Date()); }}
              style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: period === p.key ? 'var(--color-primary)' : 'var(--bg-muted)',
                color: period === p.key ? '#fff' : 'var(--text-secondary)',
              }}>{p.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setAnchor(a => navigate(period, a, -1))}
            style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <ChevronLeft size={14} />
          </button>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>
            {periodLabel(period, anchor)}
          </p>
          <button onClick={() => setAnchor(a => navigate(period, a, 1))}
            style={{ width: 30, height: 30, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <ChevronRight size={14} />
          </button>
          <button onClick={() => setAnchor(new Date())}
            style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            Aujourd'hui
          </button>
        </div>

        {trendPct !== null && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} style={{ color: trendPct >= 0 ? '#10B981' : '#EF4444' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: trendPct >= 0 ? '#10B981' : '#EF4444' }}>
              {trendPct >= 0 ? '+' : ''}{trendPct}% vs periode precedente
            </span>
          </div>
        )}
      </div>

      <StatsGrid cols={5}>
        <StatCard title="Dossiers" value={cycleStats.count} subtitle="Ouverts sur la période" color="#6366F1" icon={<FolderOpen size={22} />} />
        <StatCard title="TTC facturé" value={fmt(cycleStats.totalTTC)} subtitle="Bon de commande / régulière" color="#F97316" icon={<FileText size={22} />} />
        <StatCard title="Encaissé" value={fmt(cycleStats.paye)} subtitle="Règlements reçus" color="#10B981" icon={<CheckCircle size={22} />} />
        <StatCard title="Restant" value={fmt(cycleStats.restant)} subtitle="À encaisser" color="#F59E0B" icon={<CreditCard size={22} />} />
        <StatCard title="Clôturés" value={cycleStats.clotures} subtitle={`${cycleStats.attente} cycle(s) en cours`} color="#0EA5E9" icon={<CheckCircle size={22} />} />
      </StatsGrid>
      </>
      )}

      {/* ─── Dossiers de facturation — cœur de l'interface (clic → wizard) ─── */}
      {vue === 'dossiers' && (
      <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={searchCycles} onChange={setSearchCycles}
          placeholder="Rechercher un dossier (réf., titre, projet, client)…"
          style={{ flex: '1 1 240px', maxWidth: 360 }} />
        <Select label={undefined} value={filterCycleStatut} onChange={e => setFilterCycleStatut(e.target.value)}
          options={[{ value: '', label: 'Tous les statuts' },
            ...Object.entries(CYCLE_STATUT_META).map(([k, v]) => ({ value: k, label: v.label }))]}
          style={{ minWidth: 230 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {cyclesFiltres.length} dossier{cyclesFiltres.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loadingCycles ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 96, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />)}
        </div>
      ) : cyclesFiltres.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
          <FolderOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Aucun dossier de facturation — créez-en un pour démarrer le cycle proforma → bon de commande → facture.
          </p>
          <div style={{ marginTop: 16 }}>
            <Button onClick={() => setNouveauCycleOpen(true)} leftIcon={<SquarePlus size={16} />}>Nouveau dossier</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cyclesFiltres.map(c => (
            <CycleCard key={c.id} c={c} onOpen={item => setCycleOuvert(item.id)} onDelete={setDeleteCycleItem} />
          ))}
        </div>
      )}
      </>
      )}

      {vue === 'journal' && (
        <Card padding={16}>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Journal de vente — D 411 Clients / C 701-706-707 Produits / C 4431 TVA collectee
          </p>
          {journal.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune ecriture — validez des factures pour generer le journal.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '2px solid var(--border-default)' }}>
                    <th style={{ padding: '6px 8px' }}>Date</th>
                    <th style={{ padding: '6px 8px' }}>Facture</th>
                    <th style={{ padding: '6px 8px' }}>Compte</th>
                    <th style={{ padding: '6px 8px' }}>Libelle</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Debit</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Credit</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: 'var(--font-mono)' }}>
                  {journal.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '6px 8px' }}>{e.date}</td>
                      <td style={{ padding: '6px 8px' }}>{e.numeroFacture || '—'}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{e.compte}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-sans)' }}>{e.libelle}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: e.debit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{e.debit > 0 ? fmt(e.debit) : ''}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: e.credit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{e.credit > 0 ? fmt(e.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {vue === 'balance' && (
        <Card padding={16}>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Balance agee clients (compte 411) — encours par anciennete
          </p>
          {balance.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun encours client — toutes les factures sont soldees.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '2px solid var(--border-default)' }}>
                    <th style={{ padding: '6px 8px' }}>Facture</th>
                    <th style={{ padding: '6px 8px' }}>Client</th>
                    <th style={{ padding: '6px 8px' }}>Emission</th>
                    <th style={{ padding: '6px 8px' }}>Tranche</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Encours</th>
                  </tr>
                </thead>
                <tbody>
                  {balance.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{r.numeroFacture}</td>
                      <td style={{ padding: '6px 8px' }}>{r.client || 'Client divers'}</td>
                      <td style={{ padding: '6px 8px' }}>{r.dateEmission}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                          background: r.tranche === '>90' ? '#EF444418' : r.tranche === '61-90' ? '#F9731618' : r.tranche === '31-60' ? '#F59E0B18' : '#10B98118',
                          color: r.tranche === '>90' ? '#EF4444' : r.tranche === '61-90' ? '#F97316' : r.tranche === '31-60' ? '#F59E0B' : '#10B981',
                        }}>{r.tranche} jours</span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(r.montantRestant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ─── Plan comptable SYSCOHADA (module annexe hors modal) ─── */}
      {vue === 'plan' && (
        <Card padding={16}>
          <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Plan comptable utilisé — écritures du journal de vente
          </p>
          {planComptable.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Aucune écriture — validez des factures régulières pour alimenter le plan comptable.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '2px solid var(--border-default)' }}>
                    <th style={{ padding: '6px 8px' }}>Compte</th>
                    <th style={{ padding: '6px 8px' }}>Libellé</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Écritures</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total débit</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {planComptable.map(r => (
                    <tr key={r.compte} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{r.compte}</td>
                      <td style={{ padding: '6px 8px' }}>{r.libelle}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.nb}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(r.debit)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{fmt(r.credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {vue === 'hors-cycle' && (
      <>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        Documents hors du nouveau cycle 3 étapes : acomptes, soldes, avoirs et factures historiques.
      </p>
      <CategoryBreakdown data={filtered} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher…" style={{ flex: '1 1 200px', maxWidth: 300 }} />
        <button onClick={() => setShowFilters(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
            background: activeFilters > 0 ? 'var(--color-primary-light)' : 'var(--bg-surface)',
            color: activeFilters > 0 ? 'var(--color-primary)' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
          Filtres
          {activeFilters > 0 && <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{activeFilters}</span>}
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { setFilterStatut(''); setFilterSens(''); setFilterType(''); setFilterCat(''); setFilterModule(''); setFilterDept(''); setFilterEmp(''); setFilterSuc(''); }}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Reinitialiser
          </button>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} resultat{filtered.length !== 1 ? 's' : ''}</span>
        <Button variant="secondary" size="sm" onClick={openCreate} leftIcon={<SquarePlus size={14} />}>
          Nouvelle facture (hors cycle)
        </Button>
      </div>

      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, padding: '14px 16px', marginBottom: 16, background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-muted)' }}>
          <Select label="Statut" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            options={[{ value: '', label: 'Tous' }, ...STATUTS.map(s => ({ value: s, label: STATUT_META[s].label }))]} />
          <Select label="Sens" value={filterSens} onChange={e => setFilterSens(e.target.value)}
            options={[{ value: '', label: 'Tous' }, ...SENS.map(s => ({ value: s, label: SENS_META[s].label }))]} />
          <Select label="Type" value={filterType} onChange={e => setFilterType(e.target.value)}
            options={[{ value: '', label: 'Tous' }, ...TYPES.map(t => ({ value: t, label: TYPE_META[t].label }))]} />
          <Select label="Categorie" value={filterCat} onChange={e => setFilterCat(e.target.value)}
            options={[{ value: '', label: 'Toutes' }, ...CATEGORIES.map(c => ({ value: c, label: CAT_META[c].label }))]} />
          <Select label="Module" value={filterModule} onChange={e => setFilterModule(e.target.value)}
            options={[{ value: '', label: 'Tous' }, ...MODULES.map(m => ({ value: m, label: MODULE_META[m].label }))]} />
          <Select label="Departement" value={filterDept} onChange={e => setFilterDept(e.target.value)}
            options={[{ value: '', label: 'Tous' }, ...departements.map(d => ({ value: d.id, label: d.nom }))]} />
          <Select label="Creee par / Client" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
            options={[{ value: '', label: 'Tous' }, ...employes.map(e => ({ value: e.id, label: e.name }))]} />
          {showSucursal && (
            <Select label="Succursale" value={filterSuc} onChange={e => setFilterSuc(e.target.value)}
              options={sucursalFiltreOptions} />
          )}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 90, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Aucune facture sur cette periode</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Regroupement par module (1.8) puis par type à l'intérieur */}
          {Object.entries(
            filtered.reduce((acc, f) => {
              const m = f.module || 'AUTRE';
              (acc[m] = acc[m] || []).push(f);
              return acc;
            }, {})
          )
            .sort((a, b) => (a[0] === 'AUTRE' ? 1 : b[0] === 'AUTRE' ? -1 : a[0].localeCompare(b[0])))
            .map(([mod, list]) => {
              const mm = MODULE_META[mod] || MODULE_META.AUTRE;
              const totalMod = list.reduce((s, f) => s + (parseFloat(f.montantHT) || 0), 0);
              return (
                <div key={mod}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    background: `${mm.color}12`,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: mm.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {mm.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{list.length} facture{list.length !== 1 ? 's' : ''}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: mm.color }}>{fmt(totalMod)} HT</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[...list]
                      .sort((a, b) => (a.typeFacture || '').localeCompare(b.typeFacture || '')
                        || String(b.dateEmission || '').localeCompare(String(a.dateEmission || '')))
                      .map(f => (
                        <InvoiceRow key={f.id} f={f}
                          employes={employes} departements={departements}
                          onEdit={openEdit}
                          onDelete={setDeleteItem}
                          onPaiement={doc => setPaiementDoc(doc)}
                          onValider={handleValider}
                          onConvertir={handleConvertir}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Modifier la facture' : 'Nouvelle facture'} width={680}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Creer'}</Button>
          </div>
        }
      >
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Titre *" value={form.titre} onChange={set('titre')} required placeholder="Titre de la facture" />
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Details…" rows={2} />

            <FormRow>
              <Select label="Type" value={form.typeFacture} onChange={set('typeFacture')}
                options={TYPES.map(t => ({ value: t, label: TYPE_META[t].label }))} />
              <Select label="Sens" value={form.sens} onChange={set('sens')}
                options={SENS.map(s => ({ value: s, label: SENS_META[s].label }))} />
            </FormRow>
            {(form.typeFacture === 'PROFORMA' || form.typeFacture === 'BON_COMMANDE') && (
              <p style={{ fontSize: 11, color: '#F59E0B', background: '#F59E0B14', border: '1px solid #F59E0B44', borderRadius: 8, padding: '8px 10px' }}>
                Document sans valeur comptable : aucune écriture OHADA ne sera générée. Convertissez-le en facture régulière pour comptabiliser.
              </p>
            )}

            <FormRow>
              <Select label="Categorie *" value={form.categorie} onChange={set('categorie')}
                options={CATEGORIES.map(c => ({ value: c, label: CAT_META[c].label }))} />
              {form.sens === 'ACHAT' ? (
                <Input label="Fournisseur *" value={form.nomFournisseur} onChange={set('nomFournisseur')}
                  placeholder="Nom du fournisseur…" required />
              ) : (
                <Select label="Module *" value={form.module} onChange={set('module')}
                  options={MODULES.map(m => ({ value: m, label: MODULE_META[m].label }))} />
              )}
            </FormRow>

            <FormRow>
              <Input label="Date d'emission" type="date" value={form.dateEmission} onChange={set('dateEmission')} required />
              <Select label="Module *" value={form.module} onChange={set('module')}
                options={MODULES.map(m => ({ value: m, label: MODULE_META[m].label }))} />
            </FormRow>

            {/* Destinataire intelligent : correspondance avec un compte (autocomplétion)
                ou nom libre si le destinataire n'existe pas dans le système */}
            <div>
              <Input
                label="Destinataire (nom ou email)"
                value={form.destinataireRecherche || ''}
                onChange={e => {
                  const saisie = e.target.value;
                  const match = employes.find(emp =>
                    emp.email?.toLowerCase() === saisie.trim().toLowerCase()
                    || emp.name?.toLowerCase() === saisie.trim().toLowerCase()
                  );
                  setForm(f => ({
                    ...f,
                    destinataireRecherche: saisie,
                    clientId: match ? match.id : '',
                    nomDestinataire: match ? '' : saisie.trim(),
                  }));
                }}
                list="employes-datalist"
                placeholder="Tapez un nom/email existant ou un nom libre…"
              />
              <datalist id="employes-datalist">
                {employes.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.email}</option>
                ))}
              </datalist>
              {form.clientId && (
                <p style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 4 }}>
                  ✓ Correspondance trouvée : la facture sera liée au compte sélectionné.
                </p>
              )}
              {!form.clientId && form.nomDestinataire && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Destinataire conservé en texte libre (hors système).
                </p>
              )}
            </div>

            <FormRow>
              <Input label="Montant HT (XAF) *" type="number" value={form.montantHT} onChange={set('montantHT')} required placeholder="0" />
              <Select label="Compte produit (SYSCOHADA)" value={form.compteProduit} onChange={set('compteProduit')}
                options={COMPTES_PRODUITS} />
            </FormRow>

            <FormRow>
              <Input label="Taux TVA (%)" type="number" step="0.01" value={form.tauxTVA} onChange={set('tauxTVA')} placeholder="19.25" />
              <Input label={form.clientId ? 'TVA — non applicable (facture interne)' : 'TVA calculée (XAF)'} value={(() => {
                if (form.clientId) return '0';
                const ht = parseFloat(form.montantHT) || 0;
                const taux = parseFloat(form.tauxTVA) || 0;
                return (Math.round(ht * taux) / 100).toLocaleString('fr-FR');
              })()} readOnly hint={form.clientId ? 'Client interne du groupe : pas de TVA collectée (pas d’écriture 4431)' : 'Montant HT × taux — calculée automatiquement'} />
            </FormRow>

            <Select label="Etat du paiement" value={form.statut} onChange={set('statut')}
              options={STATUTS.map(s => ({ value: s, label: STATUT_META[s].label }))} />

            <FormRow>
              <Select label="Projet (facultatif)" value={form.projetId} onChange={handleProjetChange}
                options={[{ value: '', label: 'Sans projet' }, ...projets.map(p => ({ value: p.id, label: p.nom }))]} />
              <Select label="Departement" value={form.departementId} onChange={set('departementId')}
                options={[{ value: '', label: 'Aucun' }, ...departements.map(d => ({ value: d.id, label: d.nom }))]} />
            </FormRow>

            {/* Projet sélectionné → rattachement succursale + responsables (fetch) */}
            {projetInfo && (
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 12px',
                fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '8px 10px',
              }}>
                <Building2 size={13} style={{ flexShrink: 0 }} />
                <span>Succursale&nbsp;: <strong style={{ color: 'var(--text-primary)' }}>{projetInfo.sucursalNom || 'Siège'}</strong></span>
                {projetInfo.chefProjet?.name && (
                  <span>Chef de projet&nbsp;: <strong style={{ color: 'var(--text-primary)' }}>{projetInfo.chefProjet.name}</strong></span>
                )}
                {managerProjet && (
                  <span>Responsable agence&nbsp;: <strong style={{ color: 'var(--text-primary)' }}>{managerProjet}</strong></span>
                )}
              </div>
            )}

            <FormRow>
              <Select label="Creee par" value={form.creePar} onChange={set('creePar')}
                options={[{ value: '', label: 'Selectionner…' }, ...employes.map(e => ({ value: e.id, label: e.name }))]} />
              <SucursaleField showSucursal={showSucursal} value={form.sucursalId} onChange={set('sucursalId')}
                options={sucursalFormOptions} compteAncre={compteAncre} sucursalUtilisateurNom={sucursalUtilisateurNom} />
            </FormRow>
          </div>
        </form>
      </Modal>

      <PaiementModal
        facture={paiementDoc}
        open={!!paiementDoc}
        onClose={() => setPaiementDoc(null)}
        onRefresh={load}
        onNotify={handlePaiementNotify}
      />

      {/* ─── Wizard de facturation — barre de progression 3 points ─── */}
      <CycleFacturationModal
        cycleId={cycleOuvert}
        open={!!cycleOuvert}
        onClose={() => { setCycleOuvert(null); loadCycles(); }}
        onRefresh={loadCycles}
      />

      {/* ─── Modal « Nouveau dossier » (ouvre ensuite le wizard étape 1) ─── */}
      <Modal open={nouveauCycleOpen} onClose={() => setNouveauCycleOpen(false)}
        title="Nouveau dossier de facturation" width={560}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setNouveauCycleOpen(false)}>Annuler</Button>
            <Button onClick={creerDossier} loading={cycleSaving}>Ouvrir le dossier</Button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Le dossier pilote le cycle en 3 étapes : <b>1) proforma (PDF reçu)</b> →
            <b> 2) bon de commande (saisie + PDF généré)</b> →
            <b> 3) facture régulière (après paiement)</b>. Une facture n'existe pleinement qu'une fois les 3 étapes complétées.
          </p>
          <Input label="Titre du dossier *" value={cycleForm.titre} onChange={setCycleField('titre')}
            placeholder="Objet de la prestation / du marché…" />
          <FormRow>
            <Select label="Projet *" value={cycleForm.projetId} onChange={setCycleField('projetId')}
              options={[{ value: '', label: 'Sélectionner…' }, ...projets.map(p => ({ value: p.id, label: p.nom }))]} />
            <Select label="Sens" value={cycleForm.sens} onChange={setCycleField('sens')}
              options={SENS.map(s => ({ value: s, label: SENS_META[s].label }))} />
          </FormRow>
          <FormRow>
            {cycleForm.sens === 'ACHAT' ? (
              <Input label="Fournisseur *" value={cycleForm.nomFournisseur} onChange={setCycleField('nomFournisseur')}
                placeholder="Nom du fournisseur…" />
            ) : (
              <Select label="Client (optionnel)" value={cycleForm.clientId} onChange={setCycleField('clientId')}
                options={[{ value: '', label: 'Aucun' }, ...employes.map(e => ({ value: e.id, label: e.name }))]} />
            )}
            <Input label="Commentaire" value={cycleForm.commentaire} onChange={setCycleField('commentaire')} />
          </FormRow>
        </div>
      </Modal>

      <Confirm open={!!deleteCycleItem} onClose={() => setDeleteCycleItem(null)} onConfirm={supprimerDossier}
        loading={deletingCycle} title="Supprimer le dossier"
        message={`Supprimer le dossier « ${deleteCycleItem?.numeroReference} » ? Seuls les dossiers sans documents comptables peuvent être supprimés.`}
        confirmLabel="Supprimer" />

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer la facture"
        message={`Supprimer "${deleteItem?.titre}" ?`} confirmLabel="Supprimer" />
      
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
