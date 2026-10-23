// hooks/useNotifications.js
import { useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import toast from 'react-hot-toast';

export function useAppNotifications() {
  const { addNotification, pushToUser, unreadCount } = useNotifications();

  const notify = useCallback(({ 
    type,           // Type de notification (de NOTIF_TYPES)
    title,          // Titre personnalisé (optionnel)
    message,        // Message à afficher
    targetUserId,   // ID de l'utilisateur cible (optionnel)
    currentUser,    // Utilisateur courant
    meta = {},      // Métadonnées supplémentaires
    showToast = true // Afficher un toast ou non
  }) => {
    const finalTitle = title || 'Notification';

    // 1. Toast (feedback immédiat) — cloche neutre unique, aucun emoji.
    if (showToast) {
      toast(message, {
        icon: <Bell size={18} />,
        duration: 4000,
        style: {
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          borderLeft: `4px solid #64748B`,
        },
      });
    }

    // 2. Notification système (si permission accordée)
    if (Notification.permission === 'granted' && showToast) {
      new Notification(finalTitle, {
        body: message,
        icon: '/favicon.ico',
      });
    }

    // 3. Stocker dans le contexte de notifications
    const notificationData = {
      type,
      title: finalTitle,
      body: message,
      meta: { ...meta, userId: currentUser?.id, userName: currentUser?.name },
      read: false,
    };

    if (targetUserId && targetUserId !== currentUser?.id) {
      // Envoyer à un autre utilisateur
      pushToUser(targetUserId, notificationData);
    } else {
      // Ajouter à mes propres notifications
      addNotification(notificationData);
    }
  }, [addNotification, pushToUser]);

  // Notification groupée (plusieurs destinataires)
  const notifyGroup = useCallback(({ 
    type, title, message, targetUserIds, currentUser, meta = {}, showToast = true 
  }) => {
    targetUserIds.forEach(userId => {
      notify({
        type,
        title,
        message,
        targetUserId: userId,
        currentUser,
        meta,
        showToast: userId === currentUser?.id ? showToast : false, // Toast uniquement pour moi
      });
    });
  }, [notify]);

  return { notify, notifyGroup, unreadCount };
}