import { getConfig, hasMonday } from '../config';
import {
  demoAssign,
  demoListBoards,
  demoListItems,
  demoUpdateStatus,
  toTaskViews,
} from './demo';
import type { MondayBoard, MondayItem, TaskView } from './types';

export type MondayClientOptions = {
  fetchImpl?: typeof fetch;
  forceDemo?: boolean;
};

async function mondayRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: MondayClientOptions,
): Promise<T> {
  const cfg = getConfig();
  if (!cfg.monday.token) throw new Error('MONDAY_API_TOKEN not set');
  const fetchImpl = opts?.fetchImpl || fetch;
  const res = await fetchImpl(cfg.monday.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: cfg.monday.token,
      'Content-Type': 'application/json',
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`monday API HTTP ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data as T;
}

export function shouldUseDemo(opts?: MondayClientOptions): boolean {
  return opts?.forceDemo === true || !hasMonday();
}

export async function listBoards(opts?: MondayClientOptions): Promise<MondayBoard[]> {
  if (shouldUseDemo(opts)) return demoListBoards();
  const data = await mondayRequest<{ boards: MondayBoard[] }>(
    `query { boards(limit: 50, state: active) { id name items_count } }`,
    undefined,
    opts,
  );
  return data.boards || [];
}

export async function listItems(boardId?: string, opts?: MondayClientOptions): Promise<MondayItem[]> {
  if (shouldUseDemo(opts)) return demoListItems();
  const cfg = getConfig();
  const id = boardId || cfg.monday.defaultBoardId;
  if (!id) {
    const boards = await listBoards(opts);
    if (!boards[0]) return [];
    return listItems(boards[0].id, opts);
  }
  const data = await mondayRequest<{
    boards: {
      id: string;
      name: string;
      items_page: { items: MondayItem[] };
    }[];
  }>(
    `query ($ids: [ID!]) {
      boards(ids: $ids) {
        id
        name
        items_page(limit: 100) {
          items {
            id
            name
            created_at
            updated_at
            column_values { id text type value }
          }
        }
      }
    }`,
    { ids: [id] },
    opts,
  );
  const board = data.boards?.[0];
  if (!board) return [];
  return (board.items_page?.items || []).map((item) => ({
    ...item,
    board: { id: board.id, name: board.name },
  }));
}

export async function listTasks(boardId?: string, opts?: MondayClientOptions): Promise<TaskView[]> {
  const items = await listItems(boardId, opts);
  return toTaskViews(items);
}

export async function assignTask(
  taskQuery: string,
  personName: string,
  mondayUserId: string,
  opts?: MondayClientOptions,
): Promise<TaskView | null> {
  if (shouldUseDemo(opts)) {
    const item = demoAssign(taskQuery, personName, mondayUserId);
    return item ? toTaskViews([item])[0] : null;
  }
  const cfg = getConfig();
  const items = await listItems(undefined, opts);
  const item = items.find(
    (i) => i.id === taskQuery || i.name.toLowerCase().includes(taskQuery.toLowerCase()),
  );
  if (!item || !item.board?.id) return null;

  const columnValues = JSON.stringify({
    [cfg.monday.personColumnId]: {
      personsAndTeams: [{ id: Number(mondayUserId), kind: 'person' }],
    },
  });

  await mondayRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
        id
        name
        column_values { id text type value }
      }
    }`,
    { boardId: item.board.id, itemId: item.id, columnValues },
    opts,
  );
  const refreshed = await listTasks(item.board.id, opts);
  return refreshed.find((t) => t.id === item.id) || null;
}

export async function updateTaskStatus(
  taskQuery: string,
  statusLabel: string,
  opts?: MondayClientOptions,
): Promise<TaskView | null> {
  if (shouldUseDemo(opts)) {
    const item = demoUpdateStatus(taskQuery, statusLabel);
    return item ? toTaskViews([item])[0] : null;
  }
  const cfg = getConfig();
  const items = await listItems(undefined, opts);
  const item = items.find(
    (i) => i.id === taskQuery || i.name.toLowerCase().includes(taskQuery.toLowerCase()),
  );
  if (!item || !item.board?.id) return null;

  const columnValues = JSON.stringify({
    [cfg.monday.statusColumnId]: { label: statusLabel },
  });

  await mondayRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
        id
      }
    }`,
    { boardId: item.board.id, itemId: item.id, columnValues },
    opts,
  );
  const refreshed = await listTasks(item.board.id, opts);
  return refreshed.find((t) => t.id === item.id) || null;
}

export { toTaskViews };
