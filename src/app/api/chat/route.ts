import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { handleCommand } from '@/lib/assistant/handler';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (cfg.pin) {
    const ok = req.cookies.get('jindo_pin_ok')?.value === '1';
    if (!ok) {
      return NextResponse.json({ error: 'PIN required' }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const message = (body.message || '').trim();
  if (!message) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  try {
    const result = await handleCommand(message);
    return NextResponse.json({
      reply: result.reply,
      intent: result.intent.intent,
      confidence: result.intent.confidence,
      demo: result.demo,
      outboundSms: result.outboundSms,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Command failed';
    return NextResponse.json(
      { reply: `Something went wrong: ${msg}`, error: msg },
      { status: 500 },
    );
  }
}
