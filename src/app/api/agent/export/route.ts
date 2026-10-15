/**
 * 数据导出API
 * 
 * 功能：
 * 1. 导出下级代理消耗统计（CSV格式）
 * 2. 导出消耗明细记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { SUPER_ADMIN_UIDS } from '@/lib/permissions';
import { getSessionUserId, hasSession } from '@/lib/session';
import { 
  getSubAgentsConsumptionStats,
  getAgentConsumptionRecords,
} from '@/lib/points-service';
import { CODE_TYPE_NAMES, CodeType } from '@/lib/points-config';

/**
 * GET: 导出数据
 * 
 * 参数：
 * - type: sub_stats(下级统计) | consumption(消耗明细)
 * - startDate: 开始日期
 * - endDate: 结束日期
 * - agentId: 指定代理ID（仅平台可用）
 * - format: csv | json (默认csv)
 */
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
      .select('id, uid, username, role')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sub_stats';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const agentId = searchParams.get('agentId');
    const format = searchParams.get('format') || 'csv';

    // 获取当前用户的代理账户
    const { data: currentAgent } = await client
      .from('agent_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const isSuperAdmin = (user.role === 'super_admin');

    // 检查权限
    if (!isSuperAdmin && !currentAgent) {
      return NextResponse.json({ 
        success: false, 
        error: '无权限导出数据' 
      }, { status: 403 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    if (type === 'sub_stats') {
      // 导出下级代理消耗统计
      const parentId = isSuperAdmin && agentId ? parseInt(agentId) : currentAgent?.id;

      // 获取所有下级代理
      const { data: subAgents } = await client
        .from('agent_accounts')
        .select(`
          id, 
          uid, 
          agent_level,
          points_balance,
          points_total,
          points_used,
          parent_id,
          parent_uid
        `)
        .eq('parent_id', parentId);

      // 获取消耗统计
      const stats = await getSubAgentsConsumptionStats(parentId || 0, {
        startDate,
        endDate,
      });

      // 合并数据
      const result = (subAgents || []).map(sub => {
        const stat = stats.find(s => s.agentId === sub.id);
        return {
          代理ID: sub.id,
          代理UID: sub.uid,
          代理层级: sub.agent_level === 0 ? '总代' : sub.agent_level === 1 ? '一级代理' : '二级代理',
          点数余额: sub.points_balance || 0,
          累计充值: sub.points_total || 0,
          累计消耗: sub.points_used || 0,
          本期消耗点数: stat?.totalPoints || 0,
          本期消耗次数: stat?.count || 0,
          本期应收金额: (stat?.totalPoints || 0),
        };
      });

      if (format === 'json') {
        return NextResponse.json({ success: true, data: result });
      }

      // 生成CSV
      const headers = Object.keys(result[0] || {});
      const csvRows = [
        headers.join(','),
        ...result.map(row => headers.map(h => row[h as keyof typeof row]).join(','))
      ];
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="下级代理统计_${dateStr}.csv"`,
        },
      });

    } else if (type === 'consumption') {
      // 导出消耗明细
      const targetAgentId = isSuperAdmin && agentId ? parseInt(agentId) : currentAgent?.id;

      if (!targetAgentId) {
        return NextResponse.json({ 
          success: false, 
          error: '代理不存在' 
        }, { status: 404 });
      }

      const records = await getAgentConsumptionRecords(parseInt(String(targetAgentId)), {
        startDate,
        endDate,
        limit: 10000,
      });

      const result = records.map(r => ({
        时间: new Date(r.createdAt).toLocaleString('zh-CN'),
        兑换码: r.code,
        类型: CODE_TYPE_NAMES[r.codeType as CodeType] || r.codeType,
        消耗点数: r.pointsCost,
        上级UID: r.parentUid || '-',
      }));

      if (format === 'json') {
        return NextResponse.json({ success: true, data: result });
      }

      // 生成CSV
      const headers = Object.keys(result[0] || {});
      const csvRows = [
        headers.join(','),
        ...result.map(row => headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(','))
      ];
      const csv = '\uFEFF' + csvRows.join('\n'); // BOM for UTF-8

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="消耗明细_${dateStr}.csv"`,
        },
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        error: '未知导出类型' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[数据导出] 错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '导出失败' 
    }, { status: 500 });
  }
}
