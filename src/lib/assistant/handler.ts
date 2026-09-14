import { getConfig, integrationStatus } from '../config';
import { findEmployee, getEmployees } from '../employees';
import { parseIntentSmart } from '../intent/llm';
import { wantsExplicitNotify } from '../intent/parser';
import type { ParsedIntent } from '../intent/types';
import * as monday from '../monday/client';
import { sendSms } from '../httpsms/client';
import { createMeeting, listUpcomingEvents } from '../calendar/client';
import { formatTaskLine, progressReport, tasksSmsBody } from './reports';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: Record<string, unknown>;
};

export type HandleResult = {
  reply: string;
  intent: ParsedIntent;
  demo: boolean;
  outboundSms?: { to: string; content: string; demo: boolean; ok: boolean }[];
};

function demoNote(demo: boolean): string {
  return demo ? '\n\n_(Demo fixtures — not live monday data.)_' : '';
}

function helpText(): string {
  const people = getEmployees()
    .map((e) => e.name.split(' ')[0])
    .join(', ');
  return [
    `Hey — I’m Jindo. I can help with monday boards, SMS (only when you say text/notify/send), and calendar.`,
    ``,
    `Try:`,
    `• assign Fix SMS delivery retries to Bilal`,
    `• today’s report`,
    `• text Ali his tasks`,
    `• what’s on the calendar`,
    `• overdue tasks`,
    `• list boards`,
    ``,
    `People I know: ${people}.`,
  ].join('\n');
}

export async function handleCommand(raw: string): Promise<HandleResult> {
  const cfg = getConfig();
  const status = integrationStatus(cfg);
  const intent = await parseIntentSmart(raw);
  const outboundSms: HandleResult['outboundSms'] = [];
  const demo = status.demo;

  const reply = async (): Promise<string> => {
    switch (intent.intent) {
      case 'help':
        return helpText();

      case 'list_boards': {
        const boards = await monday.listBoards();
        if (!boards.length) return 'No boards found.' + demoNote(demo);
        return (
          `Boards:\n` +
          boards.map((b) => `• ${b.name} (\`${b.id}\`${b.items_count != null ? `, ${b.items_count} items` : ''})`).join('\n') +
          demoNote(demo)
        );
      }

      case 'list_tasks': {
        const tasks = await monday.listTasks();
        const person = intent.person ? findEmployee(intent.person) : undefined;
        let filtered = tasks;
        if (person) {
          filtered = tasks.filter(
            (t) =>
              t.owner?.toLowerCase().includes(person.name.toLowerCase()) ||
              t.ownerIds.includes(person.mondayUserId),
          );
        }
        const open = filtered.filter((t) => (t.status || '').toLowerCase() !== 'done');
        if (!open.length) {
          return (person ? `No open tasks for ${person.name}.` : 'No open tasks.') + demoNote(demo);
        }
        const header = person ? `Open tasks for ${person.name}:` : 'Open tasks:';
        return header + '\n' + open.slice(0, 20).map(formatTaskLine).join('\n') + demoNote(demo);
      }

      case 'who_owns': {
        const q = intent.taskQuery || intent.raw.replace(/who\s+owns\s+/i, '').trim();
        const tasks = await monday.listTasks();
        const match = tasks.find((t) => t.name.toLowerCase().includes(q.toLowerCase()));
        if (!match) return `I couldn’t find a task matching “${q}”.` + demoNote(demo);
        return match.owner
          ? `**${match.name}** is owned by **${match.owner}** (${match.status || 'no status'}).` + demoNote(demo)
          : `**${match.name}** is unassigned.` + demoNote(demo);
      }

      case 'assign_task': {
        const personName = intent.person;
        const taskQ = intent.taskQuery;
        if (!personName || !taskQ) {
          return 'Tell me who and which task — e.g. `assign Prepare weekly ops digest to Ali`.';
        }
        const emp = findEmployee(personName);
        if (!emp) {
          return `I don’t know “${personName}”. People: ${getEmployees().map((e) => e.name).join(', ')}.`;
        }
        const updated = await monday.assignTask(taskQ, emp.name, emp.mondayUserId);
        if (!updated) return `Couldn’t find task matching “${taskQ}”.` + demoNote(demo);
        return `Assigned **${updated.name}** to **${emp.name}**.` + demoNote(demo);
      }

      case 'update_task': {
        const taskQ = intent.taskQuery || intent.raw;
        const statusLabel = intent.status || 'Done';
        const updated = await monday.updateTaskStatus(taskQ, statusLabel);
        if (!updated) return `Couldn’t find that task to update.` + demoNote(demo);
        return `Updated **${updated.name}** → ${updated.status}.` + demoNote(demo);
      }

      case 'overdue': {
        const tasks = await monday.listTasks();
        const overdue = tasks.filter((t) => t.overdue || t.stale);
        if (!overdue.length) return 'Nothing overdue or stale. Nice.' + demoNote(demo);
        return (
          'Overdue / stale:\n' +
          overdue.map(formatTaskLine).join('\n') +
          demoNote(demo)
        );
      }

      case 'report': {
        const tasks = await monday.listTasks();
        if (intent.person) {
          const emp = findEmployee(intent.person);
          if (!emp) return `Unknown person “${intent.person}”.`;
          const theirs = tasks.filter(
            (t) =>
              t.owner?.toLowerCase().includes(emp.name.toLowerCase()) ||
              t.ownerIds.includes(emp.mondayUserId),
          );
          return progressReport(theirs) + demoNote(demo);
        }
        return progressReport(tasks) + demoNote(demo);
      }

      case 'text_tasks': {
        if (!wantsExplicitNotify(intent.raw)) {
          return 'I only send SMS when you explicitly say text / notify / send.';
        }
        const personName = intent.person;
        if (!personName) return 'Who should I text? e.g. `text Ali his tasks`.';
        const emp = findEmployee(personName);
        if (!emp) return `Unknown person “${personName}”.`;
        const tasks = await monday.listTasks();
        const theirs = tasks.filter(
          (t) =>
            t.owner?.toLowerCase().includes(emp.name.toLowerCase()) ||
            t.ownerIds.includes(emp.mondayUserId),
        );
        const body = tasksSmsBody(emp.name.split(' ')[0], theirs);
        const result = await sendSms({ to: emp.phone, content: body });
        outboundSms.push({
          to: result.to,
          content: result.content,
          demo: result.demo,
          ok: result.ok,
        });
        if (!result.ok) return `Tried to text ${emp.name} but failed: ${result.error}`;
        return (
          `Texted **${emp.name}** at \`${emp.phone}\`${result.demo ? ' (demo — not actually sent)' : ''}.\n\n` +
          `---\n${body}` +
          demoNote(demo)
        );
      }

      case 'send_sms': {
        if (!wantsExplicitNotify(intent.raw)) {
          return 'I only send SMS when you explicitly say text / notify / send.';
        }
        const personName = intent.person;
        if (!personName) return 'Who should I message?';
        const emp = findEmployee(personName);
        if (!emp) return `Unknown person “${personName}”.`;
        const content = intent.content || `Hi ${emp.name.split(' ')[0]} — ping from Jindo.`;
        const result = await sendSms({ to: emp.phone, content });
        outboundSms.push({
          to: result.to,
          content: result.content,
          demo: result.demo,
          ok: result.ok,
        });
        if (!result.ok) return `SMS failed: ${result.error}`;
        return `Sent to **${emp.name}** (\`${emp.phone}\`)${result.demo ? ' — demo only' : ''}:\n${content}`;
      }

      case 'list_calendar': {
        const { demo: calDemo, events } = await listUpcomingEvents(8);
        if (!events.length) return 'No upcoming events.' + (calDemo ? '\n\n_(Demo calendar.)_' : '');
        const lines = events.map((e) => {
          const when = new Date(e.start).toLocaleString('en-PK', { timeZone: cfg.timezone });
          return `• ${e.summary} — ${when}`;
        });
        return 'Upcoming:\n' + lines.join('\n') + (calDemo ? '\n\n_(Demo calendar.)_' : '');
      }

      case 'create_meeting': {
        const title = intent.title || 'Jindo meeting';
        const { demo: calDemo, event } = await createMeeting(
          title,
          intent.when,
          intent.durationMinutes || 30,
        );
        const when = new Date(event.start).toLocaleString('en-PK', { timeZone: cfg.timezone });
        return (
          `Booked **${event.summary}** at ${when}` +
          (event.htmlLink ? `\n${event.htmlLink}` : '') +
          (calDemo ? '\n\n_(Demo calendar — not live Google.)_' : '')
        );
      }

      default:
        return (
          `I didn’t catch that. Try “today’s report”, “text Ali his tasks”, or “what’s on the calendar”.\n` +
          `Or say **help**.`
        );
    }
  };

  const text = await reply();
  return { reply: text, intent, demo, outboundSms: outboundSms.length ? outboundSms : undefined };
}
