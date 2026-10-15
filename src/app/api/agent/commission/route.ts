import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const userInfo = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!userInfo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'super_admin'].includes(userInfo.role)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: false, error: 'Financial write service is disabled until an atomic, idempotent ledger is configured', code: 'FINANCIAL_SERVICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 });
  }
}
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const user = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ success: false, error: 'Legacy in-memory commissions are retired; use /api/agent/commissions', code: 'LEGACY_SERVICE_RETIRED' }, { status: 410 });
  } catch { return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 }); }
}
