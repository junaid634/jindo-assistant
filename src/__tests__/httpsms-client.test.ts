import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sendSms } from '@/lib/httpsms/client';

describe('httpsms client', () => {
  beforeEach(() => {
    delete process.env.HTTPSMS_API_KEY;
    delete process.env.HTTPSMS_FROM_NUMBER;
  });

  it('demo mode returns ok without network', async () => {
    const fetchImpl = vi.fn();
    const result = await sendSms(
      { to: '+15550101001', content: 'hello demo' },
      { fetchImpl: fetchImpl as unknown as typeof fetch, forceDemo: true },
    );
    expect(result.ok).toBe(true);
    expect(result.demo).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts to /v1/messages/send with x-api-key', async () => {
    process.env.HTTPSMS_BASE_URL = 'https://api.httpsms.com';
    process.env.HTTPSMS_API_KEY = 'test-httpsms-key';
    process.env.HTTPSMS_FROM_NUMBER = '+15550109999';

    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({
        from: '+15550109999',
        to: '+15550101002',
        content: 'ping',
      });
      return new Response(JSON.stringify({ data: { id: 'msg-1' }, status: 'success' }), {
        status: 200,
      });
    });

    const result = await sendSms(
      { to: '+15550101002', content: 'ping' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(fetchImpl).toHaveBeenCalled();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.httpsms.com/v1/messages/send');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-httpsms-key');
    expect(result.ok).toBe(true);
    expect(result.demo).toBe(false);
    expect(result.id).toBe('msg-1');

    delete process.env.HTTPSMS_API_KEY;
    delete process.env.HTTPSMS_FROM_NUMBER;
  });
});
