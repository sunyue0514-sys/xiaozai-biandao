import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { getUserById, getCustomerById } from '@/lib/store';

// 获取全局任务存储
function getGlobalTasksStore() {
  if (!(global as any).automationTasks) {
    (global as any).automationTasks = new Map<string, any>();
  }
  return (global as any).automationTasks;
}

// 生成唯一ID
function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 算力消耗规则（对齐 POWER_CONSUMPTION_RULES）
const POWER_COSTS = {
  topic: 250,      // 选题：每次250算力（对齐 topic 规则）
  script: 100,     // 文案：基础100（字数消耗在执行时计算，每字1算力）
  fullscript: 150, // 脚本：基础150（字数消耗在执行时计算，每字1.5算力）
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const rate = checkRateLimit('automation-create:' + userId, RATE_LIMITS.general);
    if (!rate.allowed) return createRateLimitResponse(rate.resetTime);
    const tasks = getGlobalTasksStore();
    if (Array.from(tasks.values()).filter((task: any) => task.userId === String(userId) && task.status === 'pending').length >= 20) {
      return NextResponse.json({ error: 'Too many pending drafts' }, { status: 409 });
    }
    const body = await request.json();
    const { 
      customerId, 
      customerName, 
      ipPositioning,
      contentTypes, 
      scriptType, 
      count, 
      wordCount,
      scriptWordCount,
      requirements, 
      executeMode, 
      scheduledTime,
      estimatedPower 
    } = body;

    // 验证必填字段
    if (!Number.isSafeInteger(customerId) || customerId <= 0 || !Number.isSafeInteger(count) || count < 1 || count > 20 ||
        !Array.isArray(contentTypes) || contentTypes.length < 1 || contentTypes.length > 3 ||
        new Set(contentTypes).size !== contentTypes.length || contentTypes.some(type => !['topic', 'script', 'fullscript'].includes(type)) ||
        !['story', 'process', 'knowledge', 'opinion', 'product'].includes(scriptType) ||
        !['immediate', 'scheduled'].includes(executeMode) ||
        (executeMode === 'scheduled' && (!scheduledTime || !Number.isFinite(Date.parse(scheduledTime)))) ||
        [wordCount, scriptWordCount, requirements].some(value => value !== undefined && (typeof value !== 'string' || value.length > 10000))) {
      return NextResponse.json({ success: false, error: 'Invalid automation parameters' }, { status: 400 });
    }
    const customer = await getCustomerById(customerId);
    if (!customer || customer.uid !== String(userId)) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      );
    }

    // 检查算力状态（已取消会员制度，只检查算力）
    const isAdmin = user.role === 'admin';
    const isUnlimited = isAdmin || user.powerQuota === -1 || user.credits === -1;
    
    // 检查算力是否充足
    if (!isUnlimited) {
      // 检查算力是否过期
      if (user.powerExpiry && new Date(user.powerExpiry) < new Date()) {
        return NextResponse.json(
          { success: false, error: '算力已过期，请充值后继续使用', code: 'POWER_EXPIRED' },
          { status: 403 }
        );
      }
    }

    // 计算并扣除算力
    let powerConsumed = 0;
    if (!isUnlimited) {
      // 计算基础算力消耗（选题）
      if (contentTypes.includes('topic')) {
        powerConsumed += POWER_COSTS.topic * count;
      }
      // 文案和脚本的基础消耗（字数消耗在执行时估算）
      if (contentTypes.includes('script')) {
        powerConsumed += POWER_COSTS.script * count;
      }
      if (contentTypes.includes('fullscript')) {
        powerConsumed += POWER_COSTS.fullscript * count;
      }
      
      // 检查剩余算力（使用 credits 字段）
      const currentCredits = user.credits ?? user.powerQuota;
      const remaining = Math.max(0, currentCredits);
      if (remaining < powerConsumed) {
        return NextResponse.json(
          { success: false, error: '算力不足，请充值后继续', code: 'INSUFFICIENT_POWER', required: powerConsumed, remaining },
          { status: 403 }
        );
      }
      
      // 扣除算力：同时更新 credits 和 usedPower

    }

    // 计算总步数：每个内容类型 * 数量
    const totalSteps = contentTypes.length * count;

    // 创建任务
    const taskId = generateId();
    const task = {
      id: taskId,
      userId: userId.toString(),
      customerId,
      customerName: customer.name,
      ipPositioning: customer.ipPositioning,
      contentTypes,
      scriptType,
      count: count,
      wordCount: wordCount || '',
      scriptWordCount: scriptWordCount || '',
      requirements: requirements || '',
      executeMode,
      scheduledTime: scheduledTime || null,
      status: 'pending', // Draft only; durable execution is not enabled.
      progress: 0,
      total: totalSteps,
      powerConsumed: 0,
      estimatedPower: powerConsumed,
      executionAvailable: false,
      createdAt: new Date().toISOString(),
      results: [],
    };

    // 保存任务
    const store = getGlobalTasksStore();
    store.set(taskId, task);

    return NextResponse.json({
      success: true,
      taskId,
      powerConsumed: 0,
      estimatedPower: powerConsumed,
      executionAvailable: false,
      message: '草稿已保存；执行未启用，未扣积分',
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { success: false, error: '创建任务失败' },
      { status: 500 }
    );
  }
}
