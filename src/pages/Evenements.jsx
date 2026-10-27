// Evenements.jsx - Version finale avec droits corrects (créateur, ADMIN ou SUPER_ADMIN)
import React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDeferredTask } from '../hooks/useDeferredTask';
import {
  SquarePlus, Pencil, Trash2, Calendar, Clock, MapPin, Users, Bell,
  Globe, Lock, ChevronLeft, ChevronRight, Cake, Plane,
  Coffee, Tag, Filter, List, LayoutGrid, X, Check,
  Building2, FolderOpen, User, UserCircle,
} from 'lucide-react';
import { evenementApi, projetApi, employerApi, departementApi, secretariatApi, entrepriseApi } from '../Api';
import {
  Card, Button, Modal, Input, Select, Confirm,
  SearchInput, Avatar, FormRow, Textarea, StatsGrid, StatCard, IconBox, SucursaleBadge, SucursaleField,
} from '../components/ui';
import {
  format, parseISO, isFuture, isToday,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths,
  getDay, isValid,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/Authcontext';
import { useSucursales } from '../hooks/useSucursales';

const TYPES = ['REUNION', 'FORMATION', 'MISSION', 'AUTRE'];
const TYPE_META = {
  REUNION:    { label: 'Reunion',    color: '#6366F1', icon: Users },
  FORMATION:  { label: 'Formation',  color: '#10B981', icon: Coffee },
  MISSION:    { label: 'Mission',    color: '#8B5CF6', icon: Plane },
  AUTRE:      { label: 'Autre',      color: '#94A3B8', icon: Tag },
};
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', Icon: Globe, hint: "Visible par toute l'equipe + notification" },
  { value: 'PRIVE',  label: 'Prive',  Icon: Lock,  hint: 'Visible uniquement par vous' },
];
const RAPPEL_OPTIONS = [
  { value: '5',    label: '5 minutes avant' },
  { value: '15',   label: '15 minutes avant' },
  { value: '30',   label: '30 minutes avant' },
  { value: '60',   label: '1 heure avant' },
  { value: '1440', label: '1 jour avant' },
];

const EMPTY_FORM = {
  titre: '', description: '', type: 'REUNION', sousType: '',
  dateDebut: '', heureDebut: '', dateFin: '', heureFin: '',
  lieu: '', couleur: '#6366F1', visibilite: 'PUBLIC',
  rappelActif: false, minutesRappel: '30', jourEntier: false,
  participantsIds: [], projetId: '', departementId: '',
  sucursalId: '',
  selectionMode: 'users',
};

function safeParseISO(str) {
  if (!str) return null;
  try { const d = parseISO(str); return isValid(d) ? d : null; } catch { return null; }
}

function fmtTime(h, hf) { if (h && hf) return `${h} → ${hf}`; return h || hf || null; }

function getStatus(ev) {
  const d = safeParseISO(ev.dateDebut);
  if (!d) return { label: '?', color: '#94A3B8' };
  if (isToday(d))  return { label: "Aujourd'hui", color: '#0EA5E9' };
  if (isFuture(d)) return { label: 'A venir',    color: '#6366F1' };
  return { label: 'Passe', color: '#94A3B8' };
}

function toStrId(val) {
  if (val == null) return '';
  if (typeof val === 'object') return String(val.id ?? '');
  return String(val);
}

function toParticipantIds(raw) {
  if (!raw) return [];
  return raw.map(p => (typeof p === 'object' ? String(p.id ?? '') : String(p))).filter(Boolean);
}

// Fonction robuste pour récupérer l'ID du créateur
function getCreatorId(ev) {
  if (!ev) return null;
  if (ev.createur?.id) return String(ev.createur.id);
  if (ev.createurId) return String(ev.createurId);
  if (ev.createdBy) return String(ev.createdBy);
  if (ev.creatorId) return String(ev.creatorId);
  if (ev.userId) return String(ev.userId);
  if (ev.ownerId) return String(ev.ownerId);
  if (ev.createur && typeof ev.createur === 'string') return String(ev.createur);
  return null;
}

function getCreatorName(ev) {
  if (ev.createur?.name) return ev.createur.name;
  if (ev.createur?.nom) return ev.createur.nom;
  if (ev.createur?.email) return ev.createur.email;
  if (ev.createurNom) return ev.createurNom;
  if (ev.createdByName) return ev.createdByName;
  if (ev.creatorName) return ev.creatorName;
  return 'Utilisateur';
}

// Composant ParticipantPicker — selection individuelle ou par departement (multi-selection)
function ParticipantPicker({ employes, departements, selected, onChange, selectionMode, onModeChange }) {
  const [search, setSearch] = useState('');
  const selectedStrs = useMemo(() => selected.map(String), [selected]);

  const btnPill = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600,
    background: active ? 'var(--color-primary)' : 'var(--bg-surface)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: '1px solid var(--border-default)', cursor: 'pointer',
  });
  const rowStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
    borderRadius: 'var(--radius-md)', cursor: 'pointer', marginBottom: 2,
    background: active ? 'var(--color-primary-light)' : 'transparent',
  });

  const toggleEmploye = (id) => {
    const s = String(id);
    onChange(selectedStrs.includes(s) ? selectedStrs.filter(x => x !== s) : [...selectedStrs, s]);
  };

  // Cocher/decocher un departement = ajouter/retirer tous ses employes
  const toggleDepartement = (deptId) => {
    const membres = employes.filter(e => String(e.departement?.id) === String(deptId));
    const tousSelectionnes = membres.length > 0 && membres.every(e => selectedStrs.includes(String(e.id)));
    const next = new Set(selectedStrs);
    membres.forEach(e => { if (tousSelectionnes) next.delete(String(e.id)); else next.add(String(e.id)); });
    onChange([...next]);
  };

  const tousEmployesSelectionnes = employes.length > 0 && employes.every(e => selectedStrs.includes(String(e.id)));
  // Bouton "Tout" : tous les departements (ou tous les employes en mode individuel)
  const toggleTous = () => onChange(tousEmployesSelectionnes ? [] : employes.map(e => String(e.id)));

  const deptInfos = departements.map(d => {
    const membres = employes.filter(e => String(e.departement?.id) === String(d.id));
    const nbSel = membres.filter(e => selectedStrs.includes(String(e.id))).length;
    return { ...d, nbMembres: membres.length, nbSelectionnes: nbSel, complet: membres.length > 0 && nbSel === membres.length };
  });

  const filteredEmployes = employes.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()));

  const selectedEmps = employes.filter(e => selectedStrs.includes(String(e.id)));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Participants — {selectedEmps.length} selectionne{selectedEmps.length !== 1 ? 's' : ''}{selectedEmps.length > 0 ? ' (notifies a la creation)' : ''}
        </label>
        <button type="button" onClick={toggleTous} style={btnPill(tousEmployesSelectionnes)}>
          {selectionMode === 'departements' ? <Building2 size={12} /> : <Users size={12} />}
          {tousEmployesSelectionnes ? 'Deselectionner tout' : (selectionMode === 'departements' ? 'Tous les departements' : 'Tous les employes')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => onModeChange('users')} style={btnPill(selectionMode === 'users')}>
          <Users size={12} /> Selection individuelle
        </button>
        <button type="button" onClick={() => onModeChange('departements')} style={btnPill(selectionMode === 'departements')}>
          <Building2 size={12} /> Par departement
        </button>
      </div>

      {/* Zone de selection agrandie et scrollable */}
      <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', maxHeight: 280, overflowY: 'auto', padding: 8 }}>
        {selectionMode === 'departements' && deptInfos.map(d => (
          <label key={d.id} style={rowStyle(d.complet)}>
            <input type="checkbox" checked={d.complet} onChange={() => toggleDepartement(d.id)} style={{ accentColor: 'var(--color-primary)', width: 16, height: 16, flexShrink: 0 }} />
            <Building2 size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                {d.nbMembres} employe{d.nbMembres !== 1 ? 's' : ''}{d.nbSelectionnes > 0 && !d.complet ? ` — ${d.nbSelectionnes} ajoute(s)` : ''}
              </p>
            </div>
            {d.complet && <Check size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
          </label>
        ))}


        {selectionMode === 'users' && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un employe..." style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            {filteredEmployes.map(emp => {
              const isSel = selectedStrs.includes(String(emp.id));
              return (
                <label key={emp.id} style={rowStyle(isSel)}>
                  <input type="checkbox" checked={isSel} onChange={() => toggleEmploye(emp.id)} style={{ accentColor: 'var(--color-primary)', width: 15, height: 15, flexShrink: 0 }} />
                  <Avatar name={emp.name} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</p>
                    {emp.email && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{emp.email}</p>}
                  </div>
                  {emp.poste && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{typeof emp.poste === 'object' ? emp.poste.name : emp.poste}</span>}
                </label>
              );
            })}
            {filteredEmployes.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 18, margin: 0 }}>Aucun employe trouve</p>
            )}
          </>
        )}

        {selectionMode !== 'users' && selectionMode !== 'departements' && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 18, margin: 0 }}>Choisissez un mode de selection</p>
        )}
      </div>

      {/* Recapitulatif : toutes les personnes qui recevront la notification */}
      {selectedEmps.length > 0 && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-muted)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Seront notifies ({selectedEmps.length})
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selectedEmps.map(emp => (
              <span key={emp.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)40', fontSize: 11, fontWeight: 600, color: 'var(--color-primary)' }}>
                <Avatar name={emp.name} size={16} />{emp.name}
                <button type="button" onClick={() => toggleEmploye(emp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary)', display: 'flex' }}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Composant EventCard : le créateur, un ADMIN ou le SUPER_ADMIN voient les boutons
function EventCard({ ev, onEdit, onDelete, currentUserId, currentUserRole }) {
  const meta = TYPE_META[ev.type] || TYPE_META.AUTRE;
  const status = getStatus(ev);
  const IconT = meta.icon;
  const color = ev.couleur || meta.color;
  
  // Récupération de l'ID du créateur
  const creatorId = getCreatorId(ev);
  const userId = currentUserId ? String(currentUserId) : null;
  
  // Vérifications
  const isCreator = userId && creatorId && String(userId) === String(creatorId);
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  // 🔑 RÈGLE (alignée backend) : le créateur, un ADMIN ou le SUPER_ADMIN peuvent modifier/supprimer
  // (le parent a déjà intégré le repli `isAdmin` dans `currentUserRole`)
  const canModify = isCreator || isSuperAdmin || currentUserRole === 'ADMIN';
  const canDelete = currentUserRole !== 'SECRETAIRE' && canModify;

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', border: '1px solid var(--border-default)', borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'box-shadow var(--transition-fast)' }} onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <IconBox icon={<IconT size={16} />} color={color} style={{ marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
          <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{ev.titre}</h4>
          {ev.sousType && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontWeight: 600 }}>{ev.sousType}</span>}
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${color}18`, color, fontWeight: 700 }}>{meta.label}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${status.color}14`, color: status.color, fontWeight: 600 }}>{status.label}</span>
          <SucursaleBadge sucursalNom={ev.sucursalNom} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>
            {ev.visibilite === 'PRIVE' ? <><Lock size={9} /> Prive</> : <><Globe size={9} /> Public</>}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <UserCircle size={12} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cree par <strong>{getCreatorName(ev)}</strong></span>
          {isCreator && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#6366F120', color: '#6366F1', fontWeight: 600 }}>Createur</span>}
          {isSuperAdmin && !isCreator && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#EF444420', color: '#EF4444', fontWeight: 600 }}>Super Admin</span>}
        </div>
        {ev.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{ev.description}</p>}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {fmtTime(ev.heureDebut, ev.heureFin) && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />{fmtTime(ev.heureDebut, ev.heureFin)}</span>}
          {ev.lieu && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{ev.lieu}</span>}
          {ev.projet?.nom && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><FolderOpen size={11} />{ev.projet.nom}</span>}
          {ev.nombreParticipants > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={11} />{ev.nombreParticipants} participant{ev.nombreParticipants !== 1 ? 's' : ''}</span>}
          {ev.rappelActif && <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}><Bell size={11} />Rappel {ev.minutesRappel}min</span>}
        </div>
      </div>
      {/* BOUTONS : créateur, ADMIN ou SUPER_ADMIN */}
      {canModify && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(ev); }} title="Modifier"><Pencil size={13} /></Button>
          {canDelete && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(ev); }} title="Supprimer" style={{ color: 'var(--color-danger)' }}><Trash2 size={13} /></Button>}
        </div>
      )}
    </div>
  );
}

// Composant CalendarView
function CalendarView({ events, onDayClick, currentMonth, onMonthChange }) {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startPad = getDay(start) === 0 ? 6 : getDay(start) - 1;
  const padded = [...Array(startPad).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);
  const WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ChevronLeft size={15} /></button>
        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>{format(currentMonth, 'MMMM yyyy', { locale: fr })}</p>
        <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ChevronRight size={15} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-muted)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-muted)' }}>
        {WEEK.map(w => (<div key={w} style={{ background: 'var(--bg-muted)', padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{w}</div>))}
        {padded.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} style={{ background: 'var(--bg-muted)', minHeight: 100 }} />;
          const dayEvents = events.filter(ev => { const d = safeParseISO(ev.dateDebut); return d && isSameDay(d, day); });
          const isCurrentDay = isToday(day);
          return (
            <div key={day.toISOString()} style={{ background: isCurrentDay ? 'var(--color-primary-light)' : 'var(--bg-surface)', minHeight: 100, padding: '6px', cursor: 'pointer', transition: 'background var(--transition-fast)' }} onClick={() => onDayClick(day, dayEvents)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700, background: isCurrentDay ? 'var(--color-primary)' : 'transparent', color: isCurrentDay ? '#fff' : 'var(--text-primary)', marginBottom: 3 }}>{format(day, 'd')}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvents.slice(0, 3).map(ev => {
                  const c = ev.couleur || (TYPE_META[ev.type] || TYPE_META.AUTRE).color;
                  return (<div key={ev.id} style={{ fontSize: 10, padding: '2px 4px', borderRadius: 3, background: `${c}22`, color: c, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titre}</div>);
                })}
                {dayEvents.length > 3 && <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>+{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant DayModal
function DayModal({ day, events, open, onClose, onEdit, onDelete, onNew, currentUserId, currentUserRole }) {
  if (!open || !day) return null;
  const title = format(day, "EEEE d MMMM yyyy", { locale: fr });
  return (
    <Modal open={open} onClose={onClose} title={title.charAt(0).toUpperCase() + title.slice(1)} width={580} footer={<div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button onClick={() => { onNew(day); onClose(); }}><SquarePlus size={14} /> Ajouter un evenement</Button></div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px 0' }}><Calendar size={36} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} /><p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Aucun evenement ce jour</p></div>) : (events.map(ev => (<EventCard key={ev.id} ev={ev} onEdit={onEdit} onDelete={onDelete} currentUserId={currentUserId} currentUserRole={currentUserRole} />)))}
      </div>
    </Modal>
  );
}

// Composant principal Evenements
export default function Evenements({ currentUser: currentUserProp, isAdmin = false }) {
  const { user } = useAuth();
  const { notifyEvent } = useNotifications();
  // La route ne transmet aucune prop (cf. App.jsx : <Evenements />) : on retombe
  // sur l'utilisateur du contexte d'authentification, comme les autres pages.
  const currentUser = currentUserProp || user;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterVis, setFilterVis] = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const { showSucursal, sucursales, optionsFiltre: sucursalFiltreOptions,
          optionsFormulaire: sucursalFormOptions, correspond: sucursalMatch,
          compteAncre, sucursalUtilisateurNom } = useSucursales();
  const [filterSuc, setFilterSuc] = useState('');
  const [filterEntreprise, setFilterEntreprise] = useState('');
  const [entreprises, setEntreprises] = useState([]);
  const [view, setView] = useState('timeline');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [dayModal, setDayModal] = useState({ open: false, day: null, events: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projets, setProjets] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const currentUserId = currentUser?.id;
  // `isAdmin` sert de filet de sécurité si la prop est fournie sans rôle exploitable.
  const currentUserRole = currentUser?.roleName || currentUser?.role?.name || (isAdmin ? 'ADMIN' : undefined);
  const showEntrepriseFilter = currentUserRole === 'SUPER_ADMIN';

  useEffect(() => {
    if (!showEntrepriseFilter) return;
    entrepriseApi.getAll({ page: 0, size: 200 })
      .then(r => { const d = r.data?.data || r.data; setEntreprises(Array.isArray(d) ? d : d?.content || []); })
      .catch(() => setEntreprises([]));
  }, [showEntrepriseFilter]);

  const branchesDisponibles = useMemo(() => {
    const entrepriseId = showEntrepriseFilter ? filterEntreprise : (currentUser?.entrepriseId || currentUser?.entreprise?.id);
    if (!entrepriseId) return [];
    return sucursales.filter(s => String(s.entrepriseId) === String(entrepriseId));
  }, [showEntrepriseFilter, filterEntreprise, currentUser, sucursales]);

  const load = useCallback(async () => {
    try {
      const params = { page: 0, size: 200 };
      if (showEntrepriseFilter && filterEntreprise) params.entrepriseId = filterEntreprise;
      if (filterSuc && filterSuc !== '__siege__') params.sucursalId = filterSuc;
      const res = await evenementApi.getAll(params);
      let events = res.data?.data || res.data;
      if (!Array.isArray(events)) events = events?.content || [];
      let filtered = events;
      // Le backend scope déjà la liste par entreprise. On ne filtre côté client que
      // pour les rôles non gestionnaires, et de façon permissive : `visibilite`
      // n'est pas exposé par l'API (champ absent) → ne doit pas masquer l'événement.
      const seesAll = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN';
      if (!seesAll && currentUserId) {
        filtered = events.filter(ev => {
          if (ev.visibilite !== 'PRIVE') return true;
          const evCreatorId = getCreatorId(ev);
          if (evCreatorId && String(evCreatorId) === String(currentUserId)) return true;
          if (ev.participants?.some(p => String(p.id) === String(currentUserId))) return true;
          return false;
        });
      }
      const sorted = [...filtered].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));
      setData(sorted);
    } catch (err) {
      toast.error('Erreur de chargement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentUserRole, currentUserId, showEntrepriseFilter, filterEntreprise, filterSuc]);

  useDeferredTask(load, JSON.stringify([currentUserRole, currentUserId, showEntrepriseFilter, filterEntreprise, filterSuc]));

  useEffect(() => {
    const canListEmployees = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LEAD'].includes(currentUserRole);
    const employesRequest = currentUserRole === 'SECRETAIRE'
      ? secretariatApi.employes()
      : canListEmployees ? employerApi.getAll({ size: 200 }) : Promise.resolve({ data: [] });
    const canListDepartments = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'LEAD'].includes(currentUserRole);
    const departementsRequest = canListDepartments
      ? departementApi?.getAll?.({ size: 200 }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] });
    Promise.all([projetApi.getAll({ size: 200 }), employesRequest, departementsRequest]).then(([p, e, d]) => {
      const pd = p.data?.data || p.data; setProjets(Array.isArray(pd) ? pd : pd?.content || []);
      const ed = e.data?.data || e.data; setEmployes(Array.isArray(ed) ? ed : ed?.content || []);
      const dd = d.data?.data || d.data; setDepartements(Array.isArray(dd) ? dd : dd?.content || []);
    }).catch(() => {});
  }, [currentUserRole]);

  const filtered = useMemo(() => {
    let result = data;
    if (search) result = result.filter(ev => ev.titre?.toLowerCase().includes(search.toLowerCase()) || ev.lieu?.toLowerCase().includes(search.toLowerCase()));
    if (filterType) result = result.filter(ev => ev.type === filterType);
    if (filterVis) result = result.filter(ev => ev.visibilite === filterVis);
    if (filterProjet) result = result.filter(ev => String(ev.projet?.id) === filterProjet);
    if (filterEmp) result = result.filter(ev => ev.participants?.some(p => String(p.id) === filterEmp));
    if (filterSuc) result = result.filter(ev => sucursalMatch(ev, filterSuc));
    return result;
  }, [data, search, filterType, filterVis, filterProjet, filterEmp, filterSuc, sucursalMatch]);

  const grouped = useMemo(() => {
    const acc = {};
    filtered.forEach(ev => { const key = ev.dateDebut || 'Sans date'; if (!acc[key]) acc[key] = []; acc[key].push(ev); });
    return acc;
  }, [filtered]);
  const sortedKeys = useMemo(() => Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)), [grouped]);

  const openCreate = useCallback((day = null) => { setEditItem(null); setForm({ ...EMPTY_FORM, dateDebut: day ? format(day, 'yyyy-MM-dd') : '' }); setModalOpen(true); }, []);
  const openEdit = useCallback((item) => { setEditItem(item); setForm({ titre: item.titre || '', description: item.description || '', type: item.type || 'REUNION', sousType: item.sousType || '', dateDebut: item.dateDebut || '', heureDebut: item.heureDebut || '', dateFin: item.dateFin || '', heureFin: item.heureFin || '', lieu: item.lieu || '', couleur: item.couleur || '#6366F1', visibilite: item.visibilite || 'PUBLIC', rappelActif: item.rappelActif || false, minutesRappel: String(item.minutesRappel || '30'), jourEntier: item.jourEntier || false, participantsIds: toParticipantIds(item.participants || []), projetId: toStrId(item.projet?.id), sucursalId: item.sucursalId ? String(item.sucursalId) : '', selectionMode: 'users' }); setModalOpen(true); }, []);
  const setFormField = (key) => (value) => { setForm(prev => ({ ...prev, [key]: value })); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) { toast.error('Le titre est obligatoire'); return; }
    setSaving(true);
    try {
      const payload = { ...form, projetId: form.projetId ? Number(form.projetId) : null, sucursalId: form.sucursalId ? Number(form.sucursalId) : null, participantsIds: form.participantsIds.map(Number).filter(Boolean), minutesRappel: Number(form.minutesRappel) };
      if (editItem) {
        await evenementApi.update(editItem.id, payload);
        notifyEvent({ event: { id: editItem.id, titre: form.titre }, action: 'modified', currentUser, silent: true });
        form.participantsIds.forEach(participantId => { notifyEvent({ event: { id: editItem.id, titre: form.titre }, action: 'shared', targetUserId: participantId, currentUser, silent: true }); });
        toast.success(`Evenement modifie — ${form.participantsIds.length} participant(s) notifie(s)`);
      } else {
        const response = await evenementApi.create(payload);
        notifyEvent({ event: { id: response.data?.id, titre: form.titre }, action: 'created', currentUser, silent: true });
        form.participantsIds.forEach(participantId => { notifyEvent({ event: { id: response.data?.id, titre: form.titre }, action: 'shared', targetUserId: participantId, currentUser, silent: true }); });
        toast.success(`Evenement cree — ${form.participantsIds.length} participant(s) notifie(s)`);
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await evenementApi.delete(deleteItem.id);
      notifyEvent({ event: { titre: deleteItem.titre }, action: 'deleted', currentUser, silent: true });
      const participants = deleteItem.participants || [];
      participants.forEach(p => { if (String(p.id) !== String(currentUser?.id)) notifyEvent({ event: { titre: deleteItem.titre }, action: 'deleted', targetUserId: p.id, currentUser, silent: true }); });
      toast.success(`Evenement supprime — ${participants.length} participant(s) notifie(s)`);
      setDeleteItem(null);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Erreur lors de la suppression'); } finally { setDeleting(false); }
  };

  const activeFiltersCount = [filterVis, filterProjet, filterDept, filterEmp, filterSuc, filterEntreprise].filter(Boolean).length;
  const resetFilters = () => { setFilterVis(''); setFilterProjet(''); setFilterDept(''); setFilterEmp(''); setFilterSuc(''); setFilterEntreprise(''); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div><h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>Evenements</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, marginBottom: 0 }}>{data.length} evenement{data.length !== 1 ? 's' : ''}</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {[{ key: 'timeline', label: 'Liste', icon: List }, { key: 'calendar', label: 'Calendrier', icon: LayoutGrid }].map(({ key, label, icon }) => (<button key={key} onClick={() => setView(key)} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === key ? 'var(--color-primary)' : 'var(--bg-surface)', color: view === key ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>{React.createElement(icon, { size: 13 })}{label}</button>))}
          </div>
          <Button onClick={() => openCreate(null)}><SquarePlus size={16} /> Nouvel evenement</Button>
        </div>
      </div>

      <StatsGrid>
        {/* Tous */}
        <StatCard
          title="Tous"
          value={data.length}
          icon={<Calendar size={22} />}
          color="var(--color-primary)"
          onClick={() => setFilterType('')}
          active={!filterType}
        />
        {TYPES.map(t => {
          const m = TYPE_META[t];
          const Ic = m.icon;
          const count = data.filter(ev => ev.type === t).length;
          return (
            <StatCard
              key={t}
              title={m.label}
              value={count}
              icon={<Ic size={22} />}
              color={m.color}
              onClick={() => setFilterType(filterType === t ? '' : t)}
              active={filterType === t}
            />
          );
        })}
      </StatsGrid>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Titre, lieu..." style={{ flex: '1 1 220px', maxWidth: 340 }} />
        <button onClick={() => setShowFilters(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: activeFiltersCount > 0 ? 'var(--color-primary-light)' : 'var(--bg-surface)', color: activeFiltersCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><Filter size={13} />Filtres{activeFiltersCount > 0 && <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{activeFiltersCount}</span>}</button>
        {activeFiltersCount > 0 && (<button onClick={resetFilters} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>Reinitialiser</button>)}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} resultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {showFilters && (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, padding: '14px 16px', marginBottom: 16, background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-muted)' }}>
        {showEntrepriseFilter && <Select label="Entreprise" value={filterEntreprise} onChange={e => { setFilterEntreprise(e.target.value); setFilterSuc(''); }} options={[{ value: '', label: 'Toutes les entreprises' }, ...entreprises.map(e => ({ value: String(e.id), label: e.name }))]} />}
        <Select label="Visibilite" value={filterVis} onChange={e => setFilterVis(e.target.value)} options={[{ value: '', label: 'Toutes' }, { value: 'PUBLIC', label: 'Public' }, { value: 'PRIVE', label: 'Prive' }]} />
        <Select label="Projet" value={filterProjet} onChange={e => setFilterProjet(e.target.value)} options={[{ value: '', label: 'Tous' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} />
        <Select label="Participant" value={filterEmp} onChange={e => setFilterEmp(e.target.value)} options={[{ value: '', label: 'Tous' }, ...employes.map(e => ({ value: String(e.id), label: e.name }))]} />
        {showSucursal && (showEntrepriseFilter ? (filterEntreprise ? <Select label="Succursale" value={filterSuc} onChange={e => setFilterSuc(e.target.value)} options={[{ value: '', label: 'Toutes les succursales' }, { value: '__siege__', label: 'Siège (non rattaché)' }, ...branchesDisponibles.map(s => ({ value: String(s.id), label: s.name }))]} /> : <Select label="Succursale" value="" disabled options={[{ value: '', label: 'Choisir une entreprise d’abord' }]} />) : <Select label="Succursale" value={filterSuc} onChange={e => setFilterSuc(e.target.value)} options={sucursalFiltreOptions} />)}
      </div>)}

      {view === 'calendar' && (<Card style={{ padding: 20 }}><CalendarView events={filtered} onDayClick={(day, evs) => setDayModal({ open: true, day, events: evs })} currentMonth={currentMonth} onMonthChange={setCurrentMonth} currentUserId={currentUserId} currentUserRole={currentUserRole} onEdit={openEdit} onDelete={setDeleteItem} /></Card>)}

      {view === 'timeline' && (loading ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2, 3, 4].map(i => (<div key={i} style={{ height: 100, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />))}</div>) : sortedKeys.length === 0 ? (<Card style={{ textAlign: 'center', padding: '64px 24px' }}><Calendar size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 14px', display: 'block' }} /><p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun evenement trouve</p><Button style={{ marginTop: 16 }} onClick={() => openCreate(null)}><SquarePlus size={14} /> Creer un evenement</Button></Card>) : sortedKeys.map(dateKey => { const d = safeParseISO(dateKey); let dateLabel = dateKey === 'Sans date' ? 'Sans date' : (d ? format(d, "EEEE d MMMM yyyy", { locale: fr }) : dateKey); if (d && isToday(d)) dateLabel = "Aujourd'hui — " + dateLabel; return (<div key={dateKey} style={{ marginBottom: 24 }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: d && isToday(d) ? '#0EA5E9' : d && isFuture(d) ? 'var(--color-primary)' : 'var(--border-default)', flexShrink: 0 }} /><p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{dateLabel}</p><div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} /><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{grouped[dateKey].length}</span></div><div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>{grouped[dateKey].map(ev => (<EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={setDeleteItem} currentUserId={currentUserId} currentUserRole={currentUserRole} />))}</div></div>); }))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Modifier l'evenement" : "Nouvel evenement"} width={750} footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Creer'}</Button></div>}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormRow><Input label="Titre *" value={form.titre} onChange={e => setFormField('titre')(e.target.value)} required /><Select label="Type" value={form.type} onChange={e => setFormField('type')(e.target.value)} options={TYPES.map(t => ({ value: t, label: TYPE_META[t].label }))} /></FormRow>
            <Textarea label="Description" value={form.description} onChange={e => setFormField('description')(e.target.value)} rows={3} />
            <FormRow><Input label="Date de debut" type="date" value={form.dateDebut} onChange={e => setFormField('dateDebut')(e.target.value)} /><Input label="Heure de debut" type="time" value={form.heureDebut} onChange={e => setFormField('heureDebut')(e.target.value)} disabled={form.jourEntier} /></FormRow>
            <FormRow><Input label="Date de fin" type="date" value={form.dateFin} onChange={e => setFormField('dateFin')(e.target.value)} /><Input label="Heure de fin" type="time" value={form.heureFin} onChange={e => setFormField('heureFin')(e.target.value)} disabled={form.jourEntier} /></FormRow>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}><input type="checkbox" checked={form.jourEntier} onChange={e => setFormField('jourEntier')(e.target.checked)} /><span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Journee entiere</span></label>
            <FormRow><Input label="Lieu" value={form.lieu} onChange={e => setFormField('lieu')(e.target.value)} /><div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{Object.values(TYPE_META).map(m => (<button key={m.color} type="button" onClick={() => setFormField('couleur')(m.color)} title={m.label} style={{ width: 22, height: 22, borderRadius: '50%', background: m.color, border: form.couleur === m.color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />))}<input type="color" value={form.couleur} onChange={e => setFormField('couleur')(e.target.value)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} /></div></div></FormRow>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Visibilite</label><div style={{ display: 'flex', gap: 10 }}>{VISIBILITY_OPTIONS.map(({ value, label, Icon, hint }) => (<div key={value} onClick={() => setFormField('visibilite')(value)} style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${form.visibilite === value ? 'var(--color-primary)' : 'var(--border-default)'}`, background: form.visibilite === value ? 'var(--color-primary-light)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>{React.createElement(Icon, { size: 15, style: { color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-muted)', flexShrink: 0 } })}<div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-primary)' }}>{label}</p><p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{hint}</p></div>{form.visibilite === value && <Check size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}</div>))}</div></div>
            <FormRow><Select label="Projet lie" value={form.projetId} onChange={e => setFormField('projetId')(e.target.value)} options={[{ value: '', label: 'Aucun' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} /><SucursaleField showSucursal={showSucursal} value={form.sucursalId} onChange={e => setFormField('sucursalId')(e.target.value)} options={sucursalFormOptions} compteAncre={compteAncre} sucursalUtilisateurNom={sucursalUtilisateurNom} /></FormRow>
            <ParticipantPicker employes={employes} departements={departements} selected={form.participantsIds} onChange={ids => setFormField('participantsIds')(ids)} selectionMode={form.selectionMode} onModeChange={(mode) => setFormField('selectionMode')(mode)} />
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)', border: '1px solid var(--border-muted)' }}><label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: form.rappelActif ? 10 : 0 }}><input type="checkbox" checked={form.rappelActif} onChange={e => setFormField('rappelActif')(e.target.checked)} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><Bell size={12} /> Activer un rappel</span></label>{form.rappelActif && (<Select label="Delai" value={form.minutesRappel} onChange={e => setFormField('minutesRappel')(e.target.value)} options={RAPPEL_OPTIONS} />)}</div>
          </div>
        </form>
      </Modal>

      <DayModal day={dayModal.day} events={dayModal.events} open={dayModal.open} onClose={() => setDayModal({ open: false, day: null, events: [] })} onEdit={openEdit} onDelete={setDeleteItem} onNew={openCreate} currentUserId={currentUserId} currentUserRole={currentUserRole} />
      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={deleting} title="Supprimer l'evenement" message={`Supprimer "${deleteItem?.titre}" ? Cette action est irreversible.`} confirmLabel="Supprimer" />
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }`}</style>
    </div>
  );
}
