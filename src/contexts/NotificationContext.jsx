// contexts/NotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './Authcontext';

const NotificationContext = createContext(null);

// ── Types de notifications ───────────────────────────────────────────────────
export const NOTIF_TYPES = {
  DOCUMENT_SENT:     'DOCUMENT_SENT',     // X a envoyé un document à Y
  DOCUMENT_RECEIVED: 'DOCUMENT_RECEIVED', // Y a reçu un document de X
  TASK_ASSIGNED:     'TASK_ASSIGNED',     // Une tâche vous a été assignée
  TASK_UPDATED:      'TASK_UPDATED',      // Statut d'une tâche modifié
  FACTURE_CREATED:   'FACTURE_CREATED',   // Une facture vous concerne
  FACTURE_PAID:      'FACTURE_PAID',      // Une facture a été payée
  EVENT_INVITED:     'EVENT_INVITED',     // Invitation à un événement
};

const NOTIF_META = {
  DOCUMENT_SENT:     { icon: '📤', color: '#6366F1', label: 'Document envoyé'   },
  DOCUMENT_RECEIVED: { icon: '📥', color: '#10B981', label: 'Document reçu'     },
  TASK_ASSIGNED:     { icon: '✅', color: '#3B82F6', label: 'Tâche assignée'    },
  TASK_UPDATED:      { icon: '🔄', color: '#F59E0B', label: 'Tâche mise à jour' },
  FACTURE_CREATED:   { icon: '🧾', color: '#8B5CF6', label: 'Nouvelle facture'  },
  FACTURE_PAID:      { icon: '💰', color: '#10B981', label: 'Facture payée'     },
  EVENT_INVITED:     { icon: '📅', color: '#0EA5E9', label: 'Invitation'        },
};

// ── Clé localStorage par utilisateur ────────────────────────────────────────
function storageKey(userId) {
  return `sirhgp-notifs-${userId}`;
}

function loadNotifs(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifs(userId, notifs) {
  try {
    // Garder max 100 notifications
    const trimmed = notifs.slice(0, 100);
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  } catch {}
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // ── Charger les notifs de l'utilisateur courant au login ──
  useEffect(() => {
    if (user?.id) {
      const stored = loadNotifs(user.id);
      setNotifications(stored);
    } else {
      setNotifications([]);
    }
  }, [user?.id]);

  // ── Persister à chaque changement ──
  useEffect(() => {
    if (user?.id) {
      saveNotifs(user.id, notifications);
    }
  }, [notifications, user?.id]);

  // ── Écouter les notifs des AUTRES utilisateurs (simulation polling) ──
  // En production : remplacer par WebSocket ou SSE
  const pollRef = useRef(null);
  useEffect(() => {
    if (!user?.id) return;

    // Polling toutes les 5s : cherche les notifs entrants dans le "bus" partagé
    const checkIncoming = () => {
      const busKey = `sirhgp-notif-bus-${user.id}`;
      try {
        const raw = localStorage.getItem(busKey);
        if (!raw) return;
        const incoming = JSON.parse(raw);
        if (!incoming?.length) return;

        // Dépiler et ajouter aux notifs locales
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newOnes = incoming.filter(n => !existingIds.has(n.id));
          if (!newOnes.length) return prev;

          // Notification navigateur si permission accordée
          newOnes.forEach(n => {
            if (Notification.permission === 'granted') {
              new Notification(n.title, { body: n.body, icon: '/favicon.ico' });
            }
          });

          return [...newOnes, ...prev];
        });

        // Vider le bus après lecture
        localStorage.removeItem(busKey);
      } catch {}
    };

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    pollRef.current = setInterval(checkIncoming, 3000);
    return () => clearInterval(pollRef.current);
  }, [user?.id]);

  // ── Envoyer une notification à un autre utilisateur ──────────────────────
  // Cette fonction écrit dans le "bus" de l'autre utilisateur.
  // En production, ce serait un appel API → backend → WebSocket.
  const pushToUser = useCallback((targetUserId, notif) => {
    const busKey = `sirhgp-notif-bus-${targetUserId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(busKey) || '[]');
      existing.unshift({ ...notif, id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), read: false });
      localStorage.setItem(busKey, JSON.stringify(existing));
    } catch {}
  }, []);

  // ── Ajouter une notif locale (pour l'utilisateur courant) ────────────────
  const addNotification = useCallback((notif) => {
    const full = {
      id: `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notif,
    };
    setNotifications(prev => [full, ...prev]);
    return full;
  }, []);

  // ── Notifier 2 utilisateurs lors d'un transfert de document ──────────────
  const notifyDocumentTransfer = useCallback(({ doc, sender, recipient }) => {
    // Notif pour l'EXPÉDITEUR (confirmation)
    addNotification({
      type: NOTIF_TYPES.DOCUMENT_SENT,
      title: 'Document envoyé',
      body: `Vous avez transféré "${doc.nom}" à ${recipient.name}`,
      meta: { docId: doc.id, docNom: doc.nom, recipientId: recipient.id, recipientName: recipient.name },
    });

    // Notif pour le DESTINATAIRE (via bus)
    pushToUser(recipient.id, {
      type: NOTIF_TYPES.DOCUMENT_RECEIVED,
      title: 'Nouveau document reçu',
      body: `${sender.name} vous a envoyé "${doc.nom}"`,
      meta: { docId: doc.id, docNom: doc.nom, senderId: sender.id, senderName: sender.name },
    });
  }, [addNotification, pushToUser]);

  // ── Notifier lors d'une assignation de tâche ─────────────────────────────
  const notifyTaskAssigned = useCallback(({ task, assignedTo, assignedBy }) => {
    if (!assignedTo?.id || assignedTo.id === assignedBy?.id) return;

    pushToUser(assignedTo.id, {
      type: NOTIF_TYPES.TASK_ASSIGNED,
      title: 'Tâche assignée',
      body: `${assignedBy?.name || 'Un responsable'} vous a assigné "${task.titre}"`,
      meta: { taskId: task.id, taskTitre: task.titre, assignedById: assignedBy?.id },
    });
  }, [pushToUser]);

  // ── Notifier lors d'une facture ───────────────────────────────────────────
  const notifyFacture = useCallback(({ facture, targetUserId, type = NOTIF_TYPES.FACTURE_CREATED }) => {
    if (!targetUserId || targetUserId === user?.id) {
      addNotification({
        type,
        title: NOTIF_META[type].label,
        body: `Facture "${facture.titre}" — ${facture.montantHT} XAF`,
        meta: { factureId: facture.id, factureTitre: facture.titre },
      });
    } else {
      pushToUser(targetUserId, {
        type,
        title: NOTIF_META[type].label,
        body: `Facture "${facture.titre}" — ${facture.montantHT} XAF`,
        meta: { factureId: facture.id, factureTitre: facture.titre },
      });
    }
  }, [user?.id, addNotification, pushToUser]);

  // ── Marquer comme lues ────────────────────────────────────────────────────
  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      pushToUser,
      notifyDocumentTransfer,
      notifyTaskAssigned,
      notifyFacture,
      markRead,
      markAllRead,
      clearAll,
      NOTIF_META,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};