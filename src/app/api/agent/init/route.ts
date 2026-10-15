/**
 * 智能体 API Key 初始化接口
 * 用于在网页后台创建智能体的 API Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUser } from '@/lib/session';
import { randomBytes, createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份（需要登录）
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '需要登录' },
        { status: 401 }
      );
    }

    // 验证 session
    const isValidSession = await hasSession(token);
    if (!isValidSession) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户验证失败' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户信息不存在' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const supabase = getSupabaseClient();
    
    // 检查是否已存在该用户的 API Key
    const { data: existingKey } = await supabase
      .from('agent_api_keys')
      .select('id, api_key, name, status, rate_limit, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existingKey) {
      return NextResponse.json({
        success: true,
        data: {
          id: existingKey.id,
          name: existingKey.name,
          apiKey: existingKey.api_key,
          status: existingKey.status,
          rateLimit: existingKey.rate_limit,
          createdAt: existingKey.created_at,
          message: '您已有活跃的 API Key，Secret Key 仅在首次创建时显示一次'
        }
      });
    }

    // 生成 API Key 和 Secret Key
    const apiKey = `sk_agent_${randomBytes(24).toString('hex')}`;
    const secretKey = randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(secretKey).digest('hex');

    // 插入数据库
    const { data: newKey, error: insertError } = await supabase
      .from('agent_api_keys')
      .insert({
        user_id: userId,
        api_key: apiKey,
        key_hash: keyHash,
        name: 'Default Coze Agent Key',
        status: 'active',
        rate_limit: 100
      })
      .select('id, name, api_key, status, rate_limit, created_at')
      .single();

    if (insertError) {
      console.error('Failed to create API key:', insertError);
      return NextResponse.json(
        { error: 'InternalError', message: '创建 API Key 失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newKey.id,
        name: newKey.name,
        apiKey: newKey.api_key,
        secretKey: secretKey,  // 仅在此返回一次！
        status: newKey.status,
        rateLimit: newKey.rate_limit,
        createdAt: newKey.created_at
      },
      warning: '⚠️ Secret Key 仅显示一次，请立即保存到安全位置！'
    });

  } catch (error) {
    console.error('Agent init error:', error);
    return NextResponse.json(
      { error: 'InternalError', message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取用户的 API Key 列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '需要登录' },
        { status: 401 }
      );
    }

    // 验证 session
    const isValidSession = await hasSession(token);
    if (!isValidSession) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户验证失败' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '用户信息不存在' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const supabase = getSupabaseClient();

    // 获取用户的 API Key 列表（不返回 secret_key）
    const { data: keys, error } = await supabase
      .from('agent_api_keys')
      .select('id, name, api_key, status, rate_limit, created_at, last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch API keys:', error);
      return NextResponse.json(
        { error: 'InternalError', message: '获取 API Key 失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: keys || []
    });

  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { error: 'InternalError', message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
