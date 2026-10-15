import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSessionUserInfo } from '@/lib/session';
import { getApiPolicy } from '@/lib/api-policy';

export async function checkApiBoundary(request: NextRequest): Promise<NextResponse | null> {
  const policy = getApiPolicy(new URL(request.url).pathname, request.method);
  const authorization = request.headers.get('authorization');
  const origin = request.headers.get('origin');
  const cookieToken = request.cookies.get('sessionToken')?.value;
  if (origin && cookieToken && !authorization && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const trusted = new Set([new URL(request.url).origin, ...(process.env.TRUSTED_APP_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]);
    if (!trusted.has(origin)) return NextResponse.json({ success: false, error: 'Untrusted request origin' }, { status: 403 });
  }
  if (policy === 'public' || policy === 'secret') return null;
  const bearer = authorization?.match(/^Bearer\s+(\S+)$/iu)?.[1];
  const token = bearer || cookieToken;
  if (!token || token.length > 512) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const user = await getSessionUserInfo(token);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (policy === 'admin' && user.role !== 'admin' && user.role !== 'super_admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    return null;
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication service unavailable' }, { status: 503 });
  }
}
