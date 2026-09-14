import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!cfg.pin) {
    return NextResponse.json({ ok: true, required: false });
  }
  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  if (body.pin === cfg.pin) {
    const res = NextResponse.json({ ok: true, required: true });
    res.cookies.set('jindo_pin_ok', '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }
  return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
}

export async function GET() {
  const cfg = getConfig();
  return NextResponse.json({ required: Boolean(cfg.pin) });
}
