// Documents.jsx — version finale complète
import { useState, useEffect, useRef } from 'react';
import {
  Upload, Download, Trash2, Pencil, File, FileText,
  Image, Archive, Send, Eye, X, UserCheck, User
} from 'lucide-react';
import { documentApi, employerApi, authApi } from '../api';
import { useAuth } from '../contexts/Authcontext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  PageHeader, Card, Badge, Button, Modal, Input, Select,
  Confirm, SearchInput, Avatar, FormRow, Textarea
} from '../components/ui';
import toast from 'react-hot-toast';

// ── Constantes ───────────────────────────────────────────────────────────────
const TYPES = ['CONTRAT','RAPPORT','FACTURE','PRESENTATION','IMAGE','AUTRE'];
const TYPE_ICON = {
  CONTRAT: FileText, RAPPORT: FileText, FACTURE: FileText,
  PRESENTATION: File, IMAGE: Image, AUTRE: File,
};
const TYPE_COLOR = {
  CONTRAT:      'var(--color-primary)',
  RAPPORT:      'var(--color-info)',
  FACTURE:      'var(--color-success)',
  PRESENTATION: 'var(--color-warning)',
  IMAGE:        'var(--color-accent)',
  AUTRE:        'var(--text-muted)',
};

// ── Utilitaires ──────────────────────────────────────────────────────────────
function bytesToSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Hook: recherche employés avec debounce ───────────────────────────────────
function useEmployeeSearch(query, skip = false) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (skip || !query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await employerApi.getAll({ search: query.trim(), size: 10, page: 0 });
        const d = r.data?.data || r.data;
        setResults(Array.isArray(d) ? d : d?.content || []);
      } catch { setResults([]); }
      finally   { setLoading(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query, skip]);

  return { results, loading };
}

// ── PreviewModal ─────────────────────────────────────────────────────────────
function PreviewModal({ doc, open, onClose, onDownload }) {
  const [blobUrl,      setBlobUrl]      = useState(null);
  const [textContent,  setTextContent]  = useState(null);
  const [loadingBlob,  setLoadingBlob]  = useState(false);

  useEffect(() => {
    if (!open || !doc) { setBlobUrl(null); setTextContent(null); return; }
    setLoadingBlob(true);
    documentApi.download(doc.id)
      .then(async res => {
        const mime = doc.typeMime || '';
        const blob = new Blob([res.data], { type: mime || 'application/octet-stream' });
        const url  = URL.createObjectURL(blob);
        setBlobUrl(url);
        if (
          mime.startsWith('text/') ||
          /\.(txt|csv|json|xml|md|log|yml|yaml|html|css|js|ts|jsx|tsx)$/i.test(doc.nom)
        ) {
          setTextContent(await blob.text());
        }
      })
      .catch(() => toast.error('Impossible de charger le fichier'))
      .finally(() => setLoadingBlob(false));

    return () => {
      setBlobUrl(u => { if (u) URL.revokeObjectURL(u); return null; });
    };
  }, [open, doc?.id]);

  if (!open || !doc) return null;

  const mime    = doc.typeMime || '';
  const nom     = doc.nom || '';
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(nom);
  const isPdf   = mime === 'application/pdf'  || /\.pdf$/i.test(nom);
  const isVideo = mime.startsWith('video/')   || /\.(mp4|webm|ogg|mov|avi)$/i.test(nom);
  const isAudio = mime.startsWith('audio/')   || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(nom);
  const isText  = textContent !== null;
  const Icon    = TYPE_ICON[doc.type] || File;
  const color   = TYPE_COLOR[doc.type] || 'var(--text-muted)';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
          width: '100%', maxWidth: 900, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}
      >
        {/* En-tête */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px', borderBottom: '1px solid var(--border-default)', flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={17} style={{ color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-all', margin: 0 }}>
              {doc.nom}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
              <Badge size="sm" style={{ background: `${color}18`, color }}>{doc.type}</Badge>
              {doc.taille && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bytesToSize(doc.taille)}</span>}
              {mime && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{mime}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button variant="secondary" size="sm" onClick={() => onDownload(doc)}>
              <Download size={14} /> Télécharger
            </Button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', background: 'var(--bg-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div style={{
          flex: 1, overflow: 'auto', display: 'flex',
          alignItems: (isImage || isPdf || isVideo || isAudio) ? 'center' : 'flex-start',
          justifyContent: 'center',
          background: 'var(--bg-muted)', minHeight: 300,
        }}>
          {loadingBlob ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '3px solid var(--border-default)',
                borderTopColor: 'var(--color-primary)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</span>
            </div>
          ) : blobUrl && isImage ? (
            <img src={blobUrl} alt={nom} style={{ maxWidth: '100%', maxHeight: '76vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', padding: 12 }} />
          ) : blobUrl && isPdf ? (
            <iframe src={blobUrl} title={nom} style={{ width: '100%', height: '76vh', border: 'none' }} />
          ) : blobUrl && isVideo ? (
            <video controls src={blobUrl} style={{ maxWidth: '100%', maxHeight: '76vh', borderRadius: 'var(--radius-md)', padding: 12 }} />
          ) : blobUrl && isAudio ? (
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={32} style={{ color }} />
              </div>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{nom}</p>
              <audio controls src={blobUrl} style={{ width: 340 }} />
            </div>
          ) : blobUrl && isText ? (
            <pre style={{
              width: '100%', margin: 0, padding: '16px 20px',
              fontSize: 13, fontFamily: 'monospace', lineHeight: 1.6,
              color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              background: 'transparent', overflowX: 'auto',
            }}>{textContent}</pre>
          ) : blobUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 48 }}>
              <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-xl)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={40} style={{ color }} />
              </div>
              <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{nom}</p>
              {doc.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 360 }}>{doc.description}</p>}
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aperçu non disponible pour ce format.</p>
              <Button onClick={() => onDownload(doc)}><Download size={14} /> Télécharger pour ouvrir</Button>
            </div>
          ) : null}
        </div>

        {doc.description && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-default)', flexShrink: 0 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{doc.description}</p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── EmployeeDropdown ─────────────────────────────────────────────────────────
function EmployeeDropdown({ value, onSelect, currentUser, placeholder = 'Rechercher un employé…', label }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const { results, loading } = useEmployeeSearch(query);
  const containerRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (!value) setQuery(''); }, [value]);

  const handleSelect = (emp) => { onSelect(emp); setQuery(emp.name); setOpen(false); };
  const handleSelf   = () => {
    if (!currentUser) return;
    onSelect(currentUser); setQuery(currentUser.name); setOpen(false);
  };
  const handleClear  = () => { onSelect(null); setQuery(''); setOpen(false); };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 2,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', zIndex: 9999,
          border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)', maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {/* Moi-même */}
          {currentUser && (
            <div
              onClick={handleSelf}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                cursor: 'pointer', borderBottom: '1px solid var(--border-muted)',
                background: value?.id === currentUser.id ? 'var(--color-primary-light)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              onMouseLeave={e => e.currentTarget.style.background = value?.id === currentUser.id ? 'var(--color-primary-light)' : 'transparent'}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={14} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>Moi-même</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.name} · {currentUser.email}
                </p>
              </div>
              {value?.id === currentUser.id && <UserCheck size={13} style={{ color: 'var(--color-primary)', marginLeft: 'auto', flexShrink: 0 }} />}
            </div>
          )}

          {loading && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Recherche…</div>}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Aucun résultat</p>
          )}

          {results.filter(e => !currentUser || e.id !== currentUser.id).map(emp => (
            <div
              key={emp.id}
              onClick={() => handleSelect(emp)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                cursor: 'pointer', borderBottom: '1px solid var(--border-muted)',
                background: value?.id === emp.id ? 'var(--color-primary-light)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              onMouseLeave={e => e.currentTarget.style.background = value?.id === emp.id ? 'var(--color-primary-light)' : 'transparent'}
            >
              <Avatar name={emp.name} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</p>
                {emp.email && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</p>}
              </div>
              {value?.id === emp.id && <UserCheck size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
            </div>
          ))}

          {query.trim().length < 2 && !loading && (
            <p style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {currentUser ? 'Ou tapez au moins 2 caractères pour rechercher…' : 'Tapez au moins 2 caractères pour rechercher…'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── SelectedEmployeeChip ─────────────────────────────────────────────────────
function SelectedEmployeeChip({ employee, onClear }) {
  if (!employee) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 'var(--radius-md)',
      background: 'var(--color-primary-light)', border: '1px solid var(--color-primary)40',
    }}>
      <Avatar name={employee.name} size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {employee.name}
        </span>
        {employee.email && (
          <span style={{ fontSize: 11, color: 'var(--color-primary)', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {employee.email}
          </span>
        )}
      </div>
      <UserCheck size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
      {onClear && (
        <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', padding: 2, flexShrink: 0 }}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ── TransferModal (depuis une DocCard existante) ─────────────────────────────
function TransferModal({ doc, open, onClose }) {
  const { user }                   = useAuth();
  const { notifyDocumentTransfer } = useNotifications();
  const [recipient, setRecipient]  = useState(null);
  const [message,   setMessage]    = useState('');
  const [sending,   setSending]    = useState(false);

  useEffect(() => { if (open) { setRecipient(null); setMessage(''); } }, [open]);

  const handleSend = async () => {
    if (!recipient) { toast.error('Veuillez sélectionner un destinataire'); return; }
    setSending(true);
    try {
      if (documentApi.transfer) {
        await documentApi.transfer(doc.id, { recipientId: recipient.id, message });
      } else {
        // Mock si l'endpoint n'existe pas encore
        await new Promise(r => setTimeout(r, 800));
      }

      // ── Notifications ciblées : expéditeur + destinataire uniquement ──
      notifyDocumentTransfer({
        doc:       { id: doc.id, nom: doc.nom },
        sender:    { id: user.id,       name: user.name       },
        recipient: { id: recipient.id,  name: recipient.name  },
      });

      toast.success(`Document transféré à ${recipient.name}`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur lors du transfert');
    } finally { setSending(false); }
  };

  if (!open || !doc) return null;
  const color = TYPE_COLOR[doc.type] || 'var(--text-muted)';
  const Icon  = TYPE_ICON[doc.type]  || File;

  return (
    <Modal
      open={open} onClose={onClose}
      title="Transférer le document" width={500}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSend} loading={sending} disabled={!recipient}>
            <Send size={14} /> Transférer
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Résumé doc */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-muted)', border: '1px solid var(--border-muted)',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={17} style={{ color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-word', margin: 0 }}>{doc.nom}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
              <Badge size="sm" style={{ background: `${color}18`, color }}>{doc.type}</Badge>
              {doc.taille && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bytesToSize(doc.taille)}</span>}
            </div>
          </div>
        </div>

        <EmployeeDropdown
          label="Destinataire *"
          value={recipient}
          onSelect={setRecipient}
          placeholder="Rechercher un employé…"
        />

        {recipient && <SelectedEmployeeChip employee={recipient} onClear={() => setRecipient(null)} />}

        <Textarea
          label="Message (optionnel)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ajouter un message au destinataire…"
          rows={3}
        />
      </div>
    </Modal>
  );
}

// ── DocCard ──────────────────────────────────────────────────────────────────
function DocCard({ doc, onEdit, onDelete, onDownload, onPreview, onTransfer }) {
  const Icon  = TYPE_ICON[doc.type]  || File;
  const color = TYPE_COLOR[doc.type] || 'var(--text-muted)';

  return (
    <div
      style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: 16,
        border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-word', overflowWrap: 'break-word', margin: 0 }}>
            {doc.nom}
          </p>
          {doc.description && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {doc.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge size="sm" style={{ background: `${color}18`, color }}>{doc.type}</Badge>
            {doc.taille && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bytesToSize(doc.taille)}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-muted)' }}>
        {doc.employerName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, marginRight: 8 }}>
            <Avatar name={doc.employerName} size={20} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.employerName}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => onPreview(doc)}  title="Visualiser"   style={{ color: 'var(--color-info)'    }}><Eye      size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => onTransfer(doc)} title="Transférer"   style={{ color: 'var(--color-primary)' }}><Send     size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => onDownload(doc)} title="Télécharger"                                          ><Download  size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(doc)}     title="Modifier"                                             ><Pencil   size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(doc)}   title="Supprimer"    style={{ color: 'var(--color-danger)'  }}><Trash2   size={14} /></Button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function Documents() {
  const { user }                   = useAuth();
  const { notifyDocumentTransfer } = useNotifications();

  const [data,             setData]             = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState('');
  const [filterType,       setFilterType]       = useState('');
  const [uploadOpen,       setUploadOpen]       = useState(false);
  const [editItem,         setEditItem]         = useState(null);
  const [deleteItem,       setDeleteItem]       = useState(null);
  const [previewDoc,       setPreviewDoc]       = useState(null);
  const [transferDoc,      setTransferDoc]      = useState(null);
  const [file,             setFile]             = useState(null);
  const [isDragging,       setIsDragging]       = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [uploadTab,        setUploadTab]        = useState('upload');
  const [transferRecipient,setTransferRecipient]= useState(null);
  const [transferMessage,  setTransferMessage]  = useState('');
  const [form,             setForm]             = useState({ nom: '', description: '', type: 'AUTRE', publique: false });
  const [editForm,         setEditForm]         = useState({ nom: '', description: '', type: 'AUTRE', publique: false });
  const [saving,           setSaving]           = useState(false);
  const [deleting,         setDeleting]         = useState(false);
  const [currentUser,      setCurrentUser]      = useState(null);
  const fileRef = useRef();

  // ── Charger le profil courant ────────────────────────────────────────────
  useEffect(() => {
    // On préfère utiliser le user du contexte Auth directement
    if (user) { setCurrentUser(user); return; }
    authApi.profile()
      .then(r => setCurrentUser(r.data?.data || r.data))
      .catch(() => {});
  }, [user]);

  // ── Charger les documents (filtré selon le rôle côté API) ────────────────
  const load = async () => {
    setLoading(true);
    try {
      let res;
      const role = user?.roleName;

      if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER') {
        res = await documentApi.getAll({ page: 0, size: 100 });
      } else {
        // STAFF / STAGIAIRE → uniquement ses propres documents
        res = await documentApi.getByEmployer(user?.id);
      }

      const d = res.data?.data || res.data;
      setData(Array.isArray(d) ? d : d?.content || []);
    } catch { toast.error('Erreur chargement'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user?.id]);

  // ── Filtres locaux ───────────────────────────────────────────────────────
  const filtered = data.filter(d =>
    (!search     || d.nom?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || d.type === filterType)
  );

  // ── Reset modal upload ───────────────────────────────────────────────────
  const resetUploadModal = () => {
    setFile(null);
    setSelectedEmployee(null);
    setTransferRecipient(null);
    setTransferMessage('');
    setForm({ nom: '', description: '', type: 'AUTRE', publique: false });
    setUploadTab('upload');
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setForm(prev => ({ ...prev, nom: prev.nom || f.name })); }
  };

  // ── Upload (+ transfert optionnel + notification) ────────────────────────
  const handleUpload = async (e) => {
    e?.preventDefault();
    if (!file) { toast.error('Veuillez sélectionner un fichier'); return; }
    setSaving(true);
    try {
      const payload = {
        nom:        form.nom || file.name,
        description:form.description || '',
        type:       form.type || 'AUTRE',
        publique:   form.publique || false,
        employerId: selectedEmployee?.id ?? currentUser?.id ?? null,
      };

      const fd = new FormData();
      fd.append('document', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      fd.append('fichier', file, file.name);

      const uploadRes  = await documentApi.upload(fd);
      const uploadedDoc = uploadRes.data?.data || uploadRes.data;

      toast.success('Document uploadé avec succès');

      // ── Transfert + notification ciblée ──────────────────────────────
      if (uploadTab === 'transfer' && transferRecipient) {
        try {
          if (documentApi.transfer) {
            await documentApi.transfer(uploadedDoc?.id, {
              recipientId: transferRecipient.id,
              message:     transferMessage,
            });
          }

          notifyDocumentTransfer({
            doc:       { id: uploadedDoc?.id, nom: form.nom || file.name },
            sender:    { id: user.id,              name: user.name              },
            recipient: { id: transferRecipient.id, name: transferRecipient.name },
          });

          toast.success(`Document transféré à ${transferRecipient.name}`);
        } catch {
          toast.error('Upload réussi mais transfert échoué');
        }
      }

      setUploadOpen(false);
      resetUploadModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Erreur lors de l'upload");
    } finally { setSaving(false); }
  };

  // ── Édition ──────────────────────────────────────────────────────────────
  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await documentApi.update(editItem.id, editForm);
      toast.success('Document modifié');
      setEditItem(null); load();
    } catch { toast.error('Erreur modification'); }
    finally  { setSaving(false); }
  };

  // ── Suppression ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await documentApi.delete(deleteItem.id);
      toast.success('Document supprimé');
      setDeleteItem(null); load();
    } catch { toast.error('Erreur suppression'); }
    finally  { setDeleting(false); }
  };

  // ── Téléchargement ───────────────────────────────────────────────────────
  const handleDownload = async (doc) => {
    try {
      const res = await documentApi.download(doc.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href = url; a.download = doc.nom; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur téléchargement'); }
  };

  const openEdit = (doc) => {
    setEditItem(doc);
    setEditForm({ nom: doc.nom || '', description: doc.description || '', type: doc.type || 'AUTRE', publique: doc.publique || false });
  };

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));

  const tabStyle = (active) => ({
    padding: '8px 18px', fontSize: 13, fontWeight: 600,
    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
    background: active ? 'var(--color-primary)' : 'transparent',
    color:      active ? '#fff' : 'var(--text-secondary)',
    transition: 'all 0.15s',
  });

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Documents" subtitle={`${data.length} document${data.length !== 1 ? 's' : ''}`}>
        <Button onClick={() => { resetUploadModal(); setUploadOpen(true); }}>
          <Upload size={16} /> Uploader un document
        </Button>
      </PageHeader>

      {/* Filtres par type */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterType('')}
          style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)', background: !filterType ? 'var(--color-primary)' : 'var(--bg-surface)', color: !filterType ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
        >
          Tous ({data.length})
        </button>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilterType(filterType === t ? '' : t)}
            style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', border: `1px solid ${TYPE_COLOR[t]}40`, background: filterType === t ? TYPE_COLOR[t] : 'var(--bg-surface)', color: filterType === t ? '#fff' : TYPE_COLOR[t], cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
          >
            {t} ({data.filter(d => d.type === t).length})
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un document…" style={{ flex: '1 1 240px', maxWidth: 380 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grille */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ height: 140, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', border: '1px solid var(--border-default)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Archive size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)' }}>Aucun document trouvé</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {filtered.map(doc => (
            <DocCard
              key={doc.id} doc={doc}
              onEdit={openEdit}       onDelete={setDeleteItem}
              onDownload={handleDownload} onPreview={setPreviewDoc}
              onTransfer={setTransferDoc}
            />
          ))}
        </div>
      )}

      {/* ── Modal upload ── */}
      <Modal
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); resetUploadModal(); }}
        title="Uploader un document"
        width={600}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { setUploadOpen(false); resetUploadModal(); }}>Annuler</Button>
            <Button onClick={handleUpload} loading={saving} disabled={!file}>
              <Upload size={14} />
              {uploadTab === 'transfer' && transferRecipient ? 'Uploader & Transférer' : 'Uploader'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Onglets */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', padding: 4 }}>
            <button style={tabStyle(uploadTab === 'upload')} onClick={() => setUploadTab('upload')}>
              <Upload size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />Upload
            </button>
            <button style={tabStyle(uploadTab === 'transfer')} onClick={() => setUploadTab('transfer')}>
              <Send size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />Upload &amp; Transférer
            </button>
          </div>

          {/* Zone drop */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-lg)', padding: '24px 20px', textAlign: 'center',
              cursor: 'pointer', background: isDragging ? 'var(--color-primary-light)' : 'var(--bg-muted)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <input
              ref={fileRef} type="file" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files[0];
                if (f) { setFile(f); setForm(prev => ({ ...prev, nom: prev.nom || f.name })); }
              }}
            />
            <Upload size={26} style={{ color: isDragging ? 'var(--color-primary)' : 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
            <p style={{ color: isDragging ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: 600, margin: 0, wordBreak: 'break-all' }}>
              {file ? file.name : 'Glisser-déposer ou cliquer pour sélectionner'}
            </p>
            {file && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{bytesToSize(file.size)}</p>}
          </div>

          <FormRow>
            <Input label="Nom *" value={form.nom} onChange={setF('nom')} required placeholder="Nom du document" />
            <Select label="Type" value={form.type} onChange={setF('type')} options={TYPES.map(t => ({ value: t, label: t }))} />
          </FormRow>

          <Textarea label="Description" value={form.description} onChange={setF('description')} placeholder="Description du document…" rows={2} />

          <EmployeeDropdown
            label="Associer à un employé"
            value={selectedEmployee}
            onSelect={setSelectedEmployee}
            currentUser={currentUser}
            placeholder="Rechercher un employé ou choisir moi-même…"
          />
          {selectedEmployee && <SelectedEmployeeChip employee={selectedEmployee} onClear={() => setSelectedEmployee(null)} />}

          {/* Section transfert */}
          {uploadTab === 'transfer' && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              padding: '14px 16px', borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-primary)40',
              background: 'var(--color-primary-light)',
            }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={13} /> Transférer après upload
              </p>
              <EmployeeDropdown
                label="Destinataire du transfert"
                value={transferRecipient}
                onSelect={setTransferRecipient}
                currentUser={currentUser}
                placeholder="Rechercher le destinataire…"
              />
              {transferRecipient && <SelectedEmployeeChip employee={transferRecipient} onClear={() => setTransferRecipient(null)} />}
              <Textarea
                label="Message (optionnel)"
                value={transferMessage}
                onChange={e => setTransferMessage(e.target.value)}
                placeholder="Message au destinataire…"
                rows={2}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal édition ── */}
      <Modal
        open={!!editItem} onClose={() => setEditItem(null)}
        title="Modifier le document" width={480}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setEditItem(null)}>Annuler</Button>
            <Button onClick={handleEdit} loading={saving}>Enregistrer</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input    label="Nom"         value={editForm.nom}         onChange={e => setEditForm(f => ({ ...f, nom:         e.target.value }))} placeholder="Nom du document" />
          <Select   label="Type"        value={editForm.type}        onChange={e => setEditForm(f => ({ ...f, type:        e.target.value }))} options={TYPES.map(t => ({ value: t, label: t }))} />
          <Textarea label="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description…" />
        </div>
      </Modal>

      <Confirm
        open={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete}
        loading={deleting} title="Supprimer le document"
        message={`Supprimer "${deleteItem?.nom}" ? Le fichier sera définitivement supprimé.`}
        confirmLabel="Supprimer"
      />

      <PreviewModal  doc={previewDoc}  open={!!previewDoc}  onClose={() => setPreviewDoc(null)}  onDownload={handleDownload} />
      <TransferModal doc={transferDoc} open={!!transferDoc} onClose={() => setTransferDoc(null)} />
    </div>
  );
}