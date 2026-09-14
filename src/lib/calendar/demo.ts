export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string;
};

type CalState = { events: CalendarEvent[] };

const key = '__jindo_demo_calendar__';

function seed(): CalState {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  const e1Start = new Date(base.getTime() + 2 * 3600000);
  const e2Start = new Date(base.getTime() + 26 * 3600000);
  return {
    events: [
      {
        id: 'demo-evt-1',
        summary: 'Demo standup (fake)',
        start: e1Start.toISOString(),
        end: new Date(e1Start.getTime() + 30 * 60000).toISOString(),
      },
      {
        id: 'demo-evt-2',
        summary: 'Demo vendor sync (fake)',
        start: e2Start.toISOString(),
        end: new Date(e2Start.getTime() + 45 * 60000).toISOString(),
      },
    ],
  };
}

function state(): CalState {
  const g = globalThis as unknown as Record<string, CalState | undefined>;
  if (!g[key]) g[key] = seed();
  return g[key]!;
}

export function resetDemoCalendar() {
  const g = globalThis as unknown as Record<string, CalState | undefined>;
  g[key] = seed();
}

export function demoListEvents(limit = 10): CalendarEvent[] {
  return state()
    .events.slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit);
}

export function demoCreateEvent(summary: string, startIso: string, endIso: string): CalendarEvent {
  const ev: CalendarEvent = {
    id: `demo-evt-${Date.now()}`,
    summary,
    start: startIso,
    end: endIso,
  };
  state().events.push(ev);
  return ev;
}
