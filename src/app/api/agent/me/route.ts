import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentRequest, logAgentCall, getApiKey } from '@/lib/agent-auth';
import { getUserById } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: 获取当前用户信息和算力状态
export async function GET(request: NextRequest) {
  try {
    // 获取认证头
    const apiKey = request.headers.get('x-agent-api-key');
    const agentUserId = request.headers.get('x-agent-user-id');
    const timestamp = request.headers.get('x-agent-timestamp');
    const signature = request.headers.get('x-agent-signature');
    
    if (!apiKey || !agentUserId || !timestamp || !signature) {
      return NextResponse.json({
        success: false,
        error: '缺少认证参数',
      }, { status: 401 });
    }
    
    // 验证认证
    const authResult = await verifyAgentRequest(apiKey, agentUserId, timestamp, signature);
    
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
        code: authResult.code,
      }, { status: 401 });
    }
    
    const systemUserId = authResult.systemUserId!;
    const agentUser = authResult.agentUser!;
    
    // 获取用户信息
    const user = await getUserById(systemUserId);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在',
      }, { status: 404 });
    }
    
    // 计算剩余算力（使用 credits 字段）
    const currentCredits = user.credits ?? user.powerQuota;
    const isUnlimited = user.powerQuota === -1 || user.credits === -1;
    const remaining = isUnlimited ? -1 : Math.max(0, currentCredits);
    
    return NextResponse.json({
      success: true,
      data: {
        agentUser: {
          id: agentUser.id,
          agentType: agentUser.agentType,
          nickname: agentUser.nickname,
          isNew: authResult.agentUser?.id !== agentUser.id, // 标识是否是新用户
        },
        systemUser: {
          id: user.id,
          username: user.username,
          role: user.role,
          memberType: user.memberType,
          memberExpiry: user.memberExpiry,
        },
        power: {
          total: user.powerQuota,
          used: user.usedPower,
          credits: currentCredits,
          remaining: remaining,
          unlimited: isUnlimited,
        },
      },
    });
  } catch (error) {
    console.error('Agent me API error:', error);
    return NextResponse.json({
      success: false,
      error: '服务暂时不可用',
    }, { status: 500 });
  }
}
