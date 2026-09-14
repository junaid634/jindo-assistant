import { getConfig, hasHttpSms } from '../config';

export type SendSmsInput = {
  to: string;
  content: string;
  from?: string;
};

export type SendSmsResult = {
  ok: boolean;
  demo: boolean;
  id?: string;
  to: string;
  from: string;
  content: string;
  raw?: unknown;
  error?: string;
};

export type HttpSmsOptions = {
  fetchImpl?: typeof fetch;
  forceDemo?: boolean;
};

/**
 * POST {HTTPSMS_BASE_URL}/v1/messages/send
 * Header: x-api-key: {HTTPSMS_API_KEY}
 * Body: { from, to, content }
 */
export async function sendSms(
  input: SendSmsInput,
  opts?: HttpSmsOptions,
): Promise<SendSmsResult> {
  const cfg = getConfig();
  const from = input.from || cfg.httpsms.fromNumber || '+15550109999';
  const demo = opts?.forceDemo === true || !hasHttpSms(cfg);

  if (demo) {
    return {
      ok: true,
      demo: true,
      id: `demo-sms-${Date.now()}`,
      to: input.to,
      from,
      content: input.content,
      raw: { demo: true },
    };
  }

  const fetchImpl = opts?.fetchImpl || fetch;
  const url = `${cfg.httpsms.baseUrl}/v1/messages/send`;
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'x-api-key': cfg.httpsms.apiKey!,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: input.to,
        content: input.content,
      }),
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        demo: false,
        to: input.to,
        from,
        content: input.content,
        raw,
        error: `httpSMS ${res.status}`,
      };
    }
    const id =
      (raw as { data?: { id?: string } } | null)?.data?.id ||
      (raw as { id?: string } | null)?.id;
    return {
      ok: true,
      demo: false,
      id,
      to: input.to,
      from,
      content: input.content,
      raw,
    };
  } catch (e) {
    return {
      ok: false,
      demo: false,
      to: input.to,
      from,
      content: input.content,
      error: e instanceof Error ? e.message : 'send failed',
    };
  }
}
