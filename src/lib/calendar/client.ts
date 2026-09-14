import { readFileSync, existsSync } from 'fs';
import { google } from 'googleapis';
import { getConfig, hasCalendar } from '../config';
import { demoCreateEvent, demoListEvents, type CalendarEvent } from './demo';

export type CalendarOptions = { forceDemo?: boolean };

async function getAuthClient() {
  const cfg = getConfig();
  if (cfg.google.serviceAccountJson) {
    const path = cfg.google.serviceAccountJson;
    if (!existsSync(path)) throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON not found: ${path}`);
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      client_email: string;
      private_key: string;
    };
    const auth = new google.auth.JWT({
      email: raw.client_email,
      key: raw.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return auth;
  }
  if (cfg.google.clientId && cfg.google.clientSecret && cfg.google.refreshToken) {
    const oauth2 = new google.auth.OAuth2(cfg.google.clientId, cfg.google.clientSecret);
    oauth2.setCredentials({ refresh_token: cfg.google.refreshToken });
    return oauth2;
  }
  throw new Error('Google Calendar auth not configured');
}

export async function listUpcomingEvents(
  limit = 8,
  opts?: CalendarOptions,
): Promise<{ demo: boolean; events: CalendarEvent[] }> {
  const cfg = getConfig();
  if (opts?.forceDemo || !hasCalendar(cfg)) {
    return { demo: true, events: demoListEvents(limit) };
  }
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: cfg.google.calendarId!,
    timeMin: new Date().toISOString(),
    maxResults: limit,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events: CalendarEvent[] = (res.data.items || []).map((e) => ({
    id: e.id || `evt-${Math.random()}`,
    summary: e.summary || '(no title)',
    start: e.start?.dateTime || e.start?.date || '',
    end: e.end?.dateTime || e.end?.date || '',
    htmlLink: e.htmlLink || undefined,
  }));
  return { demo: false, events };
}

function parseWhen(when: string | undefined, timezone: string): { start: Date; end: Date } {
  const now = new Date();
  let start = new Date(now.getTime() + 3600000);
  const lower = (when || '').toLowerCase();
  if (lower.includes('tomorrow')) {
    start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
  } else if (lower.includes('today')) {
    start = new Date(now);
    start.setHours(Math.max(now.getHours() + 1, 10), 0, 0, 0);
  }
  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch) {
    let h = Number(timeMatch[1]);
    const m = Number(timeMatch[2] || 0);
    const ap = timeMatch[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    start.setHours(h, m, 0, 0);
  }
  void timezone;
  const end = new Date(start.getTime() + 30 * 60000);
  return { start, end };
}

export async function createMeeting(
  title: string,
  when?: string,
  durationMinutes = 30,
  opts?: CalendarOptions,
): Promise<{ demo: boolean; event: CalendarEvent }> {
  const cfg = getConfig();
  const { start, end: defaultEnd } = parseWhen(when, cfg.timezone);
  const end = new Date(start.getTime() + (durationMinutes || 30) * 60000);
  void defaultEnd;

  if (opts?.forceDemo || !hasCalendar(cfg)) {
    return {
      demo: true,
      event: demoCreateEvent(title, start.toISOString(), end.toISOString()),
    };
  }

  const auth = await getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.insert({
    calendarId: cfg.google.calendarId!,
    requestBody: {
      summary: title,
      start: { dateTime: start.toISOString(), timeZone: cfg.timezone },
      end: { dateTime: end.toISOString(), timeZone: cfg.timezone },
    },
  });
  const e = res.data;
  return {
    demo: false,
    event: {
      id: e.id || `evt-${Date.now()}`,
      summary: e.summary || title,
      start: e.start?.dateTime || start.toISOString(),
      end: e.end?.dateTime || end.toISOString(),
      htmlLink: e.htmlLink || undefined,
    },
  };
}
