// Evenements.jsx - Version finale avec droits corrects (créateur + SUPER_ADMIN uniquement)
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Calendar, Clock, MapPin, Users, Bell,
  Globe, Lock, ChevronLeft, ChevronRight, Cake, Plane,
  Coffee, Tag, Filter, List, LayoutGrid, X, Check,
  Building2, FolderOpen, User, UserCircle,
} from 'lucide-react';
import { evenementApi, projetApi, employerApi, departementApi } from '../api';
import {
  Card, Button, Modal, Input, Select, Confirm,
  SearchInput, Avatar, FormRow, Textarea,
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

const TYPES = ['REUNION', 'FORMATION', 'CONFERENCE', 'CONGE', 'MISSION', 'AUTRE'];
const TYPE_META = {
  REUNION:    { label: 'Reunion',    color: '#6366F1', icon: Users },
  FORMATION:  { label: 'Formation',  color: '#10B981', icon: Coffee },
  CONFERENCE: { label: 'Conference', color: '#0EA5E9', icon: Globe },
  CONGE:      { label: 'Conge',      color: '#F59E0B', icon: Calendar },
  MISSION:    { label: 'Mission',    color: '#8B5CF6', icon: Plane },
  AUTRE:      { label: 'Autre',      color: '#94A3B8', icon: Tag },
};
const CONGE_SUBTYPES = ['Maladie', 'Mariage', 'Indisponibilite', 'Conge annuel', 'Conge sans solde', 'Autre'];
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
  selectedDepartements: [],
  selectedProjets: [],
  selectionMode: 'users',
};

function safeParseISO(str) {
  if (!str) return null;
  try { const d = parseISO(str); return isValid(d) ? d : null; } catch { return null; }
}

function fmtDate(str) { const d = safeParseISO(str); return d ? format(d, 'd MMMM yyyy', { locale: fr }) : (str || ''); }
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

// Composant MultiSelect
function MultiSelect({ label, items, selected, onChange, placeholder, getItemLabel, getItemId, icon: Icon }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedSet = useMemo(() => new Set(selected.map(String)), [selected]);
  const filtered = items.filter(item => 
    !selectedSet.has(String(getItemId(item))) &&
    getItemLabel(item).toLowerCase().includes(search.toLowerCase())
  );

  const add = (item) => {
    onChange([...selected, String(getItemId(item))]);
    setSearch('');
  };
  const remove = (id) => {
    onChange(selected.filter(s => s !== String(id)));
  };

  const selectedItems = items.filter(item => selectedSet.has(String(getItemId(item))));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>}
      
      {selectedItems.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {selectedItems.map(item => (
            <span key={getItemId(item)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px 3px 4px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)40',
              fontSize: 11, fontWeight: 600, color: 'var(--color-primary)'
            }}>
              {Icon && <Icon size={12} />}
              {getItemLabel(item)}
              <button type="button" onClick={() => remove(getItemId(item))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary)', display: 'flex' }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '9px 12px',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)', fontSize: 14,
            background: 'var(--bg-surface)', color: 'var(--text-primary)',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        
        {open && search && filtered.length > 0 && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)',
            zIndex: 100, border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)',
            maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-md)'
          }}>
            {filtered.map(item => (
              <div
                key={getItemId(item)}
                onClick={() => add(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-muted)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {Icon && <Icon size={14} style={{ color: 'var(--text-muted)' }} />}
                <span style={{ fontSize: 13 }}>{getItemLabel(item)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant ParticipantPicker
function ParticipantPicker({ employes, departements, projets, selected, onChange, selectionMode, onModeChange }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef();
  const selectedStrs = useMemo(() => selected.map(String), [selected]);
  
  const getEmployesByDepartement = (deptId) => {
    return employes.filter(e => String(e.departement?.id) === String(deptId));
  };
  
  const getEmployesByProjet = (projetId) => {
    return employes.filter(e => e.projets?.some(p => String(p.id) === String(projetId)));
  };
  
  const addDepartement = (deptId) => {
    const employesToAdd = getEmployesByDepartement(deptId);
    const newIds = [...selectedStrs];
    employesToAdd.forEach(emp => {
      const empId = String(emp.id);
      if (!newIds.includes(empId)) {
        newIds.push(empId);
      }
    });
    onChange(newIds);
    toast.success(`${employesToAdd.length} employe(s) ajoute(s) depuis le departement`);
  };
  
  const addProjet = (projetId) => {
    const employesToAdd = getEmployesByProjet(projetId);
    const newIds = [...selectedStrs];
    employesToAdd.forEach(emp => {
      const empId = String(emp.id);
      if (!newIds.includes(empId)) {
        newIds.push(empId);
      }
    });
    onChange(newIds);
    toast.success(`${employesToAdd.length} employe(s) ajoute(s) depuis le projet`);
  };
  
  const filteredEmployes = employes.filter(e =>
    (e.name?.toLowerCase().includes(search.toLowerCase()) || 
     e.email?.toLowerCase().includes(search.toLowerCase())) &&
    !selectedStrs.includes(String(e.id))
  );
  
  const selectedEmps = employes.filter(e => selectedStrs.includes(String(e.id)));
  
  const remove = (id) => onChange(selectedStrs.filter(s => s !== String(id)));
  const add = (emp) => { 
    onChange([...selectedStrs, String(emp.id)]); 
    setSearch(''); 
    inputRef.current?.focus();
  };
  
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Participants</label>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => onModeChange('users')} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, background: selectionMode === 'users' ? 'var(--color-primary)' : 'var(--bg-surface)', color: selectionMode === 'users' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>
          <Users size={12} style={{ display: 'inline', marginRight: 5 }} /> Selection individuelle
        </button>
        <button type="button" onClick={() => onModeChange('departements')} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, background: selectionMode === 'departements' ? 'var(--color-primary)' : 'var(--bg-surface)', color: selectionMode === 'departements' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>
          <Building2 size={12} style={{ display: 'inline', marginRight: 5 }} /> Par departement
        </button>
        <button type="button" onClick={() => onModeChange('projets')} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, background: selectionMode === 'projets' ? 'var(--color-primary)' : 'var(--bg-surface)', color: selectionMode === 'projets' ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>
          <FolderOpen size={12} style={{ display: 'inline', marginRight: 5 }} /> Par projet
        </button>
      </div>
      
      {selectionMode === 'departements' && (
        <div style={{ marginBottom: 12 }}>
          <MultiSelect items={departements} selected={[]} onChange={(deptIds) => { deptIds.forEach(id => addDepartement(id)); }} placeholder="Selectionner un departement..." getItemLabel={d => d.name} getItemId={d => d.id} icon={Building2} />
        </div>
      )}
      
      {selectionMode === 'projets' && (
        <div style={{ marginBottom: 12 }}>
          <MultiSelect items={projets} selected={[]} onChange={(projetIds) => { projetIds.forEach(id => addProjet(id)); }} placeholder="Selectionner un projet..." getItemLabel={p => p.nom} getItemId={p => p.id} icon={FolderOpen} />
        </div>
      )}
      
      {selectedEmps.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {selectedEmps.map(emp => (
            <span key={emp.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)40', fontSize: 11, fontWeight: 600, color: 'var(--color-primary)' }}>
              <Avatar name={emp.name} size={16} />{emp.name}
              <button type="button" onClick={() => remove(emp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary)' }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      
      {selectionMode === 'users' && (
        <div style={{ position: 'relative' }}>
          <input ref={inputRef} placeholder="Ajouter un participant..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: 14, background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
          {search && filteredEmployes.length > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 100, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
              {filteredEmployes.map(emp => (
                <div key={emp.id} onClick={() => add(emp)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-muted)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Avatar name={emp.name} size={24} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{emp.name}</p>
                    {emp.email && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{emp.email}</p>}
                  </div>
                  {emp.poste && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{typeof emp.poste === 'object' ? emp.poste.name : emp.poste}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Composant EventCard - FINAL : seul le créateur et SUPER_ADMIN voient les boutons
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
  
  // 🔑 RÈGLE : seul le créateur OU le SUPER_ADMIN peuvent modifier/supprimer
        // const canModify = true ;
        const canModify = isCreator || currentUserRole === 'SUPER_ADMIN'



  
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', border: '1px solid var(--border-default)', borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'box-shadow var(--transition-fast)' }} onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <IconT size={16} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
          <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{ev.titre}</h4>
          {ev.sousType && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontWeight: 600 }}>{ev.sousType}</span>}
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${color}18`, color, fontWeight: 700 }}>{meta.label}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${status.color}14`, color: status.color, fontWeight: 600 }}>{status.label}</span>
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
      {/* BOUTONS : uniquement pour le créateur ou SUPER_ADMIN */}
      {canModify && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(ev); }} title="Modifier"><Pencil size={13} /></Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(ev); }} title="Supprimer" style={{ color: 'var(--color-danger)' }}><Trash2 size={13} /></Button>
        </div>
      )}
    </div>
  );
}

// Composant CalendarView
function CalendarView({ events, onDayClick, currentMonth, onMonthChange, currentUserId, currentUserRole, onEdit, onDelete }) {
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
    <Modal open={open} onClose={onClose} title={title.charAt(0).toUpperCase() + title.slice(1)} width={580} footer={<div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button onClick={() => { onNew(day); onClose(); }}><Plus size={14} /> Ajouter un evenement</Button></div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.length === 0 ? (<div style={{ textAlign: 'center', padding: '40px 0' }}><Calendar size={36} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} /><p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Aucun evenement ce jour</p></div>) : (events.map(ev => (<EventCard key={ev.id} ev={ev} onEdit={onEdit} onDelete={onDelete} currentUserId={currentUserId} currentUserRole={currentUserRole} />)))}
      </div>
    </Modal>
  );
}

// Composant principal Evenements
export default function Evenements({ currentUser, isAdmin = false }) {
  const { notifyEvent } = useNotifications();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterVis, setFilterVis] = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
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
  const currentUserRole = currentUser?.roleName || currentUser?.role?.name;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await evenementApi.getAll({ page: 0, size: 200 });
      let events = res.data?.data || res.data;
      if (!Array.isArray(events)) events = events?.content || [];
      let filtered = events;
      if (currentUserRole !== 'SUPER_ADMIN' && currentUserId) {
        filtered = events.filter(ev => {
          if (ev.visibilite === 'PUBLIC') return true;
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
  }, [currentUserRole, currentUserId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([projetApi.getAll({ size: 200 }), employerApi.getAll({ size: 200 }), departementApi?.getAll?.({ size: 200 }).catch(() => ({ data: [] }))]).then(([p, e, d]) => {
      const pd = p.data?.data || p.data; setProjets(Array.isArray(pd) ? pd : pd?.content || []);
      const ed = e.data?.data || e.data; setEmployes(Array.isArray(ed) ? ed : ed?.content || []);
      const dd = d.data?.data || d.data; setDepartements(Array.isArray(dd) ? dd : dd?.content || []);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = data;
    if (search) result = result.filter(ev => ev.titre?.toLowerCase().includes(search.toLowerCase()) || ev.lieu?.toLowerCase().includes(search.toLowerCase()));
    if (filterType) result = result.filter(ev => ev.type === filterType);
    if (filterVis) result = result.filter(ev => ev.visibilite === filterVis);
    if (filterProjet) result = result.filter(ev => String(ev.projet?.id) === filterProjet);
    if (filterEmp) result = result.filter(ev => ev.participants?.some(p => String(p.id) === filterEmp));
    return result;
  }, [data, search, filterType, filterVis, filterProjet, filterEmp]);

  const grouped = useMemo(() => {
    const acc = {};
    filtered.forEach(ev => { const key = ev.dateDebut || 'Sans date'; if (!acc[key]) acc[key] = []; acc[key].push(ev); });
    return acc;
  }, [filtered]);
  const sortedKeys = useMemo(() => Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)), [grouped]);

  const openCreate = useCallback((day = null) => { setEditItem(null); setForm({ ...EMPTY_FORM, dateDebut: day ? format(day, 'yyyy-MM-dd') : '' }); setModalOpen(true); }, []);
  const openEdit = useCallback((item) => { setEditItem(item); setForm({ titre: item.titre || '', description: item.description || '', type: item.type || 'REUNION', sousType: item.sousType || '', dateDebut: item.dateDebut || '', heureDebut: item.heureDebut || '', dateFin: item.dateFin || '', heureFin: item.heureFin || '', lieu: item.lieu || '', couleur: item.couleur || '#6366F1', visibilite: item.visibilite || 'PUBLIC', rappelActif: item.rappelActif || false, minutesRappel: String(item.minutesRappel || '30'), jourEntier: item.jourEntier || false, participantsIds: toParticipantIds(item.participants || []), projetId: toStrId(item.projet?.id), departementId: toStrId(item.departementId), selectedDepartements: [], selectedProjets: [], selectionMode: 'users' }); setModalOpen(true); }, []);
  const setFormField = (key) => (value) => { setForm(prev => ({ ...prev, [key]: value })); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) { toast.error('Le titre est obligatoire'); return; }
    setSaving(true);
    try {
      const payload = { ...form, projetId: form.projetId ? Number(form.projetId) : null, participantsIds: form.participantsIds.map(Number).filter(Boolean), minutesRappel: Number(form.minutesRappel) };
      if (editItem) {
        await evenementApi.update(editItem.id, payload);
        notifyEvent({ event: { id: editItem.id, titre: form.titre }, action: 'modified', currentUser });
        toast.success('Evenement modifie');
      } else {
        const response = await evenementApi.create(payload);
        notifyEvent({ event: { id: response.data?.id, titre: form.titre }, action: 'created', currentUser });
        form.participantsIds.forEach(participantId => { notifyEvent({ event: { id: response.data?.id, titre: form.titre }, action: 'shared', targetUserId: participantId, currentUser }); });
        toast.success('Evenement cree');
      }
      setModalOpen(false);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await evenementApi.delete(deleteItem.id);
      notifyEvent({ event: { titre: deleteItem.titre }, action: 'deleted', currentUser });
      toast.success('Evenement supprime');
      setDeleteItem(null);
      load();
    } catch (err) { toast.error('Erreur lors de la suppression'); } finally { setDeleting(false); }
  };

  const activeFiltersCount = [filterVis, filterProjet, filterDept, filterEmp].filter(Boolean).length;
  const resetFilters = () => { setFilterVis(''); setFilterProjet(''); setFilterDept(''); setFilterEmp(''); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div><h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>Evenements</h1><p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, marginBottom: 0 }}>{data.length} evenement{data.length !== 1 ? 's' : ''}</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {[{ key: 'timeline', label: 'Liste', Icon: List }, { key: 'calendar', label: 'Calendrier', Icon: LayoutGrid }].map(({ key, label, Icon }) => (<button key={key} onClick={() => setView(key)} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === key ? 'var(--color-primary)' : 'var(--bg-surface)', color: view === key ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon size={13} />{label}</button>))}
          </div>
          <Button onClick={() => openCreate(null)}><Plus size={16} /> Nouvel evenement</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilterType('')} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)', background: !filterType ? 'var(--color-primary)' : 'var(--bg-surface)', color: !filterType ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Tous ({data.length})</button>
        {TYPES.map(t => { const m = TYPE_META[t]; const Ic = m.icon; return (<button key={t} onClick={() => setFilterType(filterType === t ? '' : t)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: `1px solid ${m.color}40`, background: filterType === t ? m.color : 'var(--bg-surface)', color: filterType === t ? '#fff' : m.color, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Ic size={11} />{m.label} ({data.filter(ev => ev.type === t).length})</button>); })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Titre, lieu..." style={{ flex: '1 1 220px', maxWidth: 340 }} />
        <button onClick={() => setShowFilters(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: activeFiltersCount > 0 ? 'var(--color-primary-light)' : 'var(--bg-surface)', color: activeFiltersCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><Filter size={13} />Filtres{activeFiltersCount > 0 && <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{activeFiltersCount}</span>}</button>
        {activeFiltersCount > 0 && (<button onClick={resetFilters} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>Reinitialiser</button>)}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} resultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {showFilters && (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, padding: '14px 16px', marginBottom: 16, background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-muted)' }}><Select label="Visibilite" value={filterVis} onChange={e => setFilterVis(e.target.value)} options={[{ value: '', label: 'Toutes' }, { value: 'PUBLIC', label: 'Public' }, { value: 'PRIVE', label: 'Prive' }]} /><Select label="Projet" value={filterProjet} onChange={e => setFilterProjet(e.target.value)} options={[{ value: '', label: 'Tous' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} /><Select label="Participant" value={filterEmp} onChange={e => setFilterEmp(e.target.value)} options={[{ value: '', label: 'Tous' }, ...employes.map(e => ({ value: String(e.id), label: e.name }))]} /></div>)}

      {view === 'calendar' && (<Card style={{ padding: 20 }}><CalendarView events={filtered} onDayClick={(day, evs) => setDayModal({ open: true, day, events: evs })} currentMonth={currentMonth} onMonthChange={setCurrentMonth} currentUserId={currentUserId} currentUserRole={currentUserRole} onEdit={openEdit} onDelete={setDeleteItem} /></Card>)}

      {view === 'timeline' && (loading ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2, 3, 4].map(i => (<div key={i} style={{ height: 100, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />))}</div>) : sortedKeys.length === 0 ? (<Card style={{ textAlign: 'center', padding: '64px 24px' }}><Calendar size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 14px', display: 'block' }} /><p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun evenement trouve</p><Button style={{ marginTop: 16 }} onClick={() => openCreate(null)}><Plus size={14} /> Creer un evenement</Button></Card>) : sortedKeys.map(dateKey => { const d = safeParseISO(dateKey); let dateLabel = dateKey === 'Sans date' ? 'Sans date' : (d ? format(d, "EEEE d MMMM yyyy", { locale: fr }) : dateKey); if (d && isToday(d)) dateLabel = "Aujourd'hui — " + dateLabel; return (<div key={dateKey} style={{ marginBottom: 24 }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: d && isToday(d) ? '#0EA5E9' : d && isFuture(d) ? 'var(--color-primary)' : 'var(--border-default)', flexShrink: 0 }} /><p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{dateLabel}</p><div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} /><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{grouped[dateKey].length}</span></div><div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>{grouped[dateKey].map(ev => (<EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={setDeleteItem} currentUserId={currentUserId} currentUserRole={currentUserRole} />))}</div></div>); }))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Modifier l'evenement" : "Nouvel evenement"} width={750} footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Creer'}</Button></div>}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormRow><Input label="Titre *" value={form.titre} onChange={e => setFormField('titre')(e.target.value)} required /><Select label="Type" value={form.type} onChange={e => setFormField('type')(e.target.value)} options={TYPES.map(t => ({ value: t, label: TYPE_META[t].label }))} /></FormRow>
            {form.type === 'CONGE' && (<Select label="Nature du conge" value={form.sousType} onChange={e => setFormField('sousType')(e.target.value)} options={[{ value: '', label: 'Selectionner...' }, ...CONGE_SUBTYPES.map(s => ({ value: s, label: s }))]} />)}
            <Textarea label="Description" value={form.description} onChange={e => setFormField('description')(e.target.value)} rows={3} />
            <FormRow><Input label="Date de debut" type="date" value={form.dateDebut} onChange={e => setFormField('dateDebut')(e.target.value)} /><Input label="Heure de debut" type="time" value={form.heureDebut} onChange={e => setFormField('heureDebut')(e.target.value)} disabled={form.jourEntier} /></FormRow>
            <FormRow><Input label="Date de fin" type="date" value={form.dateFin} onChange={e => setFormField('dateFin')(e.target.value)} /><Input label="Heure de fin" type="time" value={form.heureFin} onChange={e => setFormField('heureFin')(e.target.value)} disabled={form.jourEntier} /></FormRow>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}><input type="checkbox" checked={form.jourEntier} onChange={e => setFormField('jourEntier')(e.target.checked)} /><span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Journee entiere</span></label>
            <FormRow><Input label="Lieu" value={form.lieu} onChange={e => setFormField('lieu')(e.target.value)} /><div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Couleur</label><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{Object.values(TYPE_META).map(m => (<button key={m.color} type="button" onClick={() => setFormField('couleur')(m.color)} title={m.label} style={{ width: 22, height: 22, borderRadius: '50%', background: m.color, border: form.couleur === m.color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />))}<input type="color" value={form.couleur} onChange={e => setFormField('couleur')(e.target.value)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} /></div></div></FormRow>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Visibilite</label><div style={{ display: 'flex', gap: 10 }}>{VISIBILITY_OPTIONS.map(({ value, label, Icon, hint }) => (<div key={value} onClick={() => setFormField('visibilite')(value)} style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${form.visibilite === value ? 'var(--color-primary)' : 'var(--border-default)'}`, background: form.visibilite === value ? 'var(--color-primary-light)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 10 }}><Icon size={15} style={{ color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-muted)', flexShrink: 0 }} /><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-primary)' }}>{label}</p><p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{hint}</p></div>{form.visibilite === value && <Check size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}</div>))}</div></div>
            <FormRow><Select label="Projet lie" value={form.projetId} onChange={e => setFormField('projetId')(e.target.value)} options={[{ value: '', label: 'Aucun' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} /></FormRow>
            <ParticipantPicker employes={employes} departements={departements} projets={projets} selected={form.participantsIds} onChange={ids => setFormField('participantsIds')(ids)} selectionMode={form.selectionMode} onModeChange={(mode) => setFormField('selectionMode')(mode)} />
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