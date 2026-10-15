/**
 * 代理为下级开通会员API
 * 
 * ⚠️ 此功能已禁用
 * 代理开通会员功能已移除，请使用兑换码方式为用户开通会员
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST: 代理为下级开通会员（已禁用）
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: '此功能已禁用，请使用兑换码方式为用户开通会员' 
    }, 
    { status: 403 }
  );
}
