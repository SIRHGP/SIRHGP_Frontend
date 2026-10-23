export function projectPeople(project, tasks) {
  const people = new Map();
  for (const member of project.membres || []) {
    if (member.id != null) people.set(String(member.id), { ...member, kind: 'Membre' });
  }
  const chief = project.chefProjet;
  if (chief?.id != null) people.set(String(chief.id), { ...chief, kind: 'Chef de projet' });
  for (const task of tasks) {
    const person = task.assignee;
    if (person?.id != null && !people.has(String(person.id))) {
      people.set(String(person.id), { ...person, kind: 'Intervenant sur une tâche' });
    }
  }
  return [...people.values()].map(person => {
    const assigned = tasks.filter(t => String(t.assignee?.id) === String(person.id));
    const done = assigned.filter(t => t.statut === 'TERMINEE').length;
    return { ...person, total: assigned.length, done, remaining: assigned.length - done };
  });
}

export function filterProjectTasks(tasks, person, status, search) {
  return tasks.filter(t =>
    (!person || (person === 'unassigned' ? t.assignee?.id == null : String(t.assignee?.id) === person))
    && (!status || t.statut === status)
    && (!search.trim() || (t.titre || '').toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))));
}
