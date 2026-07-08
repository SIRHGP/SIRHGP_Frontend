// contexts/NotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './Authcontext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const NOTIF_TYPES = {
  DOCUMENT_SENT: 'DOCUMENT_SENT',
  DOCUMENT_RECEIVED: 'DOCUMENT_RECEIVED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_UPDATED: 'TASK_UPDATED',
  FACTURE_CREATED: 'FACTURE_CREATED',
  FACTURE_PAID: 'FACTURE_PAID',
  EVENT_INVITED: 'EVENT_INVITED',
};

const NOTIF_META = {
  DOCUMENT_SENT: { icon: '📤', color: '#6366F1', label: 'Document envoye' },
  DOCUMENT_RECEIVED: { icon: '📥', color: '#10B981', label: 'Document recu' },
  TASK_ASSIGNED: { icon: '✓', color: '#3B82F6', label: 'Tache assignee' },
  TASK_UPDATED: { icon: '🔄', color: '#F59E0B', label: 'Tache mise a jour' },
  FACTURE_CREATED: { icon: '💰', color: '#8B5CF6', label: 'Nouvelle facture' },
  FACTURE_PAID: { icon: '💸', color: '#10B981', label: 'Facture payee' },
  EVENT_INVITED: { icon: '📅', color: '#0EA5E9', label: 'Invitation' },
};

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
    const trimmed = notifs.slice(0, 100);
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  } catch {}
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const pollRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      const stored = loadNotifs(user.id);
      setNotifications(stored);
    } else {
      setNotifications([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      saveNotifs(user.id, notifications);
    }
  }, [notifications, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const checkIncoming = () => {
      const busKey = `sirhgp-notif-bus-${user.id}`;
      try {
        const raw = localStorage.getItem(busKey);
        if (!raw) return;
        const incoming = JSON.parse(raw);
        if (!incoming?.length) return;

        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newOnes = incoming.filter(n => !existingIds.has(n.id));
          if (!newOnes.length) return prev;

          newOnes.forEach(n => {
            if (Notification.permission === 'granted') {
              new Notification(n.title, { body: n.body, icon: '/favicon.ico' });
            }
          });

          return [...newOnes, ...prev];
        });

        localStorage.removeItem(busKey);
      } catch {}
    };

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    pollRef.current = setInterval(checkIncoming, 3000);
    return () => clearInterval(pollRef.current);
  }, [user?.id]);

  const pushToUser = useCallback((targetUserId, notif) => {
    const busKey = `sirhgp-notif-bus-${targetUserId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(busKey) || '[]');
      existing.unshift({ 
        ...notif, 
        id: `${Date.now()}-${Math.random()}`, 
        createdAt: new Date().toISOString(), 
        read: false 
      });
      localStorage.setItem(busKey, JSON.stringify(existing));
    } catch {}
  }, []);

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

  const notifyDocumentTransfer = useCallback(({ doc, sender, recipient }) => {
    addNotification({
      type: NOTIF_TYPES.DOCUMENT_SENT,
      title: 'Document envoye',
      body: `Vous avez transfere "${doc.nom}" a ${recipient.name}`,
      meta: { docId: doc.id, docNom: doc.nom, recipientId: recipient.id, recipientName: recipient.name },
    });

    pushToUser(recipient.id, {
      type: NOTIF_TYPES.DOCUMENT_RECEIVED,
      title: 'Nouveau document recu',
      body: `${sender.name} vous a envoye "${doc.nom}"`,
      meta: { docId: doc.id, docNom: doc.nom, senderId: sender.id, senderName: sender.name },
    });
  }, [addNotification, pushToUser]);

  const notifyTaskAssigned = useCallback(({ task, assignedTo, assignedBy }) => {
    if (!assignedTo?.id || assignedTo.id === assignedBy?.id) return;

    pushToUser(assignedTo.id, {
      type: NOTIF_TYPES.TASK_ASSIGNED,
      title: 'Tache assignee',
      body: `${assignedBy?.name || 'Un responsable'} vous a assigne "${task.titre}"`,
      meta: { taskId: task.id, taskTitre: task.titre, assignedById: assignedBy?.id },
    });
    
    toast.success(`Tache assignee a ${assignedTo.name}`);
  }, [pushToUser]);

  const notifyFacture = useCallback(({ facture, targetUserId, type = NOTIF_TYPES.FACTURE_CREATED }) => {
    const notif = {
      type,
      title: NOTIF_META[type].label,
      body: `Facture "${facture.titre}" - ${facture.montantHT} XAF`,
      meta: { factureId: facture.id, factureTitre: facture.titre },
    };

    if (!targetUserId || targetUserId === user?.id) {
      addNotification(notif);
    } else {
      pushToUser(targetUserId, notif);
    }
    
    toast.success(notif.body);
  }, [user?.id, addNotification, pushToUser]);

  const notifyEvent = useCallback(({ event, action, targetUserId, currentUser }) => {
    const messages = {
      created: `Nouvel evenement: ${event.titre}`,
      modified: `Evenement modifie: ${event.titre}`,
      deleted: `Evenement supprime: ${event.titre}`,
      shared: `${currentUser?.name} vous a invite a "${event.titre}"`
    };
    
    const titles = {
      created: 'Evenement cree',
      modified: 'Evenement modifie',
      deleted: 'Evenement supprime',
      shared: 'Invitation recue'
    };

    const notif = {
      type: `EVENT_${action.toUpperCase()}`,
      title: titles[action],
      body: messages[action],
      meta: { eventId: event.id, eventTitle: event.titre, action }
    };

    if (targetUserId && targetUserId !== currentUser?.id) {
      pushToUser(targetUserId, notif);
    } else {
      addNotification(notif);
    }
    
    toast.success(messages[action]);
  }, [addNotification, pushToUser]);

  const notifyDocument = useCallback(({ doc, action, recipient, currentUser }) => {
    const messages = {
      uploaded: `Document uploade: ${doc.nom}`,
      modified: `Document modifie: ${doc.nom}`,
      deleted: `Document supprime: ${doc.nom}`
    };
    
    const titles = {
      uploaded: 'Document uploade',
      modified: 'Document modifie',
      deleted: 'Document supprime'
    };

    const notif = {
      type: `DOCUMENT_${action.toUpperCase()}`,
      title: titles[action],
      body: messages[action],
      meta: { docId: doc.id, docName: doc.nom, action }
    };

    if (recipient?.id && recipient.id !== currentUser?.id) {
      pushToUser(recipient.id, notif);
    }
    addNotification(notif);
    toast.success(messages[action]);
  }, [addNotification, pushToUser]);

  const notifyTask = useCallback(({ task, action, assignee, currentUser }) => {
    const messages = {
      created: `Tache creee: ${task.titre}`,
      modified: `Tache modifiee: ${task.titre}`,
      deleted: `Tache supprimee: ${task.titre}`,
      completed: `Tache terminee: ${task.titre}`
    };
    
    const titles = {
      created: 'Tache creee',
      modified: 'Tache modifiee',
      deleted: 'Tache supprimee',
      completed: 'Bravo !'
    };

    const notif = {
      type: `TASK_${action.toUpperCase()}`,
      title: titles[action],
      body: messages[action],
      meta: { taskId: task.id, taskTitle: task.titre, action }
    };

    if (assignee?.id && assignee.id !== currentUser?.id) {
      pushToUser(assignee.id, notif);
    }
    addNotification(notif);
    toast.success(messages[action]);
  }, [addNotification, pushToUser]);

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
      notifyEvent,
      notifyDocument,
      notifyTask,
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