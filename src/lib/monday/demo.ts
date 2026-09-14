import type { MondayBoard, MondayItem, TaskView } from './types';

/** In-memory demo fixtures — clearly fake, never presented as live monday data. */
const DEMO_BOARD: MondayBoard = {
  id: 'demo-board-1001',
  name: 'Demo Ops Board (fake)',
  items_count: 6,
};

type DemoState = {
  boards: MondayBoard[];
  items: MondayItem[];
};

function seed(): DemoState {
  const now = Date.now();
  const items: MondayItem[] = [
    mk('demo-item-1', 'Prepare weekly ops digest', 'Ali Demo', '900001', 'Working on it', daysAgo(now, 1), daysAgo(now, 0)),
    mk('demo-item-2', 'Refresh landing page copy', 'Sara Demo', '900002', 'Stuck', daysAgo(now, -2), daysAgo(now, 5)),
    mk('demo-item-3', 'Fix SMS delivery retries', 'Bilal Demo', '900003', 'Done', daysAgo(now, 3), daysAgo(now, 1)),
    mk('demo-item-4', 'Onboard support macros', 'Noor Demo', '900004', 'Not Started', daysAgo(now, -1), daysAgo(now, 8)),
    mk('demo-item-5', 'Inventory demo SKUs', 'Ali Demo', '900001', 'Working on it', daysAgo(now, -5), daysAgo(now, 2)),
    mk('demo-item-6', 'Schedule vendor call', null, null, 'Not Started', daysAgo(now, 2), daysAgo(now, 0)),
  ];
  return { boards: [DEMO_BOARD], items };
}

function daysAgo(now: number, offsetDays: number): string {
  return new Date(now + offsetDays * 86400000).toISOString().slice(0, 10);
}

function mk(
  id: string,
  name: string,
  ownerName: string | null,
  ownerId: string | null,
  status: string,
  due: string,
  updated: string,
): MondayItem {
  const peopleValue = ownerId
    ? JSON.stringify({ personsAndTeams: [{ id: Number(ownerId), kind: 'person' }] })
    : null;
  return {
    id,
    name,
    updated_at: `${updated}T10:00:00Z`,
    created_at: `${updated}T09:00:00Z`,
    board: { id: DEMO_BOARD.id, name: DEMO_BOARD.name },
    column_values: [
      { id: 'person', text: ownerName, type: 'people', value: peopleValue },
      { id: 'status', text: status, type: 'status', value: JSON.stringify({ label: status }) },
      { id: 'date', text: due, type: 'date', value: JSON.stringify({ date: due }) },
    ],
  };
}

const globalKey = '__jindo_demo_monday__';

function state(): DemoState {
  const g = globalThis as unknown as Record<string, DemoState | undefined>;
  if (!g[globalKey]) g[globalKey] = seed();
  return g[globalKey]!;
}

export function resetDemoMonday() {
  const g = globalThis as unknown as Record<string, DemoState | undefined>;
  g[globalKey] = seed();
}

export function demoListBoards(): MondayBoard[] {
  return state().boards;
}

export function demoListItems(): MondayItem[] {
  return state().items.map((i) => ({ ...i, column_values: [...i.column_values] }));
}

export function demoAssign(itemId: string, personName: string, personMondayId: string): MondayItem | null {
  const item = state().items.find((i) => i.id === itemId || i.name.toLowerCase().includes(itemId.toLowerCase()));
  if (!item) return null;
  const col = item.column_values.find((c) => c.id === 'person');
  if (col) {
    col.text = personName;
    col.value = JSON.stringify({
      personsAndTeams: [{ id: Number(personMondayId), kind: 'person' }],
    });
  }
  item.updated_at = new Date().toISOString();
  return item;
}

export function demoUpdateStatus(itemQuery: string, status: string): MondayItem | null {
  const item = state().items.find(
    (i) => i.id === itemQuery || i.name.toLowerCase().includes(itemQuery.toLowerCase()),
  );
  if (!item) return null;
  const col = item.column_values.find((c) => c.id === 'status');
  if (col) {
    col.text = status;
    col.value = JSON.stringify({ label: status });
  }
  item.updated_at = new Date().toISOString();
  return item;
}

export function toTaskViews(items: MondayItem[], staleDays = 7): TaskView[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return items.map((item) => {
    const ownerCol = item.column_values.find((c) => c.id === 'person' || c.type === 'people');
    const statusCol = item.column_values.find((c) => c.id === 'status' || c.type === 'status');
    const dateCol = item.column_values.find((c) => c.id === 'date' || c.type === 'date');
    let ownerIds: string[] = [];
    try {
      if (ownerCol?.value) {
        const v = JSON.parse(ownerCol.value) as { personsAndTeams?: { id: number }[] };
        ownerIds = (v.personsAndTeams || []).map((p) => String(p.id));
      }
    } catch {
      /* ignore */
    }
    const dueDate = dateCol?.text || null;
    let overdue = false;
    if (dueDate && statusCol?.text?.toLowerCase() !== 'done') {
      const d = new Date(dueDate);
      if (!Number.isNaN(d.getTime()) && d < today) overdue = true;
    }
    let stale = false;
    if (item.updated_at) {
      const u = new Date(item.updated_at);
      const age = (Date.now() - u.getTime()) / 86400000;
      if (age >= staleDays && statusCol?.text?.toLowerCase() !== 'done') stale = true;
    }
    return {
      id: item.id,
      name: item.name,
      boardId: item.board?.id || DEMO_BOARD.id,
      boardName: item.board?.name || DEMO_BOARD.name,
      owner: ownerCol?.text || null,
      ownerIds,
      status: statusCol?.text || null,
      dueDate,
      updatedAt: item.updated_at,
      stale,
      overdue,
    };
  });
}
