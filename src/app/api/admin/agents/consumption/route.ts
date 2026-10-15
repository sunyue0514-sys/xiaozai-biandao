/**
 * 管理员查看所有代理消耗记录API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { SUPER_ADMIN_UIDS } from '@/lib/permissions';
import { getSessionUserId, hasSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    const client = getSupabaseClient();

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: '会话无效' }, { status: 401 });
    }

    // 获取用户信息
    const { data: user } = await client
      .from('users')
      .select('id, uid, role')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 401 });
    }

    // 验证是否是管理员或总代
    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const isSuperAdmin = user.role === 'super_admin';
    
    // 获取当前用户的代理账户
    const { data: currentAgent } = await client
      .from('agent_accounts')
      .select('id, agent_level')
      .eq('user_id', user.id)
      .single();

    const isAgentAdmin = currentAgent && (currentAgent.agent_level === 0 || currentAgent.agent_level === 1);

    if (!isSuperAdmin && !isAgentAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: '无权限查看' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '200');

    // 构建查询
    let query = client
      .from('code_consumption_records')
      .select('id, agent_id, agent_uid, code, code_type, points_cost, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // 如果不是超级管理员，只能看下级的消耗记录
    if (!isSuperAdmin && currentAgent) {
      // 获取所有下级代理ID
      const { data: subAgents } = await client
        .from('agent_accounts')
        .select('id')
        .eq('parent_id', currentAgent.id);

      if (subAgents && subAgents.length > 0) {
        const subAgentIds = subAgents.map(a => a.id);
        query = query.in('agent_id', subAgentIds);
      } else {
        // 没有下级代理，返回空数据
        return NextResponse.json({ 
          success: true, 
          data: [] 
        });
      }
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('[消耗记录查询] 错误:', error);
      return NextResponse.json({ 
        success: false, 
        error: '查询失败' 
      }, { status: 500 });
    }

    const result = (records || []).map(record => ({
      id: record.id,
      agentId: record.agent_id,
      agentUid: record.agent_uid,
      code: record.code,
      codeType: record.code_type,
      pointsCost: record.points_cost,
      createdAt: record.created_at,
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: result 
    });

  } catch (error) {
    console.error('[消耗记录查询] 错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '查询失败' 
    }, { status: 500 });
  }
}
