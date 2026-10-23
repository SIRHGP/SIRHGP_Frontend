// AssistantPanel.jsx — panneau latéral flottant de l'Assistant SIRHGP.
// Disponible sur toutes les pages (monté dans Layout), ne masque pas l'interface.
// Toutes les actions passent par le moteur (assistant/engine.js) qui utilise
// uniquement les services API existants (src/Api.js).

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/Authcontext';
import { useAssistant } from '../../contexts/AssistantContext';
import { handleInstruction, apiErrorToMessage } from '../../assistant/engine';

const WELCOME = {
  role: 'assistant', kind: 'text',
  text: '🤖 Bonjour ! Je suis l’Assistant SIRHGP.\nJe pilote la plateforme via les API existantes.\nTapez « aide » pour voir des exemples.',
};

export default function AssistantPanel() {
  const { user, hasMinRole } = useAuth();
  const navigate = useNavigate();
  const { assistantOpen: open, setAssistantOpen: setOpen } = useAssistant();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);   // conversation en cours (champ manquant / confirmation)
  const listRef = useRef(null);

  const scrollToEnd = () => { requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })); };
  useEffect(() => { scrollToEnd(); }, [messages]);

  const push = useCallback((msgs) => {
    setMessages(prev => [...prev, ...msgs.map(m => ({ role: 'assistant', ...m }))]);
  }, []);

  const send = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', kind: 'text', text }]);
    setBusy(true);
    try {
      const result = await handleInstruction(text, { user, navigate, hasMinRole }, pending);
      setPending(result.pending || null);
      push(result.messages || [{ kind: 'text', text: '…' }]);
    } catch (err) {
      setPending(null);
      push([{ kind: 'error', text: apiErrorToMessage(err) }]);
    } finally {
      setBusy(false);
      scrollToEnd();
    }
  };

  /* Bouton flottant quand le panneau est fermé */
  if (!open) return (
    <button onClick={() => setOpen(true)} title="Assistant SIRHGP"
      style={{
        position:'fixed', bottom:24, right:24, zIndex:1200,
        width:56, height:56, borderRadius:'50%', border:'none', cursor:'pointer',
        background:'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
        color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'var(--shadow-elevated)', transition:'transform var(--transition-fast)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
    >
      <Bot size={26} />
    </button>
  );

  return (
    <div style={{
      position:'fixed', top:0, right:0, bottom:0, zIndex:1250,
      width:380, maxWidth:'100vw',
      background:'var(--bg-surface)',
      borderLeft:'1px solid var(--border-default)',
      boxShadow:'var(--shadow-elevated)',
      display:'flex', flexDirection:'column',
      animation:'slideIn 0.25s ease',
    }}>
      {/* En-tête */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border-default)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div className="tone-icon tone-primary" style={{ width:34, height:34 }}><Bot size={18} /></div>
        <div style={{ flex:1 }}>
          <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, margin:0, color:'var(--text-primary)' }}>Assistant SIRHGP</p>
          <p style={{ fontSize:11, margin:0, color:'var(--text-muted)' }}>Automatisation via les API existantes</p>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Fermer l’assistant"
          style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', padding:6, borderRadius:'var(--radius-md)', display:'flex' }}>
          <X size={18} />
        </button>
      </div>

      {/* Historique */}
      <div ref={listRef} className="no-scrollbar" style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12, background:'var(--bg-base)' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'stretch', maxWidth:'100%' }}>
            <div style={{
              background: m.role === 'user' ? 'var(--color-primary)' : 'var(--bg-surface)',
              color: m.role === 'user' ? '#fff' : m.kind === 'error' ? 'var(--color-danger)' : m.kind === 'success' ? 'var(--color-success)' : 'var(--text-primary)',
              border: m.role === 'user' ? 'none' : `1px solid ${m.kind === 'error' ? 'var(--color-danger)' : m.kind === 'success' ? 'var(--color-success)' : 'var(--border-default)'}`,
              borderRadius: m.role === 'user' ? 'var(--radius-lg) var(--radius-lg) 6px var(--radius-lg)' : 'var(--radius-lg)',
              padding:'10px 14px', fontSize:13, lineHeight:1.55,
              whiteSpace:'pre-wrap', boxShadow:'var(--shadow-xs)',
            }}>
              {/* support **gras** simple */}
              {m.text?.split('**').map((seg, j) => j % 2 === 1 ? <strong key={j}>{seg}</strong> : seg)}
            </div>

            {/* Liste de résultats réels du backend */}
            {m.kind === 'list' && m.items && (
              <ul style={{ margin:'8px 0 0', paddingLeft:18, fontSize:13, color:'var(--text-secondary)' }}>
                {m.items.map((it, j) => <li key={j} style={{ marginBottom:3 }}>{it}</li>)}
              </ul>
            )}
            {m.more && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{m.more}</p>}

            {/* Navigation vers les routes réelles */}
            {m.links && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                {m.links.map(l => (
                  <button key={l.to + l.label} onClick={() => navigate(l.to)}
                    style={{
                      border:'1px solid var(--color-primary)', background:'var(--bg-surface)', cursor:'pointer',
                      color:'var(--color-primary)', fontSize:12, fontWeight:600,
                      padding:'5px 10px', borderRadius:'var(--radius-md)', display:'inline-flex', alignItems:'center', gap:5,
                    }}>
                    <Sparkles size={12}/>{l.label}
                  </button>
                ))}
              </div>
            )}

            {/* Confirmation des opérations sensibles — AVANT tout appel API */}
            {m.kind === 'confirm' && pending?.awaiting === 'confirm' && i === messages.length - 1 && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onClick={() => send('Oui')}
                  style={{ flex:1, padding:'8px', border:'none', borderRadius:'var(--radius-md)', background:'var(--color-danger)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  Confirmer
                </button>
                <button onClick={() => send('Annuler')}
                  style={{ flex:1, padding:'8px', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', background:'var(--bg-muted)', color:'var(--text-secondary)', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                  Annuler
                </button>
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div style={{ alignSelf:'flex-start', color:'var(--text-muted)', fontSize:12, display:'flex', alignItems:'center', gap:8 }}>
            <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }} /> Vérification des données…
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <form onSubmit={e => { e.preventDefault(); send(); }}
        style={{ padding:12, borderTop:'1px solid var(--border-default)', display:'flex', gap:8, flexShrink:0 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Écrivez une instruction…"
          disabled={busy}
          style={{
            flex:1, padding:'10px 14px', borderRadius:'var(--radius-md)',
            border:'1px solid var(--border-default)', background:'var(--bg-muted)',
            color:'var(--text-primary)', fontSize:13, outline:'none', fontFamily:'var(--font-sans)',
          }}
          onFocus={e => e.currentTarget.style.borderColor='var(--color-primary)'}
          onBlur={e => e.currentTarget.style.borderColor='var(--border-default)'}
        />
        <button type="submit" disabled={busy || !input.trim()}
          style={{
            width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer',
            background:'var(--color-primary)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', opacity:(busy || !input.trim())?0.5:1,
          }}
          onMouseEnter={e => { if (!busy && input.trim()) e.currentTarget.style.filter='brightness(0.92)'; }}
          onMouseLeave={e => e.currentTarget.style.filter=''}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}