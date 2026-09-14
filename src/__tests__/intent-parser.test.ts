import { describe, expect, it } from 'vitest';
import { parseIntent, wantsExplicitNotify } from '@/lib/intent/parser';

describe('parseIntent', () => {
  it('parses list boards', () => {
    expect(parseIntent('list boards').intent).toBe('list_boards');
  });

  it('parses report', () => {
    expect(parseIntent("today's report").intent).toBe('report');
  });

  it('parses overdue', () => {
    expect(parseIntent('show overdue tasks').intent).toBe('overdue');
  });

  it('parses assign with person and task', () => {
    const p = parseIntent('assign Prepare weekly ops digest to Ali');
    expect(p.intent).toBe('assign_task');
    expect(p.person?.toLowerCase()).toBe('ali');
    expect(p.taskQuery?.toLowerCase()).toContain('prepare');
  });

  it('parses text tasks with explicit notify', () => {
    const p = parseIntent('text Ali his tasks');
    expect(p.intent).toBe('text_tasks');
    expect(p.person?.toLowerCase()).toBe('ali');
    expect(wantsExplicitNotify(p.raw)).toBe(true);
  });

  it('does not treat plain task list as SMS', () => {
    expect(wantsExplicitNotify('Ali tasks please')).toBe(false);
  });

  it('parses calendar', () => {
    expect(parseIntent("what's on the calendar").intent).toBe('list_calendar');
  });

  it('parses create meeting', () => {
    const p = parseIntent('schedule a meeting about vendors tomorrow at 3pm');
    expect(p.intent).toBe('create_meeting');
  });

  it('parses who owns', () => {
    const p = parseIntent('who owns Fix SMS delivery retries');
    expect(p.intent).toBe('who_owns');
  });

  it('help', () => {
    expect(parseIntent('help').intent).toBe('help');
  });
});
