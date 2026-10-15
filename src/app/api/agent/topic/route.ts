import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentRequest } from '@/lib/agent-auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-agent-api-key');
    const agentUserId = request.headers.get('x-agent-user-id');
    const timestamp = request.headers.get('x-agent-timestamp');
    const signature = request.headers.get('x-agent-signature');
    if (!apiKey || !agentUserId || !timestamp || !signature) return NextResponse.json({ success: false, error: 'Missing agent authentication' }, { status: 401 });
    const auth = await verifyAgentRequest(apiKey, agentUserId, timestamp, signature);
    if (!auth.success || !auth.systemUserId || !auth.agentUser) return NextResponse.json({ success: false, error: 'Invalid agent authentication' }, { status: 401 });
    return NextResponse.json({ success: false, error: 'Paid agent generation is disabled until atomic usage reservation and settlement are available', code: 'USAGE_LEDGER_UNAVAILABLE' }, { status: 503 });
  } catch { return NextResponse.json({ success: false, error: 'Unable to verify agent authorization' }, { status: 503 }); }
}
