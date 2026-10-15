import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserById } from '@/lib/store';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AccountPlanResult {
  accountSetup?: string;
  painPointSolutions?: string;
  firstWeekPlan?: string;
  contentTemplates?: string;
  engagementScripts?: string;
  conversionFlow?: string;
  liveStreamPlan?: string;
  sensitiveWordsGuide?: string;
  realisticGoals?: string;
}

interface HistoryRecord {
  id: number;
  customerName: string;
  createdAt: string;
  planResult: AccountPlanResult;
}

export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    // 验证session
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取用户ID
    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '用户信息无效' }, { status: 401 });
    }

    // 获取用户信息
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 查询有账号规划的客户
    // 注意：customers.uid 存储的是用户的数字ID，不是用户的UID字符串
    const supabase = getSupabaseClient();
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, name, account_plan, updated_at')
      .eq('uid', String(userId))  // 使用用户数字ID查询
      .not('account_plan', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('API operation event');
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 整理历史记录
    const historyList: HistoryRecord[] = (customers || [])
      .filter(c => c.account_plan)
      .map(c => {
        let planResult: AccountPlanResult = {};
        try {
          planResult = JSON.parse(c.account_plan);
        } catch {
          planResult = { accountSetup: c.account_plan };
        }
        return {
          id: c.id,
          customerName: c.name,
          createdAt: c.updated_at,
          planResult,
        };
      });

    return NextResponse.json({ data: historyList });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
