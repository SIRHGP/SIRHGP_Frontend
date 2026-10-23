import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPeople, filterProjectTasks } from './projectDetailUtils.js';

const project = {
  chefProjet: { id: 1, name: 'Chef' },
  membres: [{ id: '1', name: 'Chef' }, { id: 2, name: 'Membre sans tâche' }],
};
const tasks = [
  { id: 10, titre: 'Préparer le rapport', assignee: { id: 1 }, statut: 'TERMINEE' },
  { id: 11, titre: 'Relire le rapport', assignee: { id: '1' }, statut: 'EN_COURS' },
  { id: 12, titre: 'Livrer', assignee: { id: 3, name: 'Intervenant' }, statut: 'A_FAIRE' },
  { id: 13, titre: 'Planifier', assignee: null, statut: 'A_FAIRE' },
];

test('le chef est compté une seule fois, même avec des identifiants de types différents', () => {
  const people = projectPeople(project, tasks);
  assert.equal(people.length, 3);
  assert.deepEqual(people.find(p => p.id === 1), {
    id: 1, name: 'Chef', kind: 'Chef de projet', total: 2, done: 1, remaining: 1,
  });
});

test('les membres sans tâche restent présents et les intervenants sont distingués', () => {
  const people = projectPeople(project, tasks);
  assert.equal(people.find(p => p.id === 2).total, 0);
  assert.equal(people.find(p => p.id === 2).kind, 'Membre');
  assert.equal(people.find(p => p.id === 3).kind, 'Intervenant sur une tâche');
});

test('les compteurs utilisent uniquement les tâches fournies par l’API', () => {
  const people = projectPeople(project, tasks.slice(0, 1));
  assert.equal(people.find(p => p.id === 1).total, 1);
  assert.equal(people.some(p => p.id === 3), false);
});

test('les filtres personne, statut et recherche se combinent', () => {
  assert.deepEqual(filterProjectTasks(tasks, '1', 'EN_COURS', ' RAPPORT ').map(t => t.id), [11]);
  assert.deepEqual(filterProjectTasks(tasks, '', '', 'PRÉPARER').map(t => t.id), [10]);
});

test('les tâches non assignées et la réinitialisation sont prises en charge', () => {
  assert.deepEqual(filterProjectTasks(tasks, 'unassigned', '', '').map(t => t.id), [13]);
  assert.equal(filterProjectTasks(tasks, '', '', '').length, 4);
  assert.equal(filterProjectTasks(tasks, '2', '', '').length, 0);
});

test('un projet vide ne produit ni personne ni tâche', () => {
  assert.deepEqual(projectPeople({}, []), []);
  assert.deepEqual(filterProjectTasks([], '', '', ''), []);
});
