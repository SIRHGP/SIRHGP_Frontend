// constants/notificationTypes.js
export const NOTIF_TYPES = {
  // Documents
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_TRANSFERRED: 'DOCUMENT_TRANSFERRED',
  DOCUMENT_RECEIVED: 'DOCUMENT_RECEIVED',
  DOCUMENT_MODIFIED: 'DOCUMENT_MODIFIED',
  DOCUMENT_DELETED: 'DOCUMENT_DELETED',
  
  // Evenements
  EVENT_CREATED: 'EVENT_CREATED',
  EVENT_MODIFIED: 'EVENT_MODIFIED',
  EVENT_DELETED: 'EVENT_DELETED',
  EVENT_SHARED: 'EVENT_SHARED',
  
  // Factures
  FACTURE_CREATED: 'FACTURE_CREATED',
  FACTURE_MODIFIED: 'FACTURE_MODIFIED',
  FACTURE_VALIDATED: 'FACTURE_VALIDATED',
  FACTURE_DELETED: 'FACTURE_DELETED',
  
  // Taches
  TASK_CREATED: 'TASK_CREATED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_MODIFIED: 'TASK_MODIFIED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_DELETED: 'TASK_DELETED',
};

export const NOTIF_META = {
  [NOTIF_TYPES.DOCUMENT_UPLOADED]: {
    icon: '📄',
    color: '#6366F1',
    defaultTitle: 'Document uploade',
  },
  [NOTIF_TYPES.DOCUMENT_TRANSFERRED]: {
    icon: '📤',
    color: '#10B981',
    defaultTitle: 'Document transfere',
  },
  [NOTIF_TYPES.DOCUMENT_RECEIVED]: {
    icon: '📥',
    color: '#3B82F6',
    defaultTitle: 'Document recu',
  },
  [NOTIF_TYPES.DOCUMENT_MODIFIED]: {
    icon: '✏️',
    color: '#F59E0B',
    defaultTitle: 'Document modifie',
  },
  [NOTIF_TYPES.DOCUMENT_DELETED]: {
    icon: '🗑️',
    color: '#EF4444',
    defaultTitle: 'Document supprime',
  },
  [NOTIF_TYPES.EVENT_CREATED]: {
    icon: '📅',
    color: '#8B5CF6',
    defaultTitle: 'Evenement cree',
  },
  [NOTIF_TYPES.EVENT_MODIFIED]: {
    icon: '📅',
    color: '#F59E0B',
    defaultTitle: 'Evenement modifie',
  },
  [NOTIF_TYPES.EVENT_DELETED]: {
    icon: '🗑️',
    color: '#EF4444',
    defaultTitle: 'Evenement supprime',
  },
  [NOTIF_TYPES.EVENT_SHARED]: {
    icon: '🔔',
    color: '#6366F1',
    defaultTitle: 'Invitation recue',
  },
  [NOTIF_TYPES.FACTURE_CREATED]: {
    icon: '💰',
    color: '#10B981',
    defaultTitle: 'Facture creee',
  },
  [NOTIF_TYPES.FACTURE_MODIFIED]: {
    icon: '✏️',
    color: '#F59E0B',
    defaultTitle: 'Facture modifiee',
  },
  [NOTIF_TYPES.FACTURE_VALIDATED]: {
    icon: '✅',
    color: '#10B981',
    defaultTitle: 'Paiement enregistre',
  },
  [NOTIF_TYPES.FACTURE_DELETED]: {
    icon: '🗑️',
    color: '#EF4444',
    defaultTitle: 'Facture supprimee',
  },
  [NOTIF_TYPES.TASK_CREATED]: {
    icon: '✓',
    color: '#3B82F6',
    defaultTitle: 'Tache creee',
  },
  [NOTIF_TYPES.TASK_ASSIGNED]: {
    icon: '👤',
    color: '#8B5CF6',
    defaultTitle: 'Tache assignee',
  },
  [NOTIF_TYPES.TASK_MODIFIED]: {
    icon: '✏️',
    color: '#F59E0B',
    defaultTitle: 'Tache modifiee',
  },
  [NOTIF_TYPES.TASK_COMPLETED]: {
    icon: '🏆',
    color: '#10B981',
    defaultTitle: 'Tache terminee',
  },
  [NOTIF_TYPES.TASK_DELETED]: {
    icon: '🗑️',
    color: '#EF4444',
    defaultTitle: 'Tache supprimee',
  },
};