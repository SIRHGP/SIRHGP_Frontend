// pages/Documents.jsx
import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, Trash2, Pencil, File, FileText,
  Image, Archive, Send, Eye, X, LayoutGrid, List
} from 'lucide-react';
import { documentApi, employerApi, authApi, secretariatApi } from '../Api';
import { useAuth } from '../contexts/Authcontext';
import { useNotifications } from '../contexts/NotificationContext';
import { useSucursales } from '../hooks/useSucursales';
import { useDeferredTask } from '../hooks/useDeferredTask';
import {
  PageHeader, Card, Badge, Button, Modal, Input, Select,
  Confirm, SearchInput, Avatar, FormRow, Textarea, StatsGrid, StatCard, Skeleton, IconBox, SucursaleBadge, SucursaleField
} from '../components/ui';
import toast from 'react-hot-toast';

// Constantes
const TYPES = ['CONTRAT', 'RAPPORT', 'FACTURE', 'PRESENTATION', 'IMAGE', 'AUTRE'];
const TYPE_ICON = {
  CONTRAT: FileText, RAPPORT: FileText, FACTURE: FileText,
  PRESENTATION: File, IMAGE: Image, AUTRE: File,
};
const TYPE_COLOR = {
  CONTRAT: 'var(--color-primary)',
  RAPPORT: 'var(--color-info)',
  FACTURE: 'var(--color-success)',
  PRESENTATION: 'var(--color-warning)',
  IMAGE: 'var(--color-accent)',
  AUTRE: 'var(--text-muted)',
};

function bytesToSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function getDisplayName(doc, currentUserId) {
  const isExpéditeur = doc.expediteurId === currentUserId;
  if (isExpéditeur) {
    return { label: 'A', name: doc.destinataireNom || '—' };
  }
  return { label: 'De', name: doc.expediteurNom || '—' };
}

function useEmployeeSearch(query, isSecretary = false) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const termeSuffisant = Boolean(query && query.trim().length >= 2);

  useEffect(() => {
    if (!termeSuffisant) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = isSecretary ? await secretariatApi.employes() : await employerApi.getAll({ search: query.trim(), size: 10, page: 0 });
        const d = r.data?.data || r.data;
        const list = Array.isArray(d) ? d : d?.content || [];
        setResults(isSecretary ? list.filter(e => `${e.name || e.nom || ""}`.toLowerCase().includes(query.trim().toLowerCase())) : list);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query, isSecretary, termeSuffisant]);

  return { results: termeSuffisant ? results : [], loading: termeSuffisant && loading };
}
function EmployeeDropdown({ value, onSelect, excludeId, placeholder = 'Rechercher…', label, isSecretary = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading } = useEmployeeSearch(query, isSecretary);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = results.filter(e => !excludeId || e.id !== excludeId);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        {value && (
          <button type="button" onClick={() => { onSelect(null); setQuery(''); setOpen(false); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 9999, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {loading && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Recherche…</div>}
          {!loading && query.trim().length >= 2 && filtered.length === 0 && (
            <p style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Aucun resultat</p>
          )}
          {filtered.map(emp => (
            <div key={emp.id} onClick={() => { onSelect(emp); setQuery(emp.name); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-muted)', background: value?.id === emp.id ? 'var(--color-primary-light)' : 'transparent' }}>
              <Avatar name={emp.name} size={28} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{emp.name}</p>
                {emp.email && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{emp.email}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LIST_COLS = '40px 2fr 110px 80px 150px 110px 170px';

function DocCard({ doc, currentUserId, onEdit, onDelete, onDownload, onPreview, onDispatch, viewMode, readOnly = false, canEdit = true, canDelete = true }) {
  const Icon = TYPE_ICON[doc.type] || File;
  const color = TYPE_COLOR[doc.type] || 'var(--text-muted)';
  const { label, name } = getDisplayName(doc, currentUserId);

  if (viewMode === 'list') {
    return (
      <div
        style={{ display: 'grid', gridTemplateColumns: LIST_COLS, alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border-muted)', transition: 'background var(--transition-fast)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <IconBox icon={<Icon size={18} />} color={color} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</p>
          {doc.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.description}</p>}
        </div>
        <div><Badge size="sm" style={{ background: `${color}18`, color }}>{doc.type}</Badge></div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bytesToSize(doc.taille)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Avatar name={name} size={20} />
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{label}</span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{name}</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(doc.dateEnvoi || doc.dateCreation)}</div>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => onPreview(doc)} title="Visualiser" style={{ color: 'var(--color-info)' }}><Eye size={14} /></Button>
          {!readOnly && canEdit && <Button variant="ghost" size="sm" onClick={() => onDispatch(doc)} title="Dispatcher" style={{ color: 'var(--color-primary)' }}><Send size={14} /></Button>}
          <Button variant="ghost" size="sm" onClick={() => onDownload(doc)} title="Telecharger"><Download size={14} /></Button>
          {!readOnly && canEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(doc)} title="Modifier"><Pencil size={14} /></Button>}
          {!readOnly && canDelete && <Button variant="ghost" size="sm" onClick={() => onDelete(doc)} title="Supprimer" style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></Button>}
        </div>
      </div>
    );
  }

  return (
    <Card hover padding={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <IconBox icon={<Icon size={22} />} color={color} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-word', margin: 0 }}>{doc.nom}</p>
          {doc.description && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {doc.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge size="sm" style={{ background: `${color}18`, color }}>{doc.type}</Badge>
            {doc.taille && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bytesToSize(doc.taille)}</span>}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(doc.dateEnvoi || doc.dateCreation)}</span>
<SucursaleBadge sucursalNom={doc.sucursalNom} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-muted)' }}>
        <Avatar name={name} size={22} />
        <div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', lineHeight: 1 }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={() => onPreview(doc)} title="Visualiser" style={{ color: 'var(--color-info)' }}><Eye size={14} /></Button>
        {!readOnly && canEdit && <Button variant="ghost" size="sm" onClick={() => onDispatch(doc)} title="Dispatcher" style={{ color: 'var(--color-primary)' }}><Send size={14} /></Button>}
        <Button variant="ghost" size="sm" onClick={() => onDownload(doc)} title="Telecharger"><Download size={14} /></Button>
        {!readOnly && canEdit && <Button variant="ghost" size="sm" onClick={() => onEdit(doc)} title="Modifier"><Pencil size={14} /></Button>}
        {!readOnly && canDelete && <Button variant="ghost" size="sm" onClick={() => onDelete(doc)} title="Supprimer" style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></Button>}
      </div>
    </Card>
  );
}

function PreviewModal({ doc, open, onClose, onDownload, onDispatch, currentUserId, readOnly = false }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [blobDocId, setBlobDocId] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const currentBlobUrl = blobDocId === doc?.id ? blobUrl : null;
  const currentTextContent = blobDocId === doc?.id ? textContent : null;
  const loadingBlob = Boolean(open && doc && blobDocId !== doc.id);
  const previewId = doc?.id;
  const previewMime = doc?.typeMime;
  const previewName = doc?.nom;

  useEffect(() => {
    if (!open || !previewId) return;
    let cancelled = false;
    let objectUrl = null;
    documentApi.download(previewId)
      .then(async res => {
        const mime = previewMime || '';
        const blob = new Blob([res.data], { type: mime || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        objectUrl = url;
        const text = mime.startsWith('text/') || /\.(txt|csv|json|xml|md|log|yml|yaml|html|css|js|ts|jsx|tsx)$/i.test(previewName || '')
          ? await blob.text()
          : null;
        if (cancelled) { URL.revokeObjectURL(url); return; }
        setBlobDocId(previewId);
        setBlobUrl(url);
        setTextContent(text);
      })
      .catch(err => { if (!cancelled) toast.error(err.response?.data?.message || 'Impossible de charger le fichier'); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, previewId, previewMime, previewName]);

  if (!open || !doc) return null;

  const mime = doc.typeMime || '';
  const nom = doc.nom || '';
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(nom);
  const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(nom);
  const isVideo = mime.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(nom);
  const isAudio = mime.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(nom);
  const isText = currentTextContent !== null;
  const Icon = TYPE_ICON[doc.type] || File;
  const color = TYPE_COLOR[doc.type] || 'var(--text-muted)';
  const { label, name } = getDisplayName(doc, currentUserId);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
          <IconBox icon={<Icon size={17} />} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{doc.nom}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
              <Badge size="sm" style={{ background: `${color}18`, color }}>{doc.type}</Badge>
              {doc.taille && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bytesToSize(doc.taille)}</span>}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {label} : <strong>{name}</strong> <SucursaleBadge sucursalNom={doc.sucursalNom} />
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!readOnly && <Button variant="ghost" size="sm" onClick={() => { onClose(); onDispatch(doc); }} style={{ color: 'var(--color-primary)' }}><Send size={14} /> Dispatcher</Button>}
            <Button variant="secondary" size="sm" onClick={() => onDownload(doc)}><Download size={14} /> Telecharger</Button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={15} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', minHeight: 300 }}>
          {loadingBlob ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', border: '3px solid var(--border-default)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</span>
            </div>
          ) : currentBlobUrl && isImage ? (
            <img src={currentBlobUrl} alt={nom} style={{ maxWidth: '100%', maxHeight: '76vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', padding: 12 }} />
          ) : currentBlobUrl && isPdf ? (
            <iframe src={currentBlobUrl} title={nom} style={{ width: '100%', height: '76vh', border: 'none' }} />
          ) : currentBlobUrl && isVideo ? (
            <video controls src={currentBlobUrl} style={{ maxWidth: '100%', maxHeight: '76vh', borderRadius: 'var(--radius-md)', padding: 12 }} />
          ) : currentBlobUrl && isAudio ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon size={32} style={{ color }} />
              </div>
              <audio controls src={currentBlobUrl} style={{ width: 340 }} />
            </div>
          ) : currentBlobUrl && isText ? (
            <pre style={{ width: '100%', margin: 0, padding: '16px 20px', fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: 'transparent', overflowX: 'auto' }}>{currentTextContent}</pre>
          ) : currentBlobUrl ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-xl)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Icon size={40} style={{ color }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aperçu non disponible pour ce format.</p>
              <Button onClick={() => onDownload(doc)} style={{ marginTop: 16 }}><Download size={14} /> Telecharger</Button>
            </div>
          ) : null}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DispatchModal({ doc, open, onClose, currentUser, onSuccess }) {
  const { notifyDocumentTransfer } = useNotifications();
  const [recipient, setRecipient] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipient) { toast.error('Veuillez selectionner un destinataire'); return; }
    setSending(true);
    try {
      await documentApi.transfer(doc.id, { destinataireId: recipient.id });
      if (notifyDocumentTransfer) {
        notifyDocumentTransfer({
          doc: { id: doc.id, nom: doc.nom },
          sender: { id: currentUser.id, name: currentUser.name },
          recipient: { id: recipient.id, name: recipient.name },
        });
      }
      toast.success(`Document dispatche a ${recipient.name}`);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur lors du dispatch');
    } finally { setSending(false); }
  };

  if (!open || !doc) return null;
  const color = TYPE_COLOR[doc.type] || 'var(--text-muted)';
  const Icon = TYPE_ICON[doc.type] || File;

  return (
    <Modal open={open} onClose={onClose} title="Dispatcher le document" width={460}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSend} loading={sending} disabled={!recipient}><Send size={14} /> Dispatcher</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-muted)' }}>
          <IconBox icon={<Icon size={17} />} color={color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <Badge size="sm" style={{ background: `${color}18`, color }}>{doc.type}</Badge>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Expediteur : <strong>{currentUser?.name || '—'}</strong>
              </span>
            </div>
          </div>
        </div>
        <EmployeeDropdown
          label="Destinataire *"
          value={recipient}
          onSelect={setRecipient}
          excludeId={currentUser?.id}
          placeholder="Rechercher un employe…"
        />
      </div>
    </Modal>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const isSecretary = user?.roleName === 'SECRETAIRE';
  const readOnly = false;
  const { notifyDocument } = useNotifications();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const { showSucursal, optionsFiltre: sucursalFiltreOptions,
          optionsFormulaire: sucursalFormOptions, correspond: sucursalMatch,
          compteAncre, sucursalUtilisateurNom } = useSucursales();
  const [filterSuc, setFilterSuc] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [profileUser, setProfileUser] = useState(null);
  const currentUser = user || profileUser;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [dispatchDoc, setDispatchDoc] = useState(null);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [form, setForm] = useState({ nom: '', description: '', type: 'AUTRE', sucursalId: '' });
  const [editForm, setEditForm] = useState({ nom: '', description: '', type: 'AUTRE', sucursalId: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (user) return;
    authApi.profile().then(r => setProfileUser(r.data?.data || r.data)).catch(() => {});
  }, [user]);

  const load = async () => {
    try {
      const role = user?.roleName;
      let res;
      if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'SECRETAIRE') {
        res = await documentApi.getAll({ page: 0, size: 100 });
      } else {
        res = await documentApi.getMyDocuments({ page: 0, size: 100 });
      }
      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch (err) {
      console.error('Erreur chargement:', err);
      toast.error('Erreur chargement des documents');
    } finally { setLoading(false); }
  };

  useDeferredTask(() => { if (user) return load(); }, user?.id || 'no-user');

  const filtered = data.filter(d =>
    (!search || d.nom?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || d.type === filterType) &&
    sucursalMatch(d, filterSuc)
  );

  const resetUpload = () => {
    setFile(null);
    setRecipient(null);
    setForm({ nom: '', description: '', type: 'AUTRE', sucursalId: '' });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setForm(prev => ({ ...prev, nom: prev.nom || f.name })); }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Veuillez selectionner un fichier'); return; }
    if (!recipient) { toast.error('Veuillez selectionner un destinataire'); return; }
    setSaving(true);
    try {
      const payload = {
        nom: form.nom || file.name,
        description: form.description || '',
        type: form.type || 'AUTRE',
        publique: false,
        destinataireId: recipient.id,
        sucursalId: form.sucursalId ? Number(form.sucursalId) : null,
      };
      const response = await documentApi.upload(payload, file);
      
      notifyDocument({
        doc: { id: response.data?.id, nom: form.nom || file.name },
        action: 'uploaded',
        recipient,
        currentUser,
      });
      
      toast.success(`Document envoyé à ${recipient.name}`);
      setUploadOpen(false);
      resetUpload();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'upload");
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await documentApi.update(editItem.id, { ...editForm, publique: false, sucursalId: editForm.sucursalId ? Number(editForm.sucursalId) : null });
      
      notifyDocument({
        doc: { id: editItem.id, nom: editForm.nom },
        action: 'modified',
        currentUser,
      });
      
      toast.success('Document modifié');
      setEditItem(null);
      load();
    } catch { toast.error('Erreur modification'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await documentApi.delete(deleteItem.id);
      
      notifyDocument({
        doc: { nom: deleteItem.nom },
        action: 'deleted',
        currentUser,
      });
      
      toast.success('Document supprimé');
      setDeleteItem(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur suppression');
    } finally { setDeleting(false); }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await documentApi.download(doc.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = doc.nom; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur telechargement'); }
  };

  const openEdit = (doc) => {
    setEditItem(doc);
    setEditForm({ nom: doc.nom || '', description: doc.description || '', type: doc.type || 'AUTRE', sucursalId: doc.sucursalId ? String(doc.sucursalId) : '' });
  };

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const statsByType = TYPES.map(type => ({
    type, count: data.filter(d => d.type === type).length, color: TYPE_COLOR[type]
  }));

  const currentUserId = currentUser?.id;

  return (
    <div>
      <PageHeader title="Documents" subtitle={`${data.length} document${data.length !== 1 ? 's' : ''}`}>
        <Button onClick={() => { resetUpload(); setUploadOpen(true); }}>
          <Upload size={16} /> Envoyer un document
        </Button>
      </PageHeader>

      <StatsGrid>
        {/* Tous */}
        <StatCard
          title="Tous"
          value={data.length}
          icon={<FileText size={22} />}
          color="var(--color-primary)"
          onClick={() => setFilterType('')}
          active={!filterType}
        />
        {statsByType.map(({ type, count, color }) => (
          <StatCard
            key={type}
            title={type}
            value={count}
            icon={(() => { const I = TYPE_ICON[type] || File; return <I size={22} />; })()}
            color={color}
            onClick={() => setFilterType(filterType === type ? '' : type)}
            active={filterType === type}
          />
        ))}
      </StatsGrid>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un document…" />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {showSucursal && (
            <select value={filterSuc} onChange={e => setFilterSuc(e.target.value)} title="Filtrer par succursale d'origine" style={{ padding: '9px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>
              {sucursalFiltreOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} resultat{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')} style={{ padding: '8px 16px', border: 'none', background: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--bg-surface)', color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <LayoutGrid size={14} /> Grille
            </button>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 16px', border: 'none', borderLeft: '1px solid var(--border-default)', background: viewMode === 'list' ? 'var(--color-primary)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <List size={14} /> Liste
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} height={viewMode === 'grid' ? 160 : 64} radius="var(--radius-lg)" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Archive size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)' }}>Aucun document trouve</p>
          <Button variant="secondary" onClick={() => { resetUpload(); setUploadOpen(true); }} style={{ marginTop: 16 }}>Envoyer un document</Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(doc => (
            <DocCard key={doc.id} doc={doc} currentUserId={currentUserId} viewMode="grid"
              onEdit={openEdit} onDelete={setDeleteItem} onDownload={handleDownload}
              onPreview={setPreviewDoc} onDispatch={setDispatchDoc} readOnly={readOnly} canEdit={!isSecretary || String(doc.expediteurId) === String(currentUserId)} canDelete={!isSecretary} />
          ))}
        </div>
      ) : (
        <Card padding={0}>
          <div style={{ display: 'grid', gridTemplateColumns: LIST_COLS, alignItems: 'center', gap: 12, padding: '10px 20px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-default)', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div></div>
            <div>Nom</div>
            <div>Type</div>
            <div>Taille</div>
            <div>Interlocuteur</div>
            <div>Date</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>
          {filtered.map(doc => (
            <DocCard key={doc.id} doc={doc} currentUserId={currentUserId} viewMode="list"
              onEdit={openEdit} onDelete={setDeleteItem} onDownload={handleDownload}
              onPreview={setPreviewDoc} onDispatch={setDispatchDoc} readOnly={readOnly} canEdit={!isSecretary || String(doc.expediteurId) === String(currentUserId)} canDelete={!isSecretary} />
          ))}
        </Card>
      )}

      <Modal open={uploadOpen} onClose={() => { setUploadOpen(false); resetUpload(); }}
        title="Envoyer un document" width={560}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { setUploadOpen(false); resetUpload(); }}>Annuler</Button>
            <Button onClick={handleUpload} loading={saving} disabled={!file || !recipient}>
              <Send size={14} /> Envoyer
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{ border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-lg)', padding: '24px 20px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'var(--color-primary-light)' : 'var(--bg-muted)', transition: 'all var(--transition-fast)' }}
          >
            <input ref={fileRef} type="file" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setForm(prev => ({ ...prev, nom: prev.nom || f.name })); } }} />
            <Upload size={28} style={{ color: isDragging ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ color: isDragging ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>
              {file ? file.name : 'Glisser-deposer ou cliquer pour selectionner'}
            </p>
            {file && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{bytesToSize(file.size)}</p>}
          </div>

          <FormRow>
            <Input label="Nom *" value={form.nom} onChange={setF('nom')} placeholder="Nom du document" required />
            <Select label="Type" value={form.type} onChange={setF('type')} options={TYPES.map(t => ({ value: t, label: t }))} />
          </FormRow>

          <SucursaleField showSucursal={showSucursal} value={form.sucursalId} onChange={setF('sucursalId')}
            options={sucursalFormOptions} compteAncre={compteAncre} sucursalUtilisateurNom={sucursalUtilisateurNom} />

          <Textarea label="Description" value={form.description} onChange={setF('description')} placeholder="Description…" rows={2} />

          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)30', background: 'var(--color-primary-light)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={12} /> Destinataire <span style={{ color: 'var(--color-danger)' }}>*</span>
            </p>
            <EmployeeDropdown
              value={recipient}
              onSelect={setRecipient}
              excludeId={currentUser?.id}
              isSecretary={isSecretary}
              placeholder="Rechercher le destinataire…"
            />
          </div>
        </div>
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Modifier le document" width={460}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditItem(null)}>Annuler</Button>
            <Button onClick={handleEdit} loading={saving}>Enregistrer</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nom" value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom du document" />
          <Select label="Type" value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} options={TYPES.map(t => ({ value: t, label: t }))} />
          <SucursaleField showSucursal={showSucursal} value={editForm.sucursalId}
            onChange={e => setEditForm(f => ({ ...f, sucursalId: e.target.value }))}
            options={sucursalFormOptions} compteAncre={compteAncre} sucursalUtilisateurNom={sucursalUtilisateurNom} />
          <Textarea label="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description…" rows={3} />
        </div>
      </Modal>

      <Confirm open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} loading={deleting}
        title="Supprimer le document" message={`Supprimer "${deleteItem?.nom}" ? Cette action est definitive.`}
        confirmLabel="Supprimer" confirmVariant="danger" />

      <PreviewModal doc={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload} onDispatch={setDispatchDoc} currentUserId={currentUserId} readOnly={readOnly} />

      <DispatchModal key={dispatchDoc?.id || 'closed'} doc={dispatchDoc} open={!!dispatchDoc} onClose={() => setDispatchDoc(null)}
        currentUser={currentUser} onSuccess={load} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
