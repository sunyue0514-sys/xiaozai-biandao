import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserById } from '@/lib/store';

// 算力消耗规则（乘以1.5倍后的值）
const POWER_CONSUMPTION_RULES = {
  // ============ 轻度功能 ============
  // 基础AI对话（每100字消耗75算力）
  chat: { baseCost: 75, perCharCost: 0.75 },
  
  // 开场白生成（每100字消耗75算力）
  opening: { baseCost: 75, perCharCost: 0.75 },
  
  // 智能超级编导对话（每次75算力）
  superDirectorChat: { baseCost: 75, perCharCost: 0 },
  
  // 千川智能分析（每次75算力）
  qianchuanAnalysis: { baseCost: 75, perCharCost: 0 },
  
  // 智能推导段落修改（每次75算力）
  creativeEdit: { baseCost: 75, perCharCost: 0 },
  
  // ============ 中度功能 ============
  // 脚本生成（每100字消耗150算力）
  script: { baseCost: 150, perCharCost: 1.5 },
  
  // 快速创作（每100字消耗150算力）
  quickCreate: { baseCost: 150, perCharCost: 1.5 },
  
  // AI辅助填充（每次225算力）
  autoFill: { baseCost: 225, perCharCost: 0 },
  
  // 千川文案生成（每100字消耗225算力）
  qianchuanCopywriting: { baseCost: 225, perCharCost: 2.25 },
  
  // 信息流广告文案（每100字消耗225算力）
  feedCopywriting: { baseCost: 225, perCharCost: 2.25 },
  
  // 素材生成（每100字消耗225算力）
  material: { baseCost: 225, perCharCost: 2.25 },
  
  // 选题推荐（每次375算力）
  topic: { baseCost: 375, perCharCost: 0 },
  
  // 报告优化（每次375算力）
  polish: { baseCost: 375, perCharCost: 0 },
  
  // 直播话术生成（每次450算力）
  liveSpeech: { baseCost: 450, perCharCost: 0 },
  
  // ============ 重度功能 ============
  // 批量开篇生成（每次800算力，生成6个开篇）
  batchOpening: { baseCost: 800, perCharCost: 0 },
  
  // 批量选题生成（每次800算力，生成24个选题）
  batchTopic: { baseCost: 800, perCharCost: 0 },
  
  // 千川脚本生成（每100字消耗500算力）
  qianchuanScript: { baseCost: 500, perCharCost: 5 },
  
  // 信息流广告脚本（每100字消耗300算力）
  feedScript: { baseCost: 300, perCharCost: 3 },
  
  // 视频快速分析（每次300算力）
  videoQuickAnalysis: { baseCost: 300, perCharCost: 0 },
  
  // 智能推导一键润色（每次150算力）
  creativePolish: { baseCost: 150, perCharCost: 0 },
  
  // 智能推导创作（每次900算力）
  creativeGenerate: { baseCost: 900, perCharCost: 0 },
  
  // 数据分析（每次1000算力）
  dataAnalysis: { baseCost: 1000, perCharCost: 0 },
  
  // 业务分析（每次1000算力）
  businessAnalysis: { baseCost: 1000, perCharCost: 0 },
  
  // 数据报告（每次1000算力）
  dataReport: { baseCost: 1000, perCharCost: 0 },
  
  // 视频深度分析（每次1500算力，Vision模型成本高）
  videoDeepAnalysis: { baseCost: 1500, perCharCost: 0 },
  
  // 客户定位分析/IP定位（每次2000算力）
  positioning: { baseCost: 2000, perCharCost: 0 },
  
  // 账号规划生成（每次2500算力，整合IP定位+问卷+知识库）
  accountPlanning: { baseCost: 2500, perCharCost: 0 },
};

// 检查用户是否有足够的算力
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '会话无效' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查算力状态（已取消会员制度，只检查算力）
    const isAdmin = ['admin', 'super_admin'].includes(user.role);
    const isUnlimited = isAdmin || user.powerQuota === -1 || user.credits === -1;
    
    // 检查算力是否过期（非无限算力用户）
    if (!isUnlimited) {
      if (user.powerExpiry && new Date(user.powerExpiry) < new Date()) {
        return NextResponse.json(
          { 
            success: false, 
            error: '算力已过期，请充值后继续使用',
            code: 'POWER_EXPIRED'
          },
          { status: 403 }
        );
      }
    }

    // 解析请求体
    const body = await request.json();
    const { action, charCount = 0, estimatedCost } = body;
    if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(POWER_CONSUMPTION_RULES, action) ||
        !Number.isSafeInteger(charCount) || charCount < 0 || charCount > 100000 ||
        (estimatedCost !== undefined && (typeof estimatedCost !== 'number' || !Number.isFinite(estimatedCost) || estimatedCost < 0))) {
      return NextResponse.json({ success: false, error: 'Invalid consumption estimate' }, { status: 400 });
    }

    if (isUnlimited) {
      return NextResponse.json({
        success: true,
        data: {
          canProceed: true,
          cost: 0,
          remaining: -1,
          unlimited: true,
        },
      });
    }

    // 计算消耗的算力
    const rule = POWER_CONSUMPTION_RULES[action as keyof typeof POWER_CONSUMPTION_RULES];
    const cost = Math.ceil(rule.baseCost + rule.perCharCost * charCount);

    // This public endpoint is a balance preflight, never a trusted ledger debit.
    const currentCredits = user.credits ?? user.powerQuota;
    const remainingFromQuota = Math.max(0, user.powerQuota - user.usedPower);
    const remaining = user.credits !== undefined ? currentCredits : remainingFromQuota;
    
    if (remaining < cost) {
      return NextResponse.json(
        { 
          success: false, 
          error: '算力不足，请充值或升级会员',
          code: 'INSUFFICIENT_POWER',
          data: {
            required: cost,
            remaining: remaining,
          }
        },
        { status: 403 }
      );
    }

    // 扣除算力：同时更新 credits 和 usedPower
    const newCredits = remaining;

    return NextResponse.json({
      success: true,
      data: {
        canProceed: true,
        cost: cost,
        checkOnly: true,
        remaining: newCredits,
        unlimited: false,
      },
    });
  } catch (error) {
    console.error('算力消耗失败:', error);
    return NextResponse.json(
      { success: false, error: '算力消耗失败' },
      { status: 500 }
    );
  }
}

// 获取算力余额（GET请求）
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '会话无效' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 管理员或无限算力用户
    const isAdmin = user.role === 'admin';
    const isUnlimited = isAdmin || user.powerQuota === -1 || user.credits === -1;

    if (isUnlimited) {
      return NextResponse.json({
        success: true,
        data: {
          remaining: -1,
          total: -1,
          used: user.usedPower,
          unlimited: true,
          memberExpired: false,
          isMember: true,
          memberType: 'permanent',
        },
      });
    }

    const currentCredits = user.credits ?? user.powerQuota;
    const remainingFromQuota = Math.max(0, user.powerQuota - user.usedPower);
    const remaining = user.credits !== undefined ? currentCredits : remainingFromQuota;
    
    return NextResponse.json({
      success: true,
      data: {
        remaining: remaining,
        total: user.powerQuota,
        used: user.usedPower,
        credits: currentCredits,
        unlimited: false,
        memberExpired: false,
        isMember: false,
        memberType: 'none',
      },
    });
  } catch (error) {
    console.error('获取算力失败:', error);
    return NextResponse.json(
      { success: false, error: '获取算力失败' },
      { status: 500 }
    );
  }
}
