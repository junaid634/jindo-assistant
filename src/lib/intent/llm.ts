import { getConfig } from '../config';
import { parseIntent } from './parser';
import type { ParsedIntent, IntentName } from './types';

const INTENT_NAMES: IntentName[] = [
  'list_boards',
  'list_tasks',
  'who_owns',
  'assign_task',
  'update_task',
  'overdue',
  'report',
  'text_tasks',
  'send_sms',
  'list_calendar',
  'create_meeting',
  'help',
  'unknown',
];

export async function parseIntentSmart(raw: string): Promise<ParsedIntent> {
  const fallback = parseIntent(raw);
  const cfg = getConfig();
  if (!cfg.openai.apiKey) return fallback;

  try {
    const system = `You parse commands for Jindo, a personal ops assistant.
Return ONLY compact JSON with keys: intent, confidence (0-1), person?, taskQuery?, status?, title?, when?, durationMinutes?, content?, boardId?.
intent must be one of: ${INTENT_NAMES.join(', ')}.
Never invent phone numbers. SMS intents only when user explicitly says text/notify/send/sms/message.`;

    const res = await fetch(`${cfg.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.openai.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: raw },
        ],
      }),
    });

    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content) as Partial<ParsedIntent>;
    const intent = INTENT_NAMES.includes(parsed.intent as IntentName)
      ? (parsed.intent as IntentName)
      : fallback.intent;
    return {
      ...fallback,
      ...parsed,
      intent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : fallback.confidence,
      raw,
    };
  } catch {
    return fallback;
  }
}
