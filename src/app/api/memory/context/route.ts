import { getCustomerById } from '@/lib/db-store';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { buildEnhancedContext, calculateMemoryConfidence } from '@/lib/memory-system/enhancer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/memory/context
 * 获取记忆增强的生成上下文
 * 在生成内容前调用
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, customerName, ipPositioning, topic, scriptType } = body;

    // 构建记忆增强上下文
    if (customerId !== undefined && customerId !== null && customerId !== 0) {
      if (!Number.isSafeInteger(customerId) || customerId <= 0) return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
      const customer = await getCustomerById(customerId);
      if (!customer || customer.uid !== String(userId)) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const context = await buildEnhancedContext(String(userId), {
      customerId,
      customerName,
      ipPositioning,
      topic,
      scriptType,
    });

    // 计算置信度
    const confidence = calculateMemoryConfidence(context);

    return NextResponse.json({ 
      success: true, 
      data: {
        context,
        confidence,
        hasMemory: confidence > 20,
        message: confidence > 50 
          ? '已加载你的创作经验，AI会更懂你的风格' 
          : confidence > 20 
            ? '已加载部分记忆，继续创作可以让AI更懂你'
            : '还没有足够的记忆，快去创作更多内容吧',
      }
    });
  } catch (error) {
    console.error('获取记忆上下文失败:', error);
    return NextResponse.json(
      { error: '获取记忆上下文失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/memory/context/status
 * 获取记忆系统状态
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    // 获取基础状态
    const context = await buildEnhancedContext(String(userId), {});
    const confidence = calculateMemoryConfidence(context);
    
    const status = {
      hasProfile: !!context.memoryContext?.styleProfile,
      totalHits: context.memoryContext?.styleProfile?.totalHits || 0,
      totalContents: context.memoryContext?.styleProfile?.totalContents || 0,
      confidence,
      learningProgress: context.memoryContext?.styleProfile?.learningProgress || 0,
      lastLearnedAt: context.memoryContext?.styleProfile?.lastLearnedAt,
    };

    return NextResponse.json({ 
      success: true, 
      data: status,
    });
  } catch (error) {
    console.error('获取记忆状态失败:', error);
    return NextResponse.json(
      { error: '获取记忆状态失败' },
      { status: 500 }
    );
  }
}
