import test from 'node:test';
import assert from 'node:assert/strict';
import { overdueNotifications, fetchVisibleTasks } from './overdueNotifications.js';

const now = new Date('2026-09-17T12:00:00Z');
const task = {
  id: 10, titre: 'Rapport', createur: { id: 1 }, assignee: { id: 2, name: 'Alice' },
  statut: 'EN_COURS', dateEcheance: '2026-09-15', visibilite: 'PRIVEE',
};

test('alerte au créateur avec assigné et retard, pas au tiers', () => {
  const [notification] = overdueNotifications([task], '1', now);
  assert.equal(notification.type, 'TASK_OVERDUE');
  assert.match(notification.body, /Alice/);
  assert.match(notification.body, /2 jour\(s\)/);
  assert.equal(notification.meta.taskId, 10);
  assert.deepEqual(overdueNotifications([task], 3, now), []);
  assert.deepEqual(overdueNotifications([task], null, now), []);
});

test('exclut tâches terminées, futures, sans échéance et échéance du jour', () => {
  const tasks = [
    { ...task, statut: 'TERMINEE' },
    { ...task, dateEcheance: null },
    { ...task, dateEcheance: '2026-09-17' },
    { ...task, dateEcheance: '2026-09-18' },
  ];
  assert.deepEqual(overdueNotifications(tasks, 1, now), []);
});

test('tâche bloquée en retard, identifiant stable par jour', () => {
  const blocked = { ...task, statut: 'BLOQUEE' };
  const [first] = overdueNotifications([blocked], 1, now);
  const [same] = overdueNotifications([blocked], 1, new Date('2026-09-17T15:00:00Z'));
  const [next] = overdueNotifications([blocked], 1, new Date('2026-09-18T12:00:00Z'));
  assert.equal(first.id, same.id);
  assert.notEqual(first.id, next.id);
});

test('bascule au lendemain à minuit à Douala', () => {
  const due = { ...task, dateEcheance: '2026-09-17' };
  assert.equal(overdueNotifications([due], 1, new Date('2026-09-17T22:59:59Z')).length, 0);
  assert.equal(overdueNotifications([due], 1, new Date('2026-09-17T23:00:00Z')).length, 1);
});

test('charge toutes les pages des tâches accessibles', async () => {
  const pages = [];
  const result = await fetchVisibleTasks(async ({ page }) => {
    pages.push(page);
    return { data: { data: { content: [{ ...task, id: page }], totalPages: 2, last: page === 1 } } };
  });
  assert.deepEqual(pages, [0, 1]);
  assert.deepEqual(result.map(t => t.id), [0, 1]);
});

test('annulation et échec API ne produisent pas de résultats partiels', async () => {
  assert.deepEqual(await fetchVisibleTasks(() => { throw new Error('appel inattendu'); }, () => true), []);
  await assert.rejects(fetchVisibleTasks(async () => { throw new Error('indisponible'); }), /indisponible/);
});
