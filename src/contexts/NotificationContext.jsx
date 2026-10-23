/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */

// contexts/NotificationContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './Authcontext';
import toast from 'react-hot-toast';
import { NOTIF_TYPES } from '../constants/notificationTypes';
import { tacheApi } from '../Api';
import { fetchVisibleTasks, overdueNotifications } from '../utils/overdueNotifications';

const NotificationContext = createContext(null);

function storageKey(userId) {
  return `sirhgp-notifs-${userId}`;
}

function loadNotifs(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    void error;
    return [];
  }
}

function saveNotifs(userId, notifs) {
  try {
    const trimmed = notifs.slice(0, 100);
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  } catch (error) {
    void error;
  }
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(() => (user?.id ? loadNotifs(user.id) : []));
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const stored = loadNotifs(user.id);
    setNotifications((prev) => {
      const same = JSON.stringify(prev) === JSON.stringify(stored);
      return same ? prev : stored;
    });
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

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newOnes = incoming.filter((n) => !existingIds.has(n.id));
          if (!newOnes.length) return prev;

          newOnes.forEach((n) => {
            if (Notification.permission === 'granted') {
              new Notification(n.title, { body: n.body, icon: '/favicon.ico' });
            }
          });

          return [...newOnes, ...prev];
        });

        localStorage.removeItem(busKey);
      } catch (error) {
        void error;
      }
    };

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    pollRef.current = setInterval(checkIncoming, 3000);
    return () => clearInterval(pollRef.current);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let running = false;
    const seen = new Set();
    const checkOverdue = async () => {
      if (running || cancelled) return;
      running = true;
      try {
        const tasks = await fetchVisibleTasks(tacheApi.getAll, () => cancelled);
        if (cancelled) return;
        const candidates = overdueNotifications(tasks, user.id);
        const key = `sirhgp-overdue-seen-${user.id}`;
        let stored = [];
        try {
          const value = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(value)) stored = value;
        } catch {
          // Le stockage peut être indisponible.
        }
        stored.forEach((id) => seen.add(id));
        const fresh = candidates.filter((n) => !seen.has(n.id));
        fresh.forEach((n) => seen.add(n.id));
        if (fresh.length) {
          setNotifications((prev) => {
            const ids = new Set(prev.map((n) => n.id));
            return [...fresh.filter((n) => !ids.has(n.id)), ...prev];
          });
        }
        try {
          localStorage.setItem(key, JSON.stringify(candidates.map((n) => n.id)));
        } catch (error) {
          void error;
        }
      } catch {
        // Réessayer au prochain passage ; ne pas notifier sur des données incomplètes.
      } finally {
        running = false;
      }
    };
    void checkOverdue();
    const interval = setInterval(checkOverdue, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id]);

  const pushToUser = useCallback((targetUserId, notif) => {
    const busKey = `sirhgp-notif-bus-${targetUserId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(busKey) || '[]');
      existing.unshift({
        ...notif,
        id: `${Date.now()}-${Math.random()}`,
        createdAt: new Date().toISOString(),
        read: false,
      });
      localStorage.setItem(busKey, JSON.stringify(existing));
    } catch (error) {
      void error;
    }
  }, []);

  const addNotification = useCallback((notif) => {
    const full = {
      id: `${Date.now()}-${Math.random()}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notif,
    };
    setNotifications((prev) => [full, ...prev]);
    return full;
  }, []);

  const notifyDocumentTransfer = useCallback(({ doc, sender, recipient }) => {
    addNotification({
      type: NOTIF_TYPES.DOCUMENT_SENT,
      title: 'Document envoyé',
      body: `Vous avez transféré « ${doc.nom} » à ${recipient.name}`,
      meta: { docId: doc.id, docNom: doc.nom, recipientId: recipient.id, recipientName: recipient.name },
    });

    pushToUser(recipient.id, {
      type: NOTIF_TYPES.DOCUMENT_RECEIVED,
      title: 'Nouveau document reçu',
      body: `${sender.name} vous a envoyé « ${doc.nom} »`,
      meta: { docId: doc.id, docNom: doc.nom, senderId: sender.id, senderName: sender.name },
    });
  }, [addNotification, pushToUser]);

  const notifyTaskAssigned = useCallback(({ task, assignedTo, assignedBy }) => {
    if (!assignedTo?.id || assignedTo.id === assignedBy?.id) return;

    pushToUser(assignedTo.id, {
      type: NOTIF_TYPES.TASK_ASSIGNED,
      title: 'Tâche assignée',
      body: `${assignedBy?.name || 'Un responsable'} vous a assigné « ${task.titre} »`,
      meta: { taskId: task.id, taskTitre: task.titre, assignedById: assignedBy?.id },
    });

    toast.success(`Tâche assignée à ${assignedTo.name}`);
  }, [pushToUser]);

  const notifyFacture = useCallback(({ facture, targetUserId, type = NOTIF_TYPES.FACTURE_CREATED }) => {
    const notif = {
      type,
      title: 'Facture',
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

  const notifyEvent = useCallback(({ event, action, targetUserId, currentUser, silent = false }) => {
    const messages = {
      created: `Nouvel événement : ${event.titre}`,
      modified: `Événement modifié : ${event.titre}`,
      deleted: `Événement supprimé : ${event.titre}`,
      shared: `${currentUser?.name} vous a invité à « ${event.titre} »`,
    };

    const titles = {
      created: 'Événement créé',
      modified: 'Événement modifié',
      deleted: 'Événement supprimé',
      shared: 'Invitation reçue',
    };

    const notif = {
      type: `EVENT_${action.toUpperCase()}`,
      title: titles[action],
      body: messages[action],
      meta: { eventId: event.id, eventTitle: event.titre, action },
    };

    if (targetUserId && targetUserId !== currentUser?.id) {
      pushToUser(targetUserId, notif);
    } else {
      addNotification(notif);
    }

    if (!silent) toast.success(messages[action]);
  }, [addNotification, pushToUser]);

  const notifyDocument = useCallback(({ doc, action, recipient, currentUser }) => {
    const messages = {
      uploaded: `Document téléversé : ${doc.nom}`,
      modified: `Document modifié : ${doc.nom}`,
      deleted: `Document supprimé : ${doc.nom}`,
    };

    const titles = {
      uploaded: 'Document téléversé',
      modified: 'Document modifié',
      deleted: 'Document supprimé',
    };

    const notif = {
      type: `DOCUMENT_${action.toUpperCase()}`,
      title: titles[action],
      body: messages[action],
      meta: { docId: doc.id, docName: doc.nom, action },
    };

    if (recipient?.id && recipient.id !== currentUser?.id) {
      pushToUser(recipient.id, notif);
    }
    addNotification(notif);
    toast.success(messages[action]);
  }, [addNotification, pushToUser]);

  const notifyTask = useCallback(({ task, action, assignee, currentUser }) => {
    const messages = {
      created: `Tâche créée : ${task.titre}`,
      modified: `Tâche modifiée : ${task.titre}`,
      deleted: `Tâche supprimée : ${task.titre}`,
      completed: `Tâche terminée : ${task.titre}`,
    };

    const titles = {
      created: 'Tâche créée',
      modified: 'Tâche modifiée',
      deleted: 'Tâche supprimée',
      completed: 'Bravo !',
    };

    const notif = {
      type: `TASK_${action.toUpperCase()}`,
      title: titles[action],
      body: messages[action],
      meta: { taskId: task.id, taskTitle: task.titre, action },
    };

    if (assignee?.id && assignee.id !== currentUser?.id) {
      pushToUser(assignee.id, notif);
    }
    addNotification(notif);
    toast.success(messages[action]);
  }, [addNotification, pushToUser]);

  const notifyPermission = useCallback(({ action, permission, targetUserId }) => {
    const messages = {
      demandee: `Demande de permission (${permission.type}) : ${permission.dateDebut} → ${permission.dateFin}`,
      approuvee: `Votre permission du ${permission.dateDebut} a été approuvée`,
      rejetee: `Votre permission du ${permission.dateDebut} a été rejetée`,
    };
    const titles = {
      demandee: 'Demande de permission',
      approuvee: 'Permission approuvée',
      rejetee: 'Permission rejetée',
    };
    const type = action === 'demandee' ? NOTIF_TYPES.PERMISSION_DEMANDEE
      : action === 'approuvee' ? NOTIF_TYPES.PERMISSION_APPROUVEE
      : NOTIF_TYPES.PERMISSION_REJETEE;
    const notif = {
      id: `perm-${permission.id}-${action}-${Date.now()}`,
      type,
      title: titles[action],
      body: messages[action],
      meta: { permissionId: permission.id, action },
    };
    if (targetUserId && targetUserId !== user?.id) {
      pushToUser(targetUserId, notif);
    } else {
      addNotification(notif);
    }
  }, [user?.id, addNotification, pushToUser]);

  const notifyEvaluation = useCallback(({ action, evaluation, targetUserId }) => {
    const cible = evaluation?.evalueName || 'un employé';
    const messages = {
      soumise: `Évaluation de ${cible} (${evaluation?.categorie || 'évaluation'}) soumise pour validation`,
      validee: `Votre évaluation de ${cible} (${evaluation?.categorie || 'évaluation'}) a été validée`,
    };
    const titles = {
      soumise: 'Évaluation à valider',
      validee: 'Évaluation validée',
    };
    const type = action === 'soumise' ? NOTIF_TYPES.EVALUATION_SOUMISE
      : NOTIF_TYPES.EVALUATION_VALIDEE;
    const notif = {
      id: `eval-${evaluation?.id}-${action}-${Date.now()}`,
      type,
      title: titles[action],
      body: messages[action],
      meta: { evaluationId: evaluation?.id, action },
    };
    if (targetUserId && targetUserId !== user?.id) {
      pushToUser(targetUserId, notif);
    } else {
      addNotification(notif);
    }
    toast.success(messages[action]);
  }, [user?.id, addNotification, pushToUser]);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      notifyPermission,
      notifyEvaluation,
      markRead,
      markAllRead,
      clearAll,
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
