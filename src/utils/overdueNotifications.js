import { NOTIF_TYPES } from '../constants/notificationTypes.js';

export function overdueNotifications(tasks, userId, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  return tasks.filter(t => t.id != null && userId != null
    && String(t.createur?.id ?? t.createurId) === String(userId)
    && t.statut !== 'TERMINEE' && /^\d{4}-\d{2}-\d{2}$/.test(t.dateEcheance)
    && t.dateEcheance < today).map(t => {
    const days = Math.round((Date.parse(today) - Date.parse(t.dateEcheance)) / 86400000);
    return {
      id: `overdue-${userId}-${t.id}-${today}`,
      type: NOTIF_TYPES.TASK_OVERDUE,
      title: 'Tâche en retard',
      body: `La tâche « ${t.titre} », ${t.assignee ? `assignée à ${t.assignee.name}` : 'sans assigné'}, est en retard de ${days} jour(s) (échéance ${t.dateEcheance}).`,
      createdAt: now.toISOString(), read: false,
      meta: { taskId: t.id, taskTitle: t.titre, action: 'overdue' },
    };
  });
}

// Parcourir toutes les pages autorisées par le backend, sans accès transversal.
export async function fetchVisibleTasks(getAll, isCancelled = () => false) {
  const tasks = [];
  for (let page = 0; !isCancelled(); page++) {
    const response = await getAll({ page, size: 200, sort: 'id,asc' });
    if (isCancelled()) return [];
    const data = response.data?.data ?? response.data;
    if (Array.isArray(data)) return data;
    if (!Array.isArray(data?.content)) throw new Error('Réponse tâches invalide');
    tasks.push(...data.content);
    if (data.last || !data.content.length || page + 1 >= data.totalPages) break;
  }
  return tasks;
}
