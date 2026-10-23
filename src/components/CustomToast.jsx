// components/CustomToast.jsx
// Toast personnalise : icone unique = cloche Lucide neutre (aucun emoji, aucune icone par type).
import { toast } from 'react-hot-toast';
import { Bell } from 'lucide-react';

const NEUTRAL = '#64748B';

export const showToast = (type, message, options = {}) => {
  return toast.custom((t) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        borderLeft: `4px solid ${NEUTRAL}`,
        minWidth: 300,
        maxWidth: 400,
      }}
    >
      <div style={{ color: NEUTRAL }}>
        <Bell size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, margin: 0 }}>{message}</p>
        {options.description && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {options.description}
          </p>
        )}
      </div>
      {options.action && (
        <button
          onClick={() => {
            toast.dismiss(t.id);
            options.action.onClick();
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {options.action.label}
        </button>
      )}
    </div>
  ), { duration: 4000 });
};