import { NextResponse } from 'next/server';
import { getConfig, integrationStatus } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET() {
  const cfg = getConfig();
  const status = integrationStatus(cfg);
  return NextResponse.json({
    ok: true,
    userName: cfg.userName,
    timezone: cfg.timezone,
    ...status,
  });
}
