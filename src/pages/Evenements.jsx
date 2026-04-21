import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Calendar, Clock, MapPin, Users, Bell,
  Globe, Lock, ChevronLeft, ChevronRight, Cake, Plane,
  Coffee, Tag, Filter, List, LayoutGrid, X, Check,
  Building2, FolderOpen,
} from 'lucide-react';
import { evenementApi, projetApi, employerApi, departementApi } from '../api';
import {
  Card, Button, Modal, Input, Select, Confirm,
  SearchInput, Avatar, FormRow, Textarea,
} from '../components/ui';
import {
  format, parseISO, isFuture, isToday,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths,
  getDay, differenceInDays, isValid,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const TYPES = ['REUNION', 'FORMATION', 'CONFERENCE', 'CONGE', 'MISSION', 'AUTRE'];
const TYPE_META = {
  REUNION:    { label: 'Réunion',    color: '#6366F1', icon: Users },
  FORMATION:  { label: 'Formation',  color: '#10B981', icon: Coffee },
  CONFERENCE: { label: 'Conférence', color: '#0EA5E9', icon: Globe },
  CONGE:      { label: 'Congé',      color: '#F59E0B', icon: Calendar },
  MISSION:    { label: 'Mission',    color: '#8B5CF6', icon: Plane },
  AUTRE:      { label: 'Autre',      color: '#94A3B8', icon: Tag },
};
const CONGE_SUBTYPES = ['Maladie', 'Mariage', 'Indisponibilité', 'Congé annuel', 'Congé sans solde', 'Autre'];
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', Icon: Globe, hint: "Visible par toute l'équipe" },
  { value: 'PRIVE',  label: 'Privé',  Icon: Lock,  hint: 'Visible uniquement par vous' },
];
// IMPORTANT : values en STRING pour éviter le mismatch avec <select> natif
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
};

function safeParseISO(str) {
  if (!str) return null;
  try { const d = parseISO(str); return isValid(d) ? d : null; } catch { return null; }
}
function fmtDate(str) { const d = safeParseISO(str); return d ? format(d, 'd MMMM yyyy', { locale: fr }) : (str || ''); }
function fmtTime(h, hf) { if (h && hf) return `${h} → ${hf}`; return h || hf || null; }
function birthdayThisYear(dateStr) { const d = safeParseISO(dateStr); if (!d) return null; return new Date(new Date().getFullYear(), d.getMonth(), d.getDate()); }
function getStatus(ev) {
  const d = safeParseISO(ev.dateDebut);
  if (!d) return { label: '?', color: '#94A3B8' };
  if (isToday(d))  return { label: "Aujourd'hui", color: '#0EA5E9' };
  if (isFuture(d)) return { label: 'À venir',    color: '#6366F1' };
  return                  { label: 'Passé',      color: '#94A3B8' };
}
// Normalise un id venant du backend (Long, string, objet {id,...}) → string
function toStrId(val) {
  if (val == null) return '';
  if (typeof val === 'object') return String(val.id ?? '');
  return String(val);
}
// Normalise un tableau de participants → tableau de strings d'ids
function toParticipantIds(raw) {
  if (!raw) return [];
  return raw.map(p => (typeof p === 'object' ? String(p.id ?? '') : String(p))).filter(Boolean);
}

function NotifBell({ events }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const upcoming = useMemo(() => {
    const now = new Date();
    return events.filter(ev => { const d = safeParseISO(ev.dateDebut); if (!d) return false; return differenceInDays(d, now) >= 0 && differenceInDays(d, now) <= 7; })
      .sort((a, b) => (a.dateDebut || '').localeCompare(b.dateDebut || '')).slice(0, 12);
  }, [events]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title="Événements cette semaine"
        style={{ position: 'relative', width: 38, height: 38, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
        <Bell size={16} />
        {upcoming.length > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', border: '2px solid var(--bg-surface)' }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 99, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', width: 320, maxHeight: 400, overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>Cette semaine</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: upcoming.length > 0 ? '#F59E0B20' : 'var(--bg-muted)', color: upcoming.length > 0 ? '#F59E0B' : 'var(--text-muted)' }}>{upcoming.length}</span>
          </div>
          {upcoming.length === 0
            ? <p style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Aucun événement cette semaine</p>
            : upcoming.map(ev => { const meta = TYPE_META[ev.type] || TYPE_META.AUTRE; const color = ev.couleur || meta.color; return (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{ev.titre}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{fmtDate(ev.dateDebut)}{ev.heureDebut ? ` · ${ev.heureDebut}` : ''}</p>
                </div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: `${color}20`, color, fontWeight: 700, flexShrink: 0 }}>{meta.label}</span>
              </div>
            ); })}
        </div>
      )}
    </div>
  );
}

function CalendarView({ events, employes, onDayClick, currentMonth, onMonthChange }) {
  const start = startOfMonth(currentMonth), end = endOfMonth(currentMonth);
  const days  = eachDayOfInterval({ start, end });
  const startPad = getDay(start) === 0 ? 6 : getDay(start) - 1;
  const padded = [...Array(startPad).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);
  const bdayMarkers = useMemo(() => employes.flatMap(emp => {
    const res = [];
    if (emp.dateNaissance) { const d = birthdayThisYear(emp.dateNaissance); if (d) res.push({ date: d, label: `🎂 ${emp.name}`, color: '#F43F5E' }); }
    if (emp.dateRecrutement) { const d = birthdayThisYear(emp.dateRecrutement); const orig = safeParseISO(emp.dateRecrutement); const years = orig ? new Date().getFullYear() - orig.getFullYear() : 0; if (d && years > 0) res.push({ date: d, label: `🏅 ${emp.name} (${years} an${years > 1 ? 's' : ''})`, color: '#8B5CF6' }); }
    return res;
  }), [employes]);
  const WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ChevronLeft size={15} /></button>
        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>{format(currentMonth, 'MMMM yyyy', { locale: fr })}</p>
        <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ChevronRight size={15} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-muted)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-muted)' }}>
        {WEEK.map(w => <div key={w} style={{ background: 'var(--bg-muted)', padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{w}</div>)}
        {padded.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} style={{ background: 'var(--bg-muted)', minHeight: 88 }} />;
          const dayEvents = events.filter(ev => { const d = safeParseISO(ev.dateDebut); return d && isSameDay(d, day); });
          const dayBdays  = bdayMarkers.filter(m => isSameDay(m.date, day));
          const isCurrentDay = isToday(day);
          const total = dayEvents.length + dayBdays.length;
          return (
            <div key={day.toISOString()} onClick={() => onDayClick(day, dayEvents)}
              style={{ background: isCurrentDay ? 'var(--color-primary-light)' : 'var(--bg-surface)', minHeight: 88, padding: '6px', cursor: 'pointer', opacity: isSameMonth(day, currentMonth) ? 1 : 0.38, transition: 'background var(--transition-fast)' }}
              onMouseEnter={e => { if (!isCurrentDay) e.currentTarget.style.background = 'var(--bg-muted)'; }}
              onMouseLeave={e => { if (!isCurrentDay) e.currentTarget.style.background = 'var(--bg-surface)'; }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700, background: isCurrentDay ? 'var(--color-primary)' : 'transparent', color: isCurrentDay ? '#fff' : 'var(--text-primary)', marginBottom: 3 }}>{format(day, 'd')}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvents.slice(0, 2).map(ev => { const c = ev.couleur || (TYPE_META[ev.type] || TYPE_META.AUTRE).color; return <div key={ev.id} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: `${c}22`, color: c, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titre}</div>; })}
                {dayBdays.slice(0, 1).map((b, bi) => <div key={bi} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: `${b.color}18`, color: b.color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</div>)}
                {total > 3 && <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>+{total - 3} autre{total - 3 > 1 ? 's' : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ ev, onEdit, onDelete, isAdmin }) {
  const meta = TYPE_META[ev.type] || TYPE_META.AUTRE;
  const status = getStatus(ev);
  const IconT = meta.icon;
  const color = ev.couleur || meta.color;
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', border: '1px solid var(--border-default)', borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'box-shadow var(--transition-fast)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><IconT size={16} style={{ color }} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
          <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{ev.titre}</h4>
          {ev.sousType && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontWeight: 600 }}>{ev.sousType}</span>}
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${color}18`, color, fontWeight: 700 }}>{meta.label}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${status.color}14`, color: status.color, fontWeight: 600 }}>{status.label}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>{ev.visibilite === 'PRIVE' ? <><Lock size={9} /> Privé</> : <><Globe size={9} /> Public</>}</span>
        </div>
        {ev.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{ev.description}</p>}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {fmtTime(ev.heureDebut, ev.heureFin) && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />{fmtTime(ev.heureDebut, ev.heureFin)}</span>}
          {ev.lieu && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{ev.lieu}</span>}
          {ev.projetNom && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><FolderOpen size={11} />{ev.projetNom}</span>}
          {ev.departementNom && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={11} />{ev.departementNom}</span>}
          {ev.nombreParticipants > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={11} />{ev.nombreParticipants} participant{ev.nombreParticipants !== 1 ? 's' : ''}</span>}
          {ev.rappelActif && <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}><Bell size={11} />Rappel {ev.minutesRappel}min</span>}
        </div>
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => onEdit(ev)} title="Modifier"><Pencil size={13} /></Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(ev)} title="Supprimer" style={{ color: 'var(--color-danger)' }}><Trash2 size={13} /></Button>
        </div>
      )}
    </div>
  );
}

function BirthdaySection({ employes }) {
  const now = new Date();
  const upcoming = useMemo(() => employes.flatMap(emp => {
    const rows = [];
    if (emp.dateNaissance) { const d = birthdayThisYear(emp.dateNaissance); if (d) { const diff = differenceInDays(d, now); if (diff >= 0 && diff <= 30) rows.push({ emp, date: d, diff, type: 'birthday', label: '🎂 Anniversaire' }); } }
    if (emp.dateRecrutement) { const d = birthdayThisYear(emp.dateRecrutement); const orig = safeParseISO(emp.dateRecrutement); const years = orig ? now.getFullYear() - orig.getFullYear() : 0; if (d && years > 0) { const diff = differenceInDays(d, now); if (diff >= 0 && diff <= 30) rows.push({ emp, date: d, diff, type: 'anniversary', label: `🏅 ${years} an${years > 1 ? 's' : ''} d'embauche` }); } }
    return rows;
  }).sort((a, b) => a.diff - b.diff), [employes]);
  if (!upcoming.length) return null;
  return (
    <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid #F43F5E30' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>🎂</span>
        <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anniversaires à venir · 30 jours</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {upcoming.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', border: `1px solid ${item.type === 'birthday' ? '#F43F5E30' : '#8B5CF630'}` }}>
            <Avatar name={item.emp.name} size={26} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{item.emp.name}</p>
              <p style={{ fontSize: 11, color: item.type === 'birthday' ? '#F43F5E' : '#8B5CF6', margin: 0 }}>{item.label} — {item.diff === 0 ? "Aujourd'hui 🎉" : `dans ${item.diff} jour${item.diff > 1 ? 's' : ''}`}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParticipantPicker({ employes, selected, onChange }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef();
  // Normaliser selected en strings pour comparaison robuste
  const selectedStrs = useMemo(() => selected.map(String), [selected]);
  const filtered = employes.filter(e =>
    (e.name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())) &&
    !selectedStrs.includes(String(e.id))
  );
  const selectedEmps = employes.filter(e => selectedStrs.includes(String(e.id)));
  const remove = (id) => onChange(selectedStrs.filter(s => s !== String(id)));
  const add    = (emp) => { onChange([...selectedStrs, String(emp.id)]); setSearch(''); inputRef.current?.focus(); };
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Participants</label>
      {selectedEmps.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {selectedEmps.map(emp => (
            <span key={emp.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)40', fontSize: 11, fontWeight: 600, color: 'var(--color-primary)' }}>
              <Avatar name={emp.name} size={16} />{emp.name}
              <button type="button" onClick={() => remove(emp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary)', display: 'flex', lineHeight: 1 }}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <Input ref={inputRef} placeholder={`Ajouter un participant${selectedEmps.length > 0 ? ' supplémentaire' : ''}…`} value={search} onChange={e => setSearch(e.target.value)} />
        {search && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 100, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', maxHeight: 180, overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            {filtered.length === 0
              ? <p style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Aucun résultat</p>
              : filtered.map(emp => (
                <div key={emp.id} onClick={() => add(emp)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
    </div>
  );
}

function DayModal({ day, events, employes, open, onClose, onEdit, onDelete, onNew, isAdmin }) {
  if (!open || !day) return null;
  const bdayMarkers = employes.flatMap(emp => {
    const res = [];
    const bday = birthdayThisYear(emp.dateNaissance);
    if (bday && isSameDay(bday, day)) res.push({ emp, type: 'birthday', label: '🎂 Anniversaire' });
    const anniv = birthdayThisYear(emp.dateRecrutement);
    const orig = safeParseISO(emp.dateRecrutement);
    const years = orig ? day.getFullYear() - orig.getFullYear() : 0;
    if (anniv && isSameDay(anniv, day) && years > 0) res.push({ emp, type: 'anniversary', label: `🏅 ${years} an${years > 1 ? 's' : ''} d'embauche` });
    return res;
  });
  const title = format(day, "EEEE d MMMM yyyy", { locale: fr });
  return (
    <Modal open={open} onClose={onClose} title={title.charAt(0).toUpperCase() + title.slice(1)} width={580}
      footer={isAdmin && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button onClick={() => { onNew(day); onClose(); }}><Plus size={14} /> Ajouter un événement</Button></div>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bdayMarkers.length > 0 && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#F43F5E0D', border: '1px solid #F43F5E25' }}>
            {bdayMarkers.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <Avatar name={b.emp.name} size={24} />
                <p style={{ fontSize: 12, fontWeight: 600, color: '#F43F5E', margin: 0 }}>{b.emp.name} — {b.label}</p>
              </div>
            ))}
          </div>
        )}
        {events.length === 0 && bdayMarkers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Calendar size={36} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Aucun événement ce jour</p>
          </div>
        )}
        {events.map(ev => <EventCard key={ev.id} ev={ev} onEdit={e => { onEdit(e); onClose(); }} onDelete={onDelete} isAdmin={isAdmin} />)}
      </div>
    </Modal>
  );
}

function CongeStats({ data, employes }) {
  const stats = useMemo(() => {
    const acc = {};
    data.filter(ev => ev.type === 'CONGE').forEach(ev => {
      (ev.participantsIds || []).forEach(id => {
        const key = String(id);
        const debut = safeParseISO(ev.dateDebut);
        const fin   = ev.dateFin ? safeParseISO(ev.dateFin) : debut;
        if (debut && fin) acc[key] = (acc[key] || 0) + differenceInDays(fin, debut) + 1;
      });
    });
    return acc;
  }, [data]);
  const entries = Object.entries(stats).map(([id, days]) => ({ id, days, emp: employes.find(e => String(e.id) === id) })).filter(e => e.emp).sort((a, b) => b.days - a.days);
  if (!entries.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jours de congé par employé</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {entries.map(({ id, days, emp }) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid #F59E0B35' }}>
            <Avatar name={emp.name} size={20} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>{days}j</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Evenements({ isAdmin = true }) {
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterVis, setFilterVis]       = useState('');
  const [filterProjet, setFilterProjet] = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterEmp, setFilterEmp]       = useState('');
  const [view, setView]                 = useState('timeline');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalOpen, setModalOpen]       = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [deleteItem, setDeleteItem]     = useState(null);
  const [dayModal, setDayModal]         = useState({ open: false, day: null, events: [] });
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [projets, setProjets]           = useState([]);
  const [employes, setEmployes]         = useState([]);
  const [departements, setDepartements] = useState([]);
  const [showFilters, setShowFilters]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await evenementApi.getAll({ page: 0, size: 200 }); const d = res.data?.data || res.data; setData(Array.isArray(d) ? d : d?.content || []); }
    catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([projetApi.getAll({ size: 200 }), employerApi.getAll({ size: 200 }), departementApi?.getAll?.({ size: 200 }).catch(() => ({ data: [] })) || Promise.resolve({ data: [] })])
      .then(([p, e, d]) => {
        const pd = p.data?.data || p.data; setProjets(Array.isArray(pd) ? pd : pd?.content || []);
        const ed = e.data?.data || e.data; setEmployes(Array.isArray(ed) ? ed : ed?.content || []);
        const dd = d.data?.data || d.data; setDepartements(Array.isArray(dd) ? dd : dd?.content || []);
      }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
    const interval = setInterval(() => {
      const now = new Date();
      data.forEach(ev => {
        if (!ev.rappelActif || !ev.dateDebut || !ev.heureDebut) return;
        try { const evTime = new Date(`${ev.dateDebut}T${ev.heureDebut}`); const diff = Math.round((evTime - now) / 60000); if (diff === Number(ev.minutesRappel) && Notification.permission === 'granted') new Notification(`⏰ ${ev.titre}`, { body: `Dans ${diff} min${ev.lieu ? ` — ${ev.lieu}` : ''}` }); } catch {}
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [data]);

  const filtered = useMemo(() => data.filter(ev =>
    (!search      || ev.titre?.toLowerCase().includes(search.toLowerCase()) || ev.lieu?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType  || ev.type === filterType) &&
    (!filterVis   || ev.visibilite === filterVis) &&
    (!filterProjet || String(ev.projetId) === filterProjet) &&
    (!filterDept   || String(ev.departementId) === filterDept) &&
    (!filterEmp    || (ev.participantsIds || []).map(String).includes(filterEmp))
  ), [data, search, filterType, filterVis, filterProjet, filterDept, filterEmp]);

  const grouped = useMemo(() => { const acc = {}; filtered.forEach(ev => { const key = ev.dateDebut || 'Sans date'; if (!acc[key]) acc[key] = []; acc[key].push(ev); }); return acc; }, [filtered]);
  const sortedKeys = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const openCreate = useCallback((day = null) => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, dateDebut: day ? format(day, 'yyyy-MM-dd') : '' });
    setModalOpen(true);
  }, []);

  // PATCH PRINCIPAL : tout normalisé en string/primitive pour éviter "Objects are not valid as React child"
  const openEdit = useCallback((item) => {
    setEditItem(item);
    setForm({
      titre:          String(item.titre        || ''),
      description:    String(item.description  || ''),
      type:           String(item.type         || 'REUNION'),
      sousType:       String(item.sousType     || ''),
      dateDebut:      String(item.dateDebut    || ''),
      heureDebut:     String(item.heureDebut   || ''),
      dateFin:        String(item.dateFin      || ''),
      heureFin:       String(item.heureFin     || ''),
      lieu:           String(item.lieu         || ''),
      couleur:        String(item.couleur      || '#6366F1'),
      visibilite:     String(item.visibilite   || 'PUBLIC'),
      rappelActif:    Boolean(item.rappelActif),
      minutesRappel:  String(item.minutesRappel || '30'),
      jourEntier:     Boolean(item.jourEntier),
      participantsIds: toParticipantIds(item.participantsIds || item.participants),
      projetId:       toStrId(item.projetId),
      departementId:  toStrId(item.departementId),
    });
    setModalOpen(true);
  }, []);

  useEffect(() => { if (!editItem) setForm(f => ({ ...f, couleur: TYPE_META[f.type]?.color || '#6366F1' })); }, [form.type, editItem]);

  // set() sécurisé : extrait toujours une primitive string
  const set = k => e => { const val = (e && e.target !== undefined) ? e.target.value : e; setForm(f => ({ ...f, [k]: val })); };
  const setCheck = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) { toast.error('Le titre est obligatoire'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        projetId:        form.projetId        ? Number(form.projetId)        : null,
        departementId:   form.departementId   ? Number(form.departementId)   : null,
        minutesRappel:   Number(form.minutesRappel),
        participantsIds: form.participantsIds.map(Number).filter(Boolean),
      };
      if (editItem) await evenementApi.update(editItem.id, payload);
      else          await evenementApi.create(payload);
      toast.success(editItem ? 'Événement modifié' : 'Événement créé');
      setModalOpen(false); load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await evenementApi.delete(deleteItem.id); toast.success('Événement supprimé'); setDeleteItem(null); load(); }
    catch { toast.error('Erreur lors de la suppression'); }
    finally { setDeleting(false); }
  };

  const activeFiltersCount = [filterVis, filterProjet, filterDept, filterEmp].filter(Boolean).length;
  const resetFilters = () => { setFilterVis(''); setFilterProjet(''); setFilterDept(''); setFilterEmp(''); };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>Événements</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, marginBottom: 0 }}>{data.length} événement{data.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <NotifBell events={data} />
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {[{ key: 'timeline', label: 'Agenda', Icon: List }, { key: 'calendar', label: 'Calendrier', Icon: LayoutGrid }].map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setView(key)} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === key ? 'var(--color-primary)' : 'var(--bg-surface)', color: view === key ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
          {isAdmin && <Button onClick={() => openCreate(null)}><Plus size={16} /> Nouvel événement</Button>}
        </div>
      </div>

      <BirthdaySection employes={employes} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilterType('')} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)', background: !filterType ? 'var(--color-primary)' : 'var(--bg-surface)', color: !filterType ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Tous ({data.length})</button>
        {TYPES.map(t => { const m = TYPE_META[t]; const Ic = m.icon; return (
          <button key={t} onClick={() => setFilterType(filterType === t ? '' : t)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: `1px solid ${m.color}40`, background: filterType === t ? m.color : 'var(--bg-surface)', color: filterType === t ? '#fff' : m.color, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Ic size={11} />{m.label} ({data.filter(ev => ev.type === t).length})
          </button>
        ); })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Titre, lieu…" style={{ flex: '1 1 220px', maxWidth: 340 }} />
        <button onClick={() => setShowFilters(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: activeFiltersCount > 0 ? 'var(--color-primary-light)' : 'var(--bg-surface)', color: activeFiltersCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <Filter size={13} />Filtres{activeFiltersCount > 0 && <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{activeFiltersCount}</span>}
        </button>
        {activeFiltersCount > 0 && <button onClick={resetFilters} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>Réinitialiser</button>}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, padding: '14px 16px', marginBottom: 16, background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-muted)' }}>
          <Select label="Visibilité" value={filterVis} onChange={e => setFilterVis(e.target.value)} options={[{ value: '', label: 'Toutes' }, { value: 'PUBLIC', label: 'Public' }, { value: 'PRIVE', label: 'Privé' }]} />
          <Select label="Projet" value={filterProjet} onChange={e => setFilterProjet(e.target.value)} options={[{ value: '', label: 'Tous' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} />
          <Select label="Département" value={filterDept} onChange={e => setFilterDept(e.target.value)} options={[{ value: '', label: 'Tous' }, ...departements.map(d => ({ value: String(d.id), label: d.nom }))]} />
          <Select label="Participant" value={filterEmp} onChange={e => setFilterEmp(e.target.value)} options={[{ value: '', label: 'Tous' }, ...employes.map(e => ({ value: String(e.id), label: e.name }))]} />
        </div>
      )}

      {isAdmin && <CongeStats data={data} employes={employes} />}

      {view === 'calendar' && (
        <Card style={{ padding: 20 }}>
          <CalendarView events={filtered} employes={employes} currentMonth={currentMonth} onMonthChange={setCurrentMonth} onDayClick={(day, evs) => setDayModal({ open: true, day, events: evs })} />
        </Card>
      )}

      {view === 'timeline' && (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2,3,4].map(i => <div key={i} style={{ height: 80, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />)}</div>
        ) : sortedKeys.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '64px 24px' }}>
            <Calendar size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 14px', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun événement trouvé</p>
            {isAdmin && <Button style={{ marginTop: 16 }} onClick={() => openCreate(null)}><Plus size={14} /> Créer un événement</Button>}
          </Card>
        ) : sortedKeys.map(dateKey => {
          const d = safeParseISO(dateKey);
          let dateLabel = dateKey === 'Sans date' ? 'Sans date' : (d ? format(d, "EEEE d MMMM yyyy", { locale: fr }) : dateKey);
          if (d && isToday(d)) dateLabel = "Aujourd'hui — " + dateLabel;
          return (
            <div key={dateKey} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d && isToday(d) ? '#0EA5E9' : d && isFuture(d) ? 'var(--color-primary)' : 'var(--border-default)', flexShrink: 0 }} />
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{dateLabel}</p>
                <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{grouped[dateKey].length}</span>
              </div>
              <div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped[dateKey].map(ev => <EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={setDeleteItem} isAdmin={isAdmin} />)}
              </div>
            </div>
          );
        })
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Modifier l'événement" : "Nouvel événement"} width={700}
        footer={<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button></div>}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormRow>
              <Input label="Titre *" value={form.titre} onChange={set('titre')} required placeholder="Titre de l'événement" />
              <Select label="Type" value={form.type} onChange={set('type')} options={TYPES.map(t => ({ value: t, label: TYPE_META[t].label }))} />
            </FormRow>
            {form.type === 'CONGE' && <Select label="Nature du congé" value={form.sousType} onChange={set('sousType')} options={[{ value: '', label: 'Sélectionner…' }, ...CONGE_SUBTYPES.map(s => ({ value: s, label: s }))]} />}
            <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Description ou précisions…" rows={3} />
            <FormRow>
              <Input label="Date de début" type="date" value={form.dateDebut} onChange={set('dateDebut')} />
              <Input label="Heure de début" type="time" value={form.heureDebut} onChange={set('heureDebut')} disabled={form.jourEntier} />
            </FormRow>
            <FormRow>
              <Input label="Date de fin" type="date" value={form.dateFin} onChange={set('dateFin')} />
              <Input label="Heure de fin" type="time" value={form.heureFin} onChange={set('heureFin')} disabled={form.jourEntier} />
            </FormRow>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}>
              <input type="checkbox" checked={form.jourEntier} onChange={setCheck('jourEntier')} style={{ accentColor: 'var(--color-primary)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Journée entière</span>
            </label>
            <FormRow>
              <Input label="Lieu" value={form.lieu} onChange={set('lieu')} placeholder="Salle, adresse…" />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Couleur</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {Object.values(TYPE_META).map(m => <button key={m.color} type="button" onClick={() => setForm(f => ({ ...f, couleur: m.color }))} title={m.label} style={{ width: 22, height: 22, borderRadius: '50%', background: m.color, border: form.couleur === m.color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />)}
                  <input type="color" value={form.couleur} onChange={set('couleur')} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} title="Couleur personnalisée" />
                </div>
              </div>
            </FormRow>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Visibilité</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {VISIBILITY_OPTIONS.map(({ value, label, Icon, hint }) => (
                  <div key={value} onClick={() => setForm(f => ({ ...f, visibilite: value }))}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${form.visibilite === value ? 'var(--color-primary)' : 'var(--border-default)'}`, background: form.visibilite === value ? 'var(--color-primary-light)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={15} style={{ color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-primary)' }}>{label}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{hint}</p>
                    </div>
                    {form.visibilite === value && <Check size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
            </div>
            {form.type !== 'AUTRE' && (
              <FormRow>
                <Select label="Projet lié" value={form.projetId} onChange={set('projetId')} options={[{ value: '', label: 'Aucun' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} />
                <Select label="Département" value={form.departementId} onChange={set('departementId')} options={[{ value: '', label: 'Aucun' }, ...departements.map(d => ({ value: String(d.id), label: d.nom }))]} />
              </FormRow>
            )}
            {['REUNION', 'FORMATION', 'CONFERENCE', 'MISSION', 'CONGE'].includes(form.type) && (
              <ParticipantPicker employes={employes} selected={form.participantsIds} onChange={ids => setForm(f => ({ ...f, participantsIds: ids }))} />
            )}
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)', border: '1px solid var(--border-muted)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: form.rappelActif ? 10 : 0 }}>
                <input type="checkbox" checked={form.rappelActif} onChange={setCheck('rappelActif')} style={{ accentColor: 'var(--color-primary)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><Bell size={12} /> Activer un rappel</span>
              </label>
              {form.rappelActif && <Select label="Délai" value={form.minutesRappel} onChange={set('minutesRappel')} options={RAPPEL_OPTIONS} />}
            </div>
          </div>
        </form>
      </Modal>

      <DayModal day={dayModal.day} events={dayModal.events} employes={employes} open={dayModal.open}
        onClose={() => setDayModal({ open: false, day: null, events: [] })}
        onEdit={openEdit} onDelete={setDeleteItem} onNew={openCreate} isAdmin={isAdmin} />

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer l'événement"
        message={`Supprimer "${deleteItem?.titre}" ? Cette action est irréversible.`} confirmLabel="Supprimer" />
    </div>
  );
}


// ============

// import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// import {
//   Plus, Pencil, Trash2, Calendar, Clock, MapPin, Users, Bell,
//   Globe, Lock, ChevronLeft, ChevronRight, Cake, Plane,
//   Coffee, Tag, Filter, List, LayoutGrid, X, Check,
//   Building2, FolderOpen, User, Crown, Shield, UserCheck,
//   ChevronDown, Eye,
// } from 'lucide-react';
// import { evenementApi, projetApi, employerApi, departementApi } from '../api';
// import {
//   Card, Button, Modal, Input, Select, Confirm,
//   SearchInput, Avatar, FormRow, Textarea,
// } from '../components/ui';
// import {
//   format, parseISO, isFuture, isToday,
//   startOfMonth, endOfMonth, eachDayOfInterval,
//   isSameDay, isSameMonth, addMonths, subMonths,
//   getDay, differenceInDays, isValid,
// } from 'date-fns';
// import { fr } from 'date-fns/locale';
// import toast from 'react-hot-toast';

// // ─── Constantes ───────────────────────────────────────────────────────────────

// const TYPES = ['REUNION', 'FORMATION', 'CONFERENCE', 'CONGE', 'MISSION', 'AUTRE'];
// const TYPE_META = {
//   REUNION:    { label: 'Réunion',    color: '#6366F1', icon: Users },
//   FORMATION:  { label: 'Formation',  color: '#10B981', icon: Coffee },
//   CONFERENCE: { label: 'Conférence', color: '#0EA5E9', icon: Globe },
//   CONGE:      { label: 'Congé',      color: '#F59E0B', icon: Calendar },
//   MISSION:    { label: 'Mission',    color: '#8B5CF6', icon: Plane },
//   AUTRE:      { label: 'Autre',      color: '#94A3B8', icon: Tag },
// };
// const CONGE_SUBTYPES = ['Maladie', 'Mariage', 'Indisponibilité', 'Congé annuel', 'Congé sans solde', 'Autre'];
// const VISIBILITE_OPTIONS = [
//   { value: 'PUBLIC',      label: 'Public',      Icon: Globe,      hint: "Visible par toute l'équipe" },
//   { value: 'PRIVE',       label: 'Privé',       Icon: Lock,       hint: 'Visible uniquement par vous' },
//   { value: 'DEPARTEMENT', label: 'Département', Icon: Building2,  hint: 'Visible par votre département' },
// ];
// const RAPPEL_OPTIONS = [
//   { value: '5',    label: '5 minutes avant' },
//   { value: '15',   label: '15 minutes avant' },
//   { value: '30',   label: '30 minutes avant' },
//   { value: '60',   label: '1 heure avant' },
//   { value: '1440', label: '1 jour avant' },
// ];
// const ROLE_META = {
//   SUPER_ADMIN: { label: 'Super Admin', color: '#EF4444', Icon: Crown },
//   ADMIN:       { label: 'Admin',       color: '#F59E0B', Icon: Shield },
//   MANAGER:     { label: 'Manager',     color: '#6366F1', Icon: UserCheck },
//   EMPLOYE:     { label: 'Employé',     color: '#94A3B8', Icon: User },
// };
// const EMPTY_FORM = {
//   titre: '', description: '', type: 'REUNION', sousType: '',
//   dateDebut: '', heureDebut: '', dateFin: '', heureFin: '',
//   lieu: '', couleur: '#6366F1', visibilite: 'PUBLIC',
//   rappelActif: false, minutesRappel: '30', jourEntier: false,
//   participantsIds: [],
//   departementIds: [],   // NEW — départements entiers
//   projetId: '',
// };

// // ─── Utilitaires ─────────────────────────────────────────────────────────────

// function safeParseISO(str) {
//   if (!str) return null;
//   try { const d = parseISO(str); return isValid(d) ? d : null; } catch { return null; }
// }
// function fmtDate(str) {
//   const d = safeParseISO(str);
//   return d ? format(d, 'd MMMM yyyy', { locale: fr }) : (str || '');
// }
// function fmtTime(h, hf) { if (h && hf) return `${h} → ${hf}`; return h || hf || null; }
// function birthdayThisYear(dateStr) {
//   const d = safeParseISO(dateStr);
//   if (!d) return null;
//   return new Date(new Date().getFullYear(), d.getMonth(), d.getDate());
// }
// function getStatus(ev) {
//   const d = safeParseISO(ev.dateDebut);
//   if (!d) return { label: '?', color: '#94A3B8' };
//   if (isToday(d))  return { label: "Aujourd'hui", color: '#0EA5E9' };
//   if (isFuture(d)) return { label: 'À venir',    color: '#6366F1' };
//   return                  { label: 'Passé',      color: '#94A3B8' };
// }
// function toStrId(val) {
//   if (val == null) return '';
//   if (typeof val === 'object') return String(val.id ?? '');
//   return String(val);
// }
// function toParticipantIds(raw) {
//   if (!raw) return [];
//   return raw.map(p => (typeof p === 'object' ? String(p.id ?? '') : String(p))).filter(Boolean);
// }

// // ─── Composant : Badge Rôle ────────────────────────────────────────────────

// function RoleBadge({ role }) {
//   const meta = ROLE_META[role] || ROLE_META.EMPLOYE;
//   const { Icon, color, label } = meta;
//   return (
//     <span style={{
//       display: 'inline-flex', alignItems: 'center', gap: 4,
//       padding: '2px 7px', borderRadius: 'var(--radius-full)',
//       background: `${color}18`, color, fontSize: 10, fontWeight: 700,
//     }}>
//       <Icon size={9} />{label}
//     </span>
//   );
// }

// // ─── Composant : Créateur ─────────────────────────────────────────────────

// function CreateurBadge({ createur }) {
//   if (!createur) return null;
//   return (
//     <span style={{
//       display: 'inline-flex', alignItems: 'center', gap: 6,
//       padding: '3px 8px 3px 4px', borderRadius: 'var(--radius-full)',
//       background: 'var(--bg-muted)', border: '1px solid var(--border-muted)',
//       fontSize: 11, color: 'var(--text-secondary)',
//     }}>
//       <Avatar name={createur.name || '?'} size={16} />
//       <span style={{ fontWeight: 600 }}>{createur.name}</span>
//       {createur.posteName && (
//         <span style={{ color: 'var(--text-muted)' }}>· {createur.posteName}</span>
//       )}
//     </span>
//   );
// }

// // ─── Composant : Participants résumé ──────────────────────────────────────

// function ParticipantsSummary({ participants = [], departements = [], nombreParticipants }) {
//   const [expanded, setExpanded] = useState(false);
//   const hasIndiv = participants.length > 0;
//   const hasDepts = departements.length > 0;
//   if (!hasIndiv && !hasDepts) return null;

//   return (
//     <div>
//       <button
//         onClick={() => setExpanded(e => !e)}
//         style={{
//           display: 'inline-flex', alignItems: 'center', gap: 5,
//           background: 'none', border: 'none', cursor: 'pointer',
//           fontSize: 11, color: 'var(--text-muted)', padding: 0,
//         }}
//       >
//         <Users size={11} />
//         {nombreParticipants > 0 ? nombreParticipants : (participants.length + departements.reduce((a, d) => a + (d.nombreMembres || 0), 0))} participant{nombreParticipants !== 1 ? 's' : ''}
//         {(hasIndiv || hasDepts) && <ChevronDown size={10} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
//       </button>

//       {expanded && (
//         <div style={{
//           marginTop: 8, padding: '10px 12px',
//           background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)',
//           border: '1px solid var(--border-muted)',
//           display: 'flex', flexDirection: 'column', gap: 8,
//         }}>
//           {hasDepts && (
//             <div>
//               <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Départements</p>
//               <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
//                 {departements.map(d => (
//                   <span key={d.id} style={{
//                     display: 'inline-flex', alignItems: 'center', gap: 4,
//                     padding: '3px 8px', borderRadius: 'var(--radius-full)',
//                     background: '#6366F118', color: '#6366F1', fontSize: 11, fontWeight: 600,
//                   }}>
//                     <Building2 size={10} />{d.nom}
//                     <span style={{ opacity: 0.7 }}>({d.nombreMembres})</span>
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}
//           {hasIndiv && (
//             <div>
//               <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>Participants individuels</p>
//               <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
//                 {participants.map(p => (
//                   <span key={p.id} style={{
//                     display: 'inline-flex', alignItems: 'center', gap: 5,
//                     padding: '3px 8px 3px 4px', borderRadius: 'var(--radius-full)',
//                     background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
//                     fontSize: 11,
//                   }}>
//                     <Avatar name={p.name || '?'} size={16} />
//                     <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
//                     {p.departementNom && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>· {p.departementNom}</span>}
//                   </span>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Composant : NotifBell ────────────────────────────────────────────────

// function NotifBell({ events }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef();
//   useEffect(() => {
//     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, []);
//   const upcoming = useMemo(() => {
//     const now = new Date();
//     return events
//       .filter(ev => { const d = safeParseISO(ev.dateDebut); if (!d) return false; return differenceInDays(d, now) >= 0 && differenceInDays(d, now) <= 7; })
//       .sort((a, b) => (a.dateDebut || '').localeCompare(b.dateDebut || ''))
//       .slice(0, 12);
//   }, [events]);
//   return (
//     <div ref={ref} style={{ position: 'relative' }}>
//       <button onClick={() => setOpen(o => !o)} title="Événements cette semaine"
//         style={{ position: 'relative', width: 38, height: 38, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
//         <Bell size={16} />
//         {upcoming.length > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', border: '2px solid var(--bg-surface)' }} />}
//       </button>
//       {open && (
//         <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 99, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', width: 320, maxHeight: 400, overflowY: 'auto' }}>
//           <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1 }}>
//             <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>Cette semaine</p>
//             <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: upcoming.length > 0 ? '#F59E0B20' : 'var(--bg-muted)', color: upcoming.length > 0 ? '#F59E0B' : 'var(--text-muted)' }}>{upcoming.length}</span>
//           </div>
//           {upcoming.length === 0
//             ? <p style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Aucun événement cette semaine</p>
//             : upcoming.map(ev => {
//               const meta = TYPE_META[ev.type] || TYPE_META.AUTRE;
//               const color = ev.couleur || meta.color;
//               return (
//                 <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border-muted)' }}>
//                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
//                   <div style={{ flex: 1, minWidth: 0 }}>
//                     <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{ev.titre}</p>
//                     <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{fmtDate(ev.dateDebut)}{ev.heureDebut ? ` · ${ev.heureDebut}` : ''}</p>
//                     {ev.createur && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>par {ev.createur.name}</p>}
//                   </div>
//                   <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: `${color}20`, color, fontWeight: 700, flexShrink: 0 }}>{meta.label}</span>
//                 </div>
//               );
//             })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Composant : CalendarView ─────────────────────────────────────────────

// function CalendarView({ events, employes, onDayClick, currentMonth, onMonthChange }) {
//   const start = startOfMonth(currentMonth), end = endOfMonth(currentMonth);
//   const days  = eachDayOfInterval({ start, end });
//   const startPad = getDay(start) === 0 ? 6 : getDay(start) - 1;
//   const padded = [...Array(startPad).fill(null), ...days];
//   while (padded.length % 7 !== 0) padded.push(null);

//   const bdayMarkers = useMemo(() => employes.flatMap(emp => {
//     const res = [];
//     if (emp.dateNaissance) {
//       const d = birthdayThisYear(emp.dateNaissance);
//       if (d) res.push({ date: d, label: `🎂 ${emp.name}`, color: '#F43F5E' });
//     }
//     if (emp.dateRecrutement) {
//       const d = birthdayThisYear(emp.dateRecrutement);
//       const orig = safeParseISO(emp.dateRecrutement);
//       const years = orig ? new Date().getFullYear() - orig.getFullYear() : 0;
//       if (d && years > 0) res.push({ date: d, label: `🏅 ${emp.name} (${years} an${years > 1 ? 's' : ''})`, color: '#8B5CF6' });
//     }
//     return res;
//   }), [employes]);

//   const WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
//   return (
//     <div>
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
//         <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ChevronLeft size={15} /></button>
//         <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>{format(currentMonth, 'MMMM yyyy', { locale: fr })}</p>
//         <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><ChevronRight size={15} /></button>
//       </div>
//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border-muted)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-muted)' }}>
//         {WEEK.map(w => <div key={w} style={{ background: 'var(--bg-muted)', padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{w}</div>)}
//         {padded.map((day, i) => {
//           if (!day) return <div key={`pad-${i}`} style={{ background: 'var(--bg-muted)', minHeight: 88 }} />;
//           const dayEvents = events.filter(ev => { const d = safeParseISO(ev.dateDebut); return d && isSameDay(d, day); });
//           const dayBdays  = bdayMarkers.filter(m => isSameDay(m.date, day));
//           const isCurrentDay = isToday(day);
//           const total = dayEvents.length + dayBdays.length;
//           return (
//             <div key={day.toISOString()} onClick={() => onDayClick(day, dayEvents)}
//               style={{ background: isCurrentDay ? 'var(--color-primary-light)' : 'var(--bg-surface)', minHeight: 88, padding: '6px', cursor: 'pointer', opacity: isSameMonth(day, currentMonth) ? 1 : 0.38, transition: 'background var(--transition-fast)' }}
//               onMouseEnter={e => { if (!isCurrentDay) e.currentTarget.style.background = 'var(--bg-muted)'; }}
//               onMouseLeave={e => { if (!isCurrentDay) e.currentTarget.style.background = 'var(--bg-surface)'; }}
//             >
//               <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700, background: isCurrentDay ? 'var(--color-primary)' : 'transparent', color: isCurrentDay ? '#fff' : 'var(--text-primary)', marginBottom: 3 }}>{format(day, 'd')}</span>
//               <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//                 {dayEvents.slice(0, 2).map(ev => { const c = ev.couleur || (TYPE_META[ev.type] || TYPE_META.AUTRE).color; return <div key={ev.id} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: `${c}22`, color: c, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titre}</div>; })}
//                 {dayBdays.slice(0, 1).map((b, bi) => <div key={bi} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, background: `${b.color}18`, color: b.color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</div>)}
//                 {total > 3 && <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>+{total - 3} autre{total - 3 > 1 ? 's' : ''}</span>}
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ─── Composant : EventCard (avec créateur + participants enrichis) ─────────

// function EventCard({ ev, onEdit, onDelete, currentUserId, userRole, isAdmin }) {
//   const meta = TYPE_META[ev.type] || TYPE_META.AUTRE;
//   const status = getStatus(ev);
//   const IconT = meta.icon;
//   const color = ev.couleur || meta.color;
//   const isOwner = ev.createur && String(ev.createur.id) === String(currentUserId);
//   const canEdit = isAdmin || isOwner || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

//   return (
//     <div style={{
//       background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
//       padding: '14px 18px', border: '1px solid var(--border-default)',
//       borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'flex-start',
//       gap: 14, transition: 'box-shadow var(--transition-fast)',
//     }}
//       onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
//       onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
//     >
//       <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
//         <IconT size={16} style={{ color }} />
//       </div>

//       <div style={{ flex: 1, minWidth: 0 }}>
//         {/* Ligne titre + badges */}
//         <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, flexWrap: 'wrap' }}>
//           <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{ev.titre}</h4>
//           {ev.sousType && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontWeight: 600 }}>{ev.sousType}</span>}
//           <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${color}18`, color, fontWeight: 700 }}>{meta.label}</span>
//           <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${status.color}14`, color: status.color, fontWeight: 600 }}>{status.label}</span>
//           <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>
//             {ev.visibilite === 'PRIVE'
//               ? <><Lock size={9} /> Privé</>
//               : ev.visibilite === 'DEPARTEMENT'
//                 ? <><Building2 size={9} /> Département</>
//                 : <><Globe size={9} /> Public</>}
//           </span>
//         </div>

//         {/* Créateur */}
//         {ev.createur && (
//           <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
//             <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Créé par</span>
//             <CreateurBadge createur={ev.createur} />
//             {isOwner && (
//               <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#0EA5E918', color: '#0EA5E9', fontWeight: 700 }}>Vous</span>
//             )}
//           </div>
//         )}

//         {ev.description && (
//           <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>{ev.description}</p>
//         )}

//         {/* Tout sur une seule ligne : heure · lieu · projet · départements · participants · rappel */}
//         <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
//           {fmtTime(ev.heureDebut, ev.heureFin) && (
//             <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
//               <Clock size={11} />{fmtTime(ev.heureDebut, ev.heureFin)}
//             </span>
//           )}
//           {ev.lieu && (
//             <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
//               <MapPin size={11} />{ev.lieu}
//             </span>
//           )}
//           {ev.projet && (
//             <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
//               <FolderOpen size={11} />{ev.projet.nom}
//             </span>
//           )}
//           {(ev.departements || []).map(d => (
//             <span key={d.id} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 3, background: '#6366F115', color: '#6366F1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
//               <Building2 size={9} />{d.nom}{d.nombreMembres > 0 && <span style={{ opacity: 0.6 }}>({d.nombreMembres})</span>}
//             </span>
//           ))}
//           {(ev.participants || []).length > 0 && (
//             <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
//               <div style={{ display: 'flex' }}>
//                 {(ev.participants).slice(0, 4).map((p, i) => (
//                   <div key={p.id} title={p.name + (p.departementNom ? ' · ' + p.departementNom : '')}
//                     style={{ marginLeft: i === 0 ? 0 : -5, zIndex: 4 - i, position: 'relative', borderRadius: '50%', border: '2px solid var(--bg-surface)' }}>
//                     <Avatar name={p.name || '?'} size={20} />
//                   </div>
//                 ))}
//               </div>
//               <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
//                 {ev.participants.length === 1 ? ev.participants[0].name : ev.participants.length + ' participants'}
//               </span>
//             </span>
//           )}
//           {(ev.departements || []).length > 0 && (ev.participants || []).length > 0 && ev.nombreParticipants > 0 && (
//             <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
//               <Users size={10} />{ev.nombreParticipants} au total
//             </span>
//           )}
//           {ev.rappelActif && (
//             <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
//               <Bell size={11} />Rappel {ev.minutesRappel}min
//             </span>
//           )}
//         </div>
//       </div>

//       {canEdit && (
//         <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
//           <Button variant="ghost" size="sm" onClick={() => onEdit(ev)} title="Modifier"><Pencil size={13} /></Button>
//           <Button variant="ghost" size="sm" onClick={() => onDelete(ev)} title="Supprimer" style={{ color: 'var(--color-danger)' }}><Trash2 size={13} /></Button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Composant : Sélecteur de participants ────────────────────────────────

// function ParticipantPicker({ employes, selected, onChange }) {
//   const [search, setSearch] = useState('');
//   const inputRef = useRef();
//   const selectedStrs = useMemo(() => selected.map(String), [selected]);
//   const filtered = employes.filter(e =>
//     (e.name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())) &&
//     !selectedStrs.includes(String(e.id))
//   );
//   const selectedEmps = employes.filter(e => selectedStrs.includes(String(e.id)));
//   const remove = (id) => onChange(selectedStrs.filter(s => s !== String(id)));
//   const add    = (emp) => { onChange([...selectedStrs, String(emp.id)]); setSearch(''); inputRef.current?.focus(); };

//   return (
//     <div>
//       <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Participants individuels</label>
//       {selectedEmps.length > 0 && (
//         <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
//           {selectedEmps.map(emp => (
//             <span key={emp.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)40', fontSize: 11, fontWeight: 600, color: 'var(--color-primary)' }}>
//               <Avatar name={emp.name} size={16} />{emp.name}
//               {emp.poste?.departement && (
//                 <span style={{ fontSize: 10, opacity: 0.7 }}>· {typeof emp.poste.departement === 'object' ? emp.poste.departement.name : emp.poste.departement}</span>
//               )}
//               <button type="button" onClick={() => remove(emp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary)', display: 'flex', lineHeight: 1 }}><X size={10} /></button>
//             </span>
//           ))}
//         </div>
//       )}
//       <div style={{ position: 'relative' }}>
//         <Input ref={inputRef} placeholder="Rechercher un participant…" value={search} onChange={e => setSearch(e.target.value)} />
//         {search && (
//           <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 100, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
//             {filtered.length === 0
//               ? <p style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Aucun résultat</p>
//               : filtered.map(emp => (
//                 <div key={emp.id} onClick={() => add(emp)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-muted)' }}
//                   onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
//                   onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
//                 >
//                   <Avatar name={emp.name} size={24} />
//                   <div style={{ flex: 1 }}>
//                     <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{emp.name}</p>
//                     {emp.email && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{emp.email}</p>}
//                   </div>
//                   {emp.poste && (
//                     <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
//                       {typeof emp.poste === 'object' ? emp.poste.name : emp.poste}
//                       {emp.poste?.departement && <><br /><span style={{ color: '#6366F1' }}>{typeof emp.poste.departement === 'object' ? emp.poste.departement.name : emp.poste.departement}</span></>}
//                     </span>
//                   )}
//                 </div>
//               ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Composant : Sélecteur de départements (Super Admin / Admin) ──────────

// function DepartementPicker({ departements, selected, onChange }) {
//   const selectedStrs = useMemo(() => selected.map(String), [selected]);
//   const selectedDepts = departements.filter(d => selectedStrs.includes(String(d.id)));
//   const remove = (id) => onChange(selectedStrs.filter(s => s !== String(id)));
//   const add = (dept) => {
//     if (!selectedStrs.includes(String(dept.id))) {
//       onChange([...selectedStrs, String(dept.id)]);
//     }
//   };

//   return (
//     <div>
//       <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
//         Départements participants
//         <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
//           (tous les membres du département seront inclus)
//         </span>
//       </label>
//       {selectedDepts.length > 0 && (
//         <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
//           {selectedDepts.map(dept => (
//             <span key={dept.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#6366F118', border: '1px solid #6366F140', fontSize: 11, fontWeight: 600, color: '#6366F1' }}>
//               <Building2 size={11} />{dept.nom || dept.name}
//               <button type="button" onClick={() => remove(dept.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6366F1', display: 'flex' }}><X size={10} /></button>
//             </span>
//           ))}
//         </div>
//       )}
//       <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
//         {departements.map(dept => {
//           const isSelected = selectedStrs.includes(String(dept.id));
//           return (
//             <button key={dept.id} type="button" onClick={() => isSelected ? remove(dept.id) : add(dept)}
//               style={{
//                 display: 'inline-flex', alignItems: 'center', gap: 5,
//                 padding: '5px 10px', borderRadius: 'var(--radius-md)',
//                 border: `1px solid ${isSelected ? '#6366F1' : 'var(--border-default)'}`,
//                 background: isSelected ? '#6366F118' : 'var(--bg-muted)',
//                 color: isSelected ? '#6366F1' : 'var(--text-secondary)',
//                 cursor: 'pointer', fontSize: 12, fontWeight: isSelected ? 700 : 500,
//                 transition: 'all 0.15s',
//               }}
//             >
//               {isSelected ? <Check size={11} /> : <Building2 size={11} />}
//               {dept.nom || dept.name}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ─── Composant : Modale de détail d'un jour ───────────────────────────────

// function DayModal({ day, events, employes, open, onClose, onEdit, onDelete, onNew, currentUserId, userRole, isAdmin }) {
//   if (!open || !day) return null;
//   const bdayMarkers = employes.flatMap(emp => {
//     const res = [];
//     const bday = birthdayThisYear(emp.dateNaissance);
//     if (bday && isSameDay(bday, day)) res.push({ emp, type: 'birthday', label: '🎂 Anniversaire' });
//     const anniv = birthdayThisYear(emp.dateRecrutement);
//     const orig = safeParseISO(emp.dateRecrutement);
//     const years = orig ? day.getFullYear() - orig.getFullYear() : 0;
//     if (anniv && isSameDay(anniv, day) && years > 0) res.push({ emp, type: 'anniversary', label: `🏅 ${years} an${years > 1 ? 's' : ''} d'embauche` });
//     return res;
//   });
//   const title = format(day, "EEEE d MMMM yyyy", { locale: fr });
//   const canCreate = isAdmin || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

//   return (
//     <Modal open={open} onClose={onClose} title={title.charAt(0).toUpperCase() + title.slice(1)} width={600}
//       footer={canCreate && (
//         <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
//           <Button onClick={() => { onNew(day); onClose(); }}><Plus size={14} /> Ajouter un événement</Button>
//         </div>
//       )}>
//       <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//         {bdayMarkers.length > 0 && (
//           <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#F43F5E0D', border: '1px solid #F43F5E25' }}>
//             {bdayMarkers.map((b, i) => (
//               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
//                 <Avatar name={b.emp.name} size={24} />
//                 <p style={{ fontSize: 12, fontWeight: 600, color: '#F43F5E', margin: 0 }}>{b.emp.name} — {b.label}</p>
//               </div>
//             ))}
//           </div>
//         )}
//         {events.length === 0 && bdayMarkers.length === 0 && (
//           <div style={{ textAlign: 'center', padding: '40px 0' }}>
//             <Calendar size={36} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
//             <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Aucun événement ce jour</p>
//           </div>
//         )}
//         {events.map(ev => (
//           <EventCard key={ev.id} ev={ev}
//             onEdit={e => { onEdit(e); onClose(); }}
//             onDelete={onDelete}
//             currentUserId={currentUserId}
//             userRole={userRole}
//             isAdmin={isAdmin}
//           />
//         ))}
//       </div>
//     </Modal>
//   );
// }

// // ─── Composant : Section anniversaires ───────────────────────────────────

// function BirthdaySection({ employes }) {
//   const now = new Date();
//   const upcoming = useMemo(() => employes.flatMap(emp => {
//     const rows = [];
//     if (emp.dateNaissance) {
//       const d = birthdayThisYear(emp.dateNaissance);
//       if (d) { const diff = differenceInDays(d, now); if (diff >= 0 && diff <= 30) rows.push({ emp, date: d, diff, type: 'birthday', label: '🎂 Anniversaire' }); }
//     }
//     if (emp.dateRecrutement) {
//       const d = birthdayThisYear(emp.dateRecrutement);
//       const orig = safeParseISO(emp.dateRecrutement);
//       const years = orig ? now.getFullYear() - orig.getFullYear() : 0;
//       if (d && years > 0) { const diff = differenceInDays(d, now); if (diff >= 0 && diff <= 30) rows.push({ emp, date: d, diff, type: 'anniversary', label: `🏅 ${years} an${years > 1 ? 's' : ''} d'embauche` }); }
//     }
//     return rows;
//   }).sort((a, b) => a.diff - b.diff), [employes]);

//   if (!upcoming.length) return null;
//   return (
//     <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid #F43F5E30' }}>
//       <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
//         <span style={{ fontSize: 16 }}>🎂</span>
//         <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anniversaires à venir · 30 jours</p>
//       </div>
//       <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
//         {upcoming.map((item, i) => (
//           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', border: `1px solid ${item.type === 'birthday' ? '#F43F5E30' : '#8B5CF630'}` }}>
//             <Avatar name={item.emp.name} size={26} />
//             <div>
//               <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{item.emp.name}</p>
//               <p style={{ fontSize: 11, color: item.type === 'birthday' ? '#F43F5E' : '#8B5CF6', margin: 0 }}>
//                 {item.label} — {item.diff === 0 ? "Aujourd'hui 🎉" : `dans ${item.diff} jour${item.diff > 1 ? 's' : ''}`}
//               </p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── Composant principal : Evenements ────────────────────────────────────

// export default function Evenements({ currentUser = null, isAdmin = false }) {
//   // currentUser doit avoir : { id, name, role: 'SUPER_ADMIN'|'ADMIN'|'MANAGER'|'EMPLOYE', departementId? }
//   // isAdmin = fallback rétrocompatible si currentUser n'est pas fourni
//   const userRole = currentUser?.role || (isAdmin ? 'ADMIN' : 'EMPLOYE');
//   const canCreate = isAdmin || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);
//   const isSuperAdminOrAdmin = isAdmin || ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

//   const [data, setData]                 = useState([]);
//   const [loading, setLoading]           = useState(true);
//   const [search, setSearch]             = useState('');
//   const [filterType, setFilterType]     = useState('');
//   const [filterVis, setFilterVis]       = useState('');
//   const [filterProjet, setFilterProjet] = useState('');
//   const [filterDept, setFilterDept]     = useState('');
//   const [filterEmp, setFilterEmp]       = useState('');
//   const [view, setView]                 = useState('timeline');
//   const [currentMonth, setCurrentMonth] = useState(new Date());
//   const [modalOpen, setModalOpen]       = useState(false);
//   const [editItem, setEditItem]         = useState(null);
//   const [deleteItem, setDeleteItem]     = useState(null);
//   const [dayModal, setDayModal]         = useState({ open: false, day: null, events: [] });
//   const [form, setForm]                 = useState(EMPTY_FORM);
//   const [saving, setSaving]             = useState(false);
//   const [deleting, setDeleting]         = useState(false);
//   const [projets, setProjets]           = useState([]);
//   const [employes, setEmployes]         = useState([]);
//   const [departements, setDepartements] = useState([]);
//   const [showFilters, setShowFilters]   = useState(false);

//   // ─── Chargement ────────────────────────────────────────────

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await evenementApi.getAll({ page: 0, size: 200 });
//       const d = res.data?.data || res.data;
//       setData(Array.isArray(d) ? d : d?.content || []);
//     } catch { toast.error('Erreur de chargement'); }
//     finally { setLoading(false); }
//   }, []);

//   useEffect(() => { load(); }, [load]);

//   useEffect(() => {
//     Promise.all([
//       projetApi.getAll({ size: 200 }),
//       employerApi.getAll({ size: 200 }),
//       departementApi?.getAll?.({ size: 200 }).catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
//     ]).then(([p, e, d]) => {
//       const pd = p.data?.data || p.data; setProjets(Array.isArray(pd) ? pd : pd?.content || []);
//       const ed = e.data?.data || e.data; setEmployes(Array.isArray(ed) ? ed : ed?.content || []);
//       const dd = d.data?.data || d.data; setDepartements(Array.isArray(dd) ? dd : dd?.content || []);
//     }).catch(() => {});
//   }, []);

//   // ─── Filtrage ──────────────────────────────────────────────

//   const filtered = useMemo(() => data.filter(ev =>
//     (!search       || ev.titre?.toLowerCase().includes(search.toLowerCase()) || ev.lieu?.toLowerCase().includes(search.toLowerCase())) &&
//     (!filterType   || ev.type === filterType) &&
//     (!filterVis    || ev.visibilite === filterVis) &&
//     (!filterProjet || String(ev.projet?.id || ev.projetId) === filterProjet) &&
//     (!filterDept   || (ev.departements || []).some(d => String(d.id) === filterDept) ||
//                       (ev.participants || []).some(p => p.departementNom && String(p.departementNom) === filterDept)) &&
//     (!filterEmp    || (ev.participants || []).map(p => String(p.id)).includes(filterEmp) ||
//                       (ev.createur && String(ev.createur.id) === filterEmp))
//   ), [data, search, filterType, filterVis, filterProjet, filterDept, filterEmp]);

//   const grouped = useMemo(() => {
//     const acc = {};
//     filtered.forEach(ev => { const key = ev.dateDebut || 'Sans date'; if (!acc[key]) acc[key] = []; acc[key].push(ev); });
//     return acc;
//   }, [filtered]);

//   const sortedKeys = useMemo(() => Object.keys(grouped).sort(), [grouped]);

//   // ─── Ouverture du formulaire ───────────────────────────────

//   const openCreate = useCallback((day = null) => {
//     setEditItem(null);
//     setForm({ ...EMPTY_FORM, dateDebut: day ? format(day, 'yyyy-MM-dd') : '' });
//     setModalOpen(true);
//   }, []);

//   const openEdit = useCallback((item) => {
//     setEditItem(item);
//     setForm({
//       titre:          String(item.titre        || ''),
//       description:    String(item.description  || ''),
//       type:           String(item.type         || 'REUNION'),
//       sousType:       String(item.sousType     || ''),
//       dateDebut:      String(item.dateDebut    || ''),
//       heureDebut:     String(item.heureDebut   || ''),
//       dateFin:        String(item.dateFin      || ''),
//       heureFin:       String(item.heureFin     || ''),
//       lieu:           String(item.lieu         || ''),
//       couleur:        String(item.couleur      || '#6366F1'),
//       visibilite:     String(item.visibilite   || 'PUBLIC'),
//       rappelActif:    Boolean(item.rappelActif),
//       minutesRappel:  String(item.minutesRappel || '30'),
//       jourEntier:     Boolean(item.jourEntier),
//       participantsIds: toParticipantIds(item.participants),
//       departementIds:  (item.departements || []).map(d => String(d.id)),
//       projetId:        toStrId(item.projet?.id ?? item.projetId),
//     });
//     setModalOpen(true);
//   }, []);

//   // Auto-couleur selon le type
//   useEffect(() => {
//     if (!editItem) setForm(f => ({ ...f, couleur: TYPE_META[f.type]?.color || '#6366F1' }));
//   }, [form.type, editItem]);

//   const set = k => e => {
//     const val = (e && e.target !== undefined) ? e.target.value : e;
//     setForm(f => ({ ...f, [k]: val }));
//   };
//   const setCheck = k => e => setForm(f => ({ ...f, [k]: e.target.checked }));

//   // ─── Sauvegarde ────────────────────────────────────────────

//   const handleSave = async (e) => {
//     e.preventDefault();
//     if (!form.titre.trim()) { toast.error('Le titre est obligatoire'); return; }
//     setSaving(true);
//     try {
//       const payload = {
//         ...form,
//         projetId:       form.projetId       ? Number(form.projetId)       : null,
//         minutesRappel:  Number(form.minutesRappel),
//         participantsIds: form.participantsIds.map(Number).filter(Boolean),
//         departementIds:  form.departementIds.map(Number).filter(Boolean),
//       };
//       if (editItem) await evenementApi.update(editItem.id, payload);
//       else          await evenementApi.create(payload);
//       toast.success(editItem ? 'Événement modifié' : 'Événement créé');
//       setModalOpen(false);
//       load();
//     } catch (err) {
//       toast.error(err?.response?.data?.message || 'Erreur lors de la sauvegarde');
//     } finally { setSaving(false); }
//   };

//   const handleDelete = async () => {
//     setDeleting(true);
//     try {
//       await evenementApi.delete(deleteItem.id);
//       toast.success('Événement supprimé');
//       setDeleteItem(null);
//       load();
//     } catch { toast.error('Erreur lors de la suppression'); }
//     finally { setDeleting(false); }
//   };

//   const activeFiltersCount = [filterVis, filterProjet, filterDept, filterEmp].filter(Boolean).length;
//   const resetFilters = () => { setFilterVis(''); setFilterProjet(''); setFilterDept(''); setFilterEmp(''); };

//   // ─── Formulaire selon le rôle ──────────────────────────────
//   // Quels types peut créer l'utilisateur ?
//   const allowedTypes = useMemo(() => {
//     if (isSuperAdminOrAdmin) return TYPES;
//     if (userRole === 'MANAGER') return TYPES; // manager peut tout créer dans son dept
//     return ['CONGE']; // employé = congé seulement
//   }, [userRole, isSuperAdminOrAdmin]);

//   // ─── Rendu ─────────────────────────────────────────────────
// 
//   return (
//     <div>
//       {/* Header */}
//       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
//         <div>
//           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
//             <h1 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>Événements</h1>
//             {currentUser && <RoleBadge role={userRole} />}
//           </div>
//           <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
//             {data.length} événement{data.length !== 1 ? 's' : ''}
//           </p>
//         </div>
//         <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
//           <NotifBell events={data} />
//           <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
//             {[{ key: 'timeline', label: 'Agenda', Icon: List }, { key: 'calendar', label: 'Calendrier', Icon: LayoutGrid }].map(({ key, label, Icon }) => (
//               <button key={key} onClick={() => setView(key)} style={{ padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: view === key ? 'var(--color-primary)' : 'var(--bg-surface)', color: view === key ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
//                 <Icon size={13} />{label}
//               </button>
//             ))}
//           </div>
//           {canCreate && (
//             <Button onClick={() => openCreate(null)}><Plus size={16} /> Nouvel événement</Button>
//           )}
//         </div>
//       </div>

//       <BirthdaySection employes={employes} />

//       {/* Filtres par type */}
//       <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
//         <button onClick={() => setFilterType('')} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)', background: !filterType ? 'var(--color-primary)' : 'var(--bg-surface)', color: !filterType ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
//           Tous ({data.length})
//         </button>
//         {TYPES.map(t => {
//           const m = TYPE_META[t]; const Ic = m.icon;
//           return (
//             <button key={t} onClick={() => setFilterType(filterType === t ? '' : t)} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: `1px solid ${m.color}40`, background: filterType === t ? m.color : 'var(--bg-surface)', color: filterType === t ? '#fff' : m.color, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
//               <Ic size={11} />{m.label} ({data.filter(ev => ev.type === t).length})
//             </button>
//           );
//         })}
//       </div>

//       {/* Barre de recherche + filtres avancés */}
//       <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
//         <SearchInput value={search} onChange={setSearch} placeholder="Titre, lieu…" style={{ flex: '1 1 220px', maxWidth: 340 }} />
//         <button onClick={() => setShowFilters(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: activeFiltersCount > 0 ? 'var(--color-primary-light)' : 'var(--bg-surface)', color: activeFiltersCount > 0 ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
//           <Filter size={13} />Filtres
//           {activeFiltersCount > 0 && <span style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{activeFiltersCount}</span>}
//         </button>
//         {activeFiltersCount > 0 && (
//           <button onClick={resetFilters} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>Réinitialiser</button>
//         )}
//         <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
//       </div>

//       {showFilters && (
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, padding: '14px 16px', marginBottom: 16, background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-muted)' }}>
//           <Select label="Visibilité" value={filterVis} onChange={e => setFilterVis(e.target.value)} options={[{ value: '', label: 'Toutes' }, { value: 'PUBLIC', label: 'Public' }, { value: 'PRIVE', label: 'Privé' }, { value: 'DEPARTEMENT', label: 'Département' }]} />
//           <Select label="Projet" value={filterProjet} onChange={e => setFilterProjet(e.target.value)} options={[{ value: '', label: 'Tous' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} />
//           <Select label="Département" value={filterDept} onChange={e => setFilterDept(e.target.value)} options={[{ value: '', label: 'Tous' }, ...departements.map(d => ({ value: String(d.id), label: d.nom || d.name }))]} />
//           <Select label="Créé par / Participant" value={filterEmp} onChange={e => setFilterEmp(e.target.value)} options={[{ value: '', label: 'Tous' }, ...employes.map(e => ({ value: String(e.id), label: e.name }))]} />
//         </div>
//       )}

//       {/* Vue Calendrier */}
//       {view === 'calendar' && (
//         <Card style={{ padding: 20 }}>
//           <CalendarView
//             events={filtered} employes={employes}
//             currentMonth={currentMonth} onMonthChange={setCurrentMonth}
//             onDayClick={(day, evs) => setDayModal({ open: true, day, events: evs })}
//           />
//         </Card>
//       )}

//       {/* Vue Agenda */}
//       {view === 'timeline' && (
//         loading ? (
//           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
//             {[1,2,3,4].map(i => <div key={i} style={{ height: 80, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />)}
//           </div>
//         ) : sortedKeys.length === 0 ? (
//           <Card style={{ textAlign: 'center', padding: '64px 24px' }}>
//             <Calendar size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 14px', display: 'block' }} />
//             <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun événement trouvé</p>
//             {canCreate && <Button style={{ marginTop: 16 }} onClick={() => openCreate(null)}><Plus size={14} /> Créer un événement</Button>}
//           </Card>
//         ) : sortedKeys.map(dateKey => {
//           const d = safeParseISO(dateKey);
//           let dateLabel = dateKey === 'Sans date' ? 'Sans date' : (d ? format(d, "EEEE d MMMM yyyy", { locale: fr }) : dateKey);
//           if (d && isToday(d)) dateLabel = "Aujourd'hui — " + dateLabel;
//           return (
//             <div key={dateKey} style={{ marginBottom: 24 }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
//                 <div style={{ width: 10, height: 10, borderRadius: '50%', background: d && isToday(d) ? '#0EA5E9' : d && isFuture(d) ? 'var(--color-primary)' : 'var(--border-default)', flexShrink: 0 }} />
//                 <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{dateLabel}</p>
//                 <div style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
//                 <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>{grouped[dateKey].length}</span>
//               </div>
//               <div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 10 }}>
//                 {grouped[dateKey].map(ev => (
//                   <EventCard key={ev.id} ev={ev}
//                     onEdit={openEdit} onDelete={setDeleteItem}
//                     currentUserId={currentUser?.id}
//                     userRole={userRole}
//                     isAdmin={isAdmin}
//                   />
//                 ))}
//               </div>
//             </div>
//           );
//         })
//       )}

//       {/* ─── Modale de création / édition ─────────────────────── */}
//       <Modal
//         open={modalOpen} onClose={() => setModalOpen(false)}
//         title={editItem ? "Modifier l'événement" : "Nouvel événement"}
//         width={720}
//         footer={
//           <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
//             <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
//             <Button onClick={handleSave} loading={saving}>{editItem ? 'Enregistrer' : 'Créer'}</Button>
//           </div>
//         }
//       >
//         <form onSubmit={handleSave}>
//           <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

//             {/* Info rôle */}
//             {!isSuperAdminOrAdmin && (
//               <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: `${ROLE_META[userRole]?.color || '#94A3B8'}10`, border: `1px solid ${ROLE_META[userRole]?.color || '#94A3B8'}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
//                 <Eye size={13} style={{ color: ROLE_META[userRole]?.color || '#94A3B8', flexShrink: 0 }} />
//                 <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
//                   {userRole === 'MANAGER'
//                     ? 'En tant que manager, vous pouvez créer des événements pour votre département et inviter des collègues extérieurs.'
//                     : "Vous pouvez créer des demandes de congé ou des événements privés."}
//                 </span>
//               </div>
//             )}

//             {/* Titre + Type */}
//             <FormRow>
//               <Input label="Titre *" value={form.titre} onChange={set('titre')} required placeholder="Titre de l'événement" />
//               <Select
//                 label="Type"
//                 value={form.type}
//                 onChange={set('type')}
//                 options={allowedTypes.map(t => ({ value: t, label: TYPE_META[t].label }))}
//               />
//             </FormRow>

//             {form.type === 'CONGE' && (
//               <Select label="Nature du congé" value={form.sousType} onChange={set('sousType')}
//                 options={[{ value: '', label: 'Sélectionner…' }, ...CONGE_SUBTYPES.map(s => ({ value: s, label: s }))]} />
//             )}

//             <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Description ou précisions…" rows={3} />

//             {/* Dates */}
//             <FormRow>
//               <Input label="Date de début" type="date" value={form.dateDebut} onChange={set('dateDebut')} />
//               <Input label="Heure de début" type="time" value={form.heureDebut} onChange={set('heureDebut')} disabled={form.jourEntier} />
//             </FormRow>
//             <FormRow>
//               <Input label="Date de fin" type="date" value={form.dateFin} onChange={set('dateFin')} />
//               <Input label="Heure de fin" type="time" value={form.heureFin} onChange={set('heureFin')} disabled={form.jourEntier} />
//             </FormRow>
//             <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}>
//               <input type="checkbox" checked={form.jourEntier} onChange={setCheck('jourEntier')} style={{ accentColor: 'var(--color-primary)' }} />
//               <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Journée entière</span>
//             </label>

//             {/* Lieu + Couleur */}
//             <FormRow>
//               <Input label="Lieu" value={form.lieu} onChange={set('lieu')} placeholder="Salle, adresse…" />
//               <div>
//                 <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Couleur</label>
//                 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
//                   {Object.values(TYPE_META).map(m => (
//                     <button key={m.color} type="button" onClick={() => setForm(f => ({ ...f, couleur: m.color }))} title={m.label}
//                       style={{ width: 22, height: 22, borderRadius: '50%', background: m.color, border: form.couleur === m.color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
//                   ))}
//                   <input type="color" value={form.couleur} onChange={set('couleur')} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
//                 </div>
//               </div>
//             </FormRow>

//             {/* Visibilité */}
//             <div>
//               <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Visibilité</label>
//               <div style={{ display: 'flex', gap: 10 }}>
//                 {VISIBILITE_OPTIONS.map(({ value, label, Icon, hint }) => (
//                   <div key={value} onClick={() => setForm(f => ({ ...f, visibilite: value }))}
//                     style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${form.visibilite === value ? 'var(--color-primary)' : 'var(--border-default)'}`, background: form.visibilite === value ? 'var(--color-primary-light)' : 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
//                     <Icon size={15} style={{ color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
//                     <div style={{ flex: 1, minWidth: 0 }}>
//                       <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: form.visibilite === value ? 'var(--color-primary)' : 'var(--text-primary)' }}>{label}</p>
//                       <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{hint}</p>
//                     </div>
//                     {form.visibilite === value && <Check size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Projet lié */}
//             {form.type !== 'CONGE' && (
//               <Select label="Projet lié" value={form.projetId} onChange={set('projetId')}
//                 options={[{ value: '', label: 'Aucun' }, ...projets.map(p => ({ value: String(p.id), label: p.nom }))]} />
//             )}

//             {/* ─── Section participants (adaptée au rôle) ──────── */}
//             {['REUNION', 'FORMATION', 'CONFERENCE', 'MISSION', 'CONGE'].includes(form.type) && (
//               <div style={{ padding: '14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-muted)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: 14 }}>
//                 <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participants</p>

//                 {/* Départements entiers — Super Admin / Admin seulement */}
//                 {isSuperAdminOrAdmin && departements.length > 0 && (
//                   <DepartementPicker
//                     departements={departements}
//                     selected={form.departementIds}
//                     onChange={ids => setForm(f => ({ ...f, departementIds: ids }))}
//                   />
//                 )}

//                 {/* Participants individuels */}
//                 <ParticipantPicker
//                   employes={employes}
//                   selected={form.participantsIds}
//                   onChange={ids => setForm(f => ({ ...f, participantsIds: ids }))}
//                 />

//                 {/* Résumé */}
//                 {(form.participantsIds.length > 0 || form.departementIds.length > 0) && (
//                   <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', fontSize: 12, color: 'var(--text-muted)' }}>
//                     <Users size={12} style={{ display: 'inline', marginRight: 5 }} />
//                     {form.participantsIds.length > 0 && `${form.participantsIds.length} participant${form.participantsIds.length > 1 ? 's' : ''} individuel${form.participantsIds.length > 1 ? 's' : ''}`}
//                     {form.participantsIds.length > 0 && form.departementIds.length > 0 && ' · '}
//                     {form.departementIds.length > 0 && `${form.departementIds.length} département${form.departementIds.length > 1 ? 's' : ''} entier${form.departementIds.length > 1 ? 's' : ''}`}
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Rappel */}
//             <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)', border: '1px solid var(--border-muted)' }}>
//               <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: form.rappelActif ? 10 : 0 }}>
//                 <input type="checkbox" checked={form.rappelActif} onChange={setCheck('rappelActif')} style={{ accentColor: 'var(--color-primary)' }} />
//                 <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}><Bell size={12} /> Activer un rappel</span>
//               </label>
//               {form.rappelActif && (
//                 <Select label="Délai" value={form.minutesRappel} onChange={set('minutesRappel')} options={RAPPEL_OPTIONS} />
//               )}
//             </div>
//           </div>
//         </form>
//       </Modal>

//       {/* Modale détail jour */}
//       <DayModal
//         day={dayModal.day} events={dayModal.events} employes={employes}
//         open={dayModal.open}
//         onClose={() => setDayModal({ open: false, day: null, events: [] })}
//         onEdit={openEdit} onDelete={setDeleteItem} onNew={openCreate}
//         currentUserId={currentUser?.id} userRole={userRole} isAdmin={isAdmin}
//       />

//       {/* Confirmation suppression */}
//       <Confirm
//         open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
//         loading={deleting} title="Supprimer l'événement"
//         message={`Supprimer "${deleteItem?.titre}" ? Cette action est irréversible.`}
//         confirmLabel="Supprimer"
//       />
//     </div>
//   );
// }