// components/CustomToast.jsx
import { toast } from 'react-hot-toast';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export const showToast = (type, message, options = {}) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  };

  const Icon = icons[type] || Info;

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
        borderLeft: `4px solid ${colors[type]}`,
        minWidth: 300,
        maxWidth: 400,
      }}
    >
      <div style={{ color: colors[type] }}>
        <Icon size={18} />
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