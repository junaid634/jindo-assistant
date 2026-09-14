import type { ParsedIntent, IntentName } from './types';

const SMS_EXPLICIT =
  /\b(text|sms|notify|send\s+(?:an?\s+)?(?:sms|text|message)|message)\b/i;

function pickPerson(text: string): string | undefined {
  // "text Ali his tasks", "assign X to Sara", "report for Bilal"
  const patterns = [
    /\b(?:text|sms|notify|message)\s+([A-Za-z][A-Za-z'-]+)/i,
    /\b(?:for|about)\s+([A-Za-z][A-Za-z'-]+)/i,
    /\b(?:to|onto)\s+([A-Za-z][A-Za-z'-]+)/i,
    /\b([A-Za-z][A-Za-z'-]+)'s\s+(?:tasks?|work|items?)/i,
    /\bwho\s+(?:owns|has)\s+(.+?)(?:\?|$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const name = m[1].trim().replace(/[?.!,]+$/, '');
      if (!/^(a|an|the|my|his|her|their|me|today|tomorrow|tasks?|report|board|calendar)$/i.test(name)) {
        return name;
      }
    }
  }
  return undefined;
}

function intentOf(text: string): { intent: IntentName; confidence: number } {
  const t = text.toLowerCase().trim();

  if (/^(help|\?|what can you do|commands?)\b/.test(t) || t === 'hi' || t === 'hello') {
    return { intent: 'help', confidence: 0.95 };
  }
  if (/\b(boards?|list boards|show boards)\b/.test(t)) {
    return { intent: 'list_boards', confidence: 0.9 };
  }
  if (/\b(overdue|stale|late|past due)\b/.test(t)) {
    return { intent: 'overdue', confidence: 0.9 };
  }
  if (/\b(report|progress|summary|standup|today'?s report|status report)\b/.test(t)) {
    return { intent: 'report', confidence: 0.88 };
  }
  if (/\bwho\s+(owns|has|is assigned)\b/.test(t) || /\bowner of\b/.test(t)) {
    return { intent: 'who_owns', confidence: 0.9 };
  }
  if (/\b(assign|give|reassign)\b/.test(t)) {
    return { intent: 'assign_task', confidence: 0.9 };
  }
  if (/\b(update|set status|mark|change status|complete|done)\b/.test(t) && /\b(task|item|status)\b/.test(t)) {
    return { intent: 'update_task', confidence: 0.85 };
  }
  if (SMS_EXPLICIT.test(t) && /\btasks?\b/.test(t)) {
    return { intent: 'text_tasks', confidence: 0.92 };
  }
  if (SMS_EXPLICIT.test(t)) {
    return { intent: 'send_sms', confidence: 0.85 };
  }
  if (/\b(create|schedule|book|add)\b/.test(t) && /\b(meeting|event|call|appointment)\b/.test(t)) {
    return { intent: 'create_meeting', confidence: 0.9 };
  }
  if (/\b(calendar|agenda|what'?s on|upcoming|events?|meetings?)\b/.test(t)) {
    return { intent: 'list_calendar', confidence: 0.88 };
  }
  if (/\b(tasks?|items?|list tasks|my tasks|show tasks|what'?s open)\b/.test(t)) {
    return { intent: 'list_tasks', confidence: 0.8 };
  }
  return { intent: 'unknown', confidence: 0.2 };
}

function extractTaskQuery(text: string): string | undefined {
  const m =
    text.match(/\bassign\s+["']?(.+?)["']?\s+to\s+/i) ||
    text.match(/\bupdate\s+["']?(.+?)["']?\s+(?:to|status|as)\b/i) ||
    text.match(/\bwho\s+owns\s+["']?(.+?)["']?\s*$/i);
  return m?.[1]?.trim();
}

function extractStatus(text: string): string | undefined {
  const m = text.match(/\b(?:to|as|status)\s+["']?(done|working on it|stuck|in progress|not started|complete|completed)["']?/i);
  if (!m) return undefined;
  const s = m[1].toLowerCase();
  if (s === 'complete' || s === 'completed') return 'Done';
  if (s === 'in progress') return 'Working on it';
  return m[1];
}

function extractMeetingTitle(text: string): string | undefined {
  const m =
    text.match(/\b(?:meeting|event|call)\s+(?:called|titled|named)?\s*["']([^"']+)["']/i) ||
    text.match(/\b(?:schedule|create|book)\s+(?:a\s+)?(?:meeting|event|call)\s+(?:about|for|on)\s+(.+?)(?:\s+at\s+|\s+on\s+|$)/i);
  return m?.[1]?.trim();
}

function extractWhen(text: string): string | undefined {
  const m = text.match(/\b(?:at|on|tomorrow|today|next)\b[\s\S]{0,40}/i);
  return m?.[0]?.trim();
}

/**
 * Robust keyword/intent parser — works with zero LLM key.
 */
export function parseIntent(raw: string): ParsedIntent {
  const text = raw.trim();
  const { intent, confidence } = intentOf(text);
  const person = pickPerson(text);
  const taskQuery = extractTaskQuery(text);
  const status = extractStatus(text);
  const title = extractMeetingTitle(text) || (intent === 'create_meeting' ? 'Jindo meeting' : undefined);
  const when = extractWhen(text);

  let content: string | undefined;
  if (intent === 'send_sms') {
    const cm = text.match(/\b(?:saying|message|:)\s+["']?(.+?)["']?\s*$/i);
    content = cm?.[1]?.trim();
  }

  return {
    intent,
    confidence,
    person,
    taskQuery,
    status,
    title,
    when,
    durationMinutes: 30,
    content,
    raw: text,
  };
}

export function wantsExplicitNotify(text: string): boolean {
  return SMS_EXPLICIT.test(text);
}
