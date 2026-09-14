import type { TaskView } from '../monday/types';
import { getEmployees } from '../employees';

export function formatTaskLine(t: TaskView): string {
  const bits = [
    `• ${t.name}`,
    t.owner ? `(@${t.owner})` : '(unassigned)',
    t.status ? `[${t.status}]` : '',
    t.dueDate ? `due ${t.dueDate}` : '',
    t.overdue ? '⚠ overdue' : '',
    t.stale ? '⏳ stale' : '',
  ].filter(Boolean);
  return bits.join(' ');
}

export function progressReport(tasks: TaskView[]): string {
  const employees = getEmployees();
  const lines: string[] = ['Here’s the progress snapshot:'];
  const byPerson = new Map<string, TaskView[]>();

  for (const t of tasks) {
    const key = t.owner || 'Unassigned';
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key)!.push(t);
  }

  for (const emp of employees) {
    const list = byPerson.get(emp.name) || tasks.filter((t) => t.ownerIds.includes(emp.mondayUserId));
    const open = list.filter((t) => (t.status || '').toLowerCase() !== 'done');
    const done = list.filter((t) => (t.status || '').toLowerCase() === 'done');
    const overdue = open.filter((t) => t.overdue);
    lines.push(
      `\n**${emp.name}** — ${done.length} done, ${open.length} open` +
        (overdue.length ? `, ${overdue.length} overdue` : ''),
    );
    for (const t of open.slice(0, 5)) lines.push(formatTaskLine(t));
    byPerson.delete(emp.name);
  }

  for (const [name, list] of byPerson) {
    const open = list.filter((t) => (t.status || '').toLowerCase() !== 'done');
    const done = list.filter((t) => (t.status || '').toLowerCase() === 'done');
    lines.push(`\n**${name}** — ${done.length} done, ${open.length} open`);
    for (const t of open.slice(0, 5)) lines.push(formatTaskLine(t));
  }

  const overallOpen = tasks.filter((t) => (t.status || '').toLowerCase() !== 'done');
  const overallDone = tasks.filter((t) => (t.status || '').toLowerCase() === 'done');
  const overallOverdue = overallOpen.filter((t) => t.overdue);
  lines.push(
    `\n**Overall** — ${overallDone.length} done / ${overallOpen.length} open / ${overallOverdue.length} overdue (of ${tasks.length} items).`,
  );
  return lines.join('\n');
}

export function tasksSmsBody(personName: string, tasks: TaskView[]): string {
  const open = tasks.filter((t) => (t.status || '').toLowerCase() !== 'done');
  if (!open.length) return `Hi ${personName} — no open tasks on the board right now. Nice work!`;
  const lines = open.slice(0, 8).map((t) => {
    const due = t.dueDate ? ` (due ${t.dueDate})` : '';
    return `- ${t.name}${due}${t.overdue ? ' [OVERDUE]' : ''}`;
  });
  return `Hi ${personName} — your open tasks:\n${lines.join('\n')}\n— Jindo`;
}
