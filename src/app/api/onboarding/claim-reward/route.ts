import { NextResponse } from 'next/server';
import { getSessionUserId, hasSession, getSessionUserInfo } from '@/lib/session';

/**
 * 从请求中获取用户ID
 */
async function getUserIdFromRequest(request: Request): Promise<number | null> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const tokenFromCookie = request.headers.get('cookie')?.match(/sessionToken=([^;]+)/)?.[1];
  const token = tokenFromHeader || tokenFromCookie;
  
  if (!token) return null;
  
  const isValid = await hasSession(token);
  if (!isValid) return null;
  
  return (await getSessionUserInfo(token))?.id ?? null;
}

/**
 * POST /api/onboarding/claim-reward
 * 领取任务奖励（完成所有任务后）
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    return NextResponse.json({ success: false, rewardsAvailable: false, error: '奖励发放暂未启用：原子事务与幂等校验尚未验收，积分及奖励状态未变更', code: 'REWARD_TRANSACTION_UNAVAILABLE' }, { status: 503 });
  } catch (error) {
    console.error('领取奖励失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
