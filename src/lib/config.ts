import { readFileSync, existsSync } from 'fs';
import path from 'path';

export type AppConfig = {
  userName: string;
  timezone: string;
  pin: string | null;
  monday: {
    token: string | null;
    defaultBoardId: string | null;
    apiUrl: string;
    personColumnId: string;
    statusColumnId: string;
    dateColumnId: string;
  };
  httpsms: {
    baseUrl: string;
    apiKey: string | null;
    fromNumber: string | null;
  };
  google: {
    calendarId: string | null;
    serviceAccountJson: string | null;
    clientId: string | null;
    clientSecret: string | null;
    refreshToken: string | null;
  };
  openai: {
    apiKey: string | null;
    baseUrl: string;
    model: string;
  };
};

export function getConfig(): AppConfig {
  return {
    userName: process.env.ASSISTANT_USER_NAME || 'Junaid Khan',
    timezone: process.env.ASSISTANT_TIMEZONE || 'Asia/Karachi',
    pin: process.env.ASSISTANT_PIN?.trim() || null,
    monday: {
      token: process.env.MONDAY_API_TOKEN?.trim() || null,
      defaultBoardId: process.env.MONDAY_DEFAULT_BOARD_ID?.trim() || null,
      apiUrl: process.env.MONDAY_API_URL || 'https://api.monday.com/v2',
      personColumnId: process.env.MONDAY_PERSON_COLUMN_ID || 'person',
      statusColumnId: process.env.MONDAY_STATUS_COLUMN_ID || 'status',
      dateColumnId: process.env.MONDAY_DATE_COLUMN_ID || 'date',
    },
    httpsms: {
      baseUrl: (process.env.HTTPSMS_BASE_URL || 'https://api.httpsms.com').replace(/\/$/, ''),
      apiKey: process.env.HTTPSMS_API_KEY?.trim() || null,
      fromNumber: process.env.HTTPSMS_FROM_NUMBER?.trim() || null,
    },
    google: {
      calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || null,
      serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || null,
      clientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || null,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN?.trim() || null,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY?.trim() || null,
      baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
  };
}

export function hasMonday(cfg = getConfig()): boolean {
  return Boolean(cfg.monday.token);
}

export function hasHttpSms(cfg = getConfig()): boolean {
  return Boolean(cfg.httpsms.apiKey && cfg.httpsms.fromNumber);
}

export function hasCalendar(cfg = getConfig()): boolean {
  return Boolean(
    cfg.google.calendarId &&
      (cfg.google.serviceAccountJson ||
        (cfg.google.clientId && cfg.google.clientSecret && cfg.google.refreshToken)),
  );
}

/** Banner / overall demo when any primary integration is missing. */
export function isDemoMode(cfg = getConfig()): boolean {
  return !(hasMonday(cfg) && hasHttpSms(cfg) && hasCalendar(cfg));
}

export function integrationStatus(cfg = getConfig()) {
  return {
    demo: isDemoMode(cfg),
    monday: hasMonday(cfg),
    httpsms: hasHttpSms(cfg),
    calendar: hasCalendar(cfg),
    openai: Boolean(cfg.openai.apiKey),
    pinRequired: Boolean(cfg.pin),
  };
}

export function employeesPath(): string {
  return path.join(process.cwd(), 'data', 'employees.json');
}

export function loadEmployeesFile(): unknown {
  const p = employeesPath();
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8'));
}
