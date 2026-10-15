import { NextRequest, NextResponse } from 'next/server';
import { checkApiBoundary } from '@/lib/api-boundary';

export async function proxy(request: NextRequest) {
  return await checkApiBoundary(request) || NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
