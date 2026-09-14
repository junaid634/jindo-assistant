import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resetDemoMonday } from '@/lib/monday/demo';
import { assignTask, listBoards, listTasks, updateTaskStatus } from '@/lib/monday/client';

describe('monday client (demo)', () => {
  beforeEach(() => {
    resetDemoMonday();
    delete process.env.MONDAY_API_TOKEN;
  });

  it('lists demo boards', async () => {
    const boards = await listBoards({ forceDemo: true });
    expect(boards.length).toBeGreaterThan(0);
    expect(boards[0].name.toLowerCase()).toContain('demo');
  });

  it('lists tasks with owners', async () => {
    const tasks = await listTasks(undefined, { forceDemo: true });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some((t) => t.owner)).toBe(true);
  });

  it('assigns a task in demo fixtures', async () => {
    const updated = await assignTask('Inventory demo SKUs', 'Sara Demo', '900002', {
      forceDemo: true,
    });
    expect(updated?.owner).toBe('Sara Demo');
  });

  it('updates status in demo fixtures', async () => {
    const updated = await updateTaskStatus('Onboard support macros', 'Done', { forceDemo: true });
    expect(updated?.status).toBe('Done');
  });
});

describe('monday client (live wrapper mocked)', () => {
  it('posts GraphQL with Authorization header', async () => {
    process.env.MONDAY_API_TOKEN = 'test-token-not-real';

    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: { boards: [{ id: '111', name: 'Live Board', items_count: 2 }] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    const boards = await listBoards({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalled();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('monday.com');
    expect((init.headers as Record<string, string>).Authorization).toBe('test-token-not-real');
    expect(boards[0].name).toBe('Live Board');

    delete process.env.MONDAY_API_TOKEN;
  });
});
