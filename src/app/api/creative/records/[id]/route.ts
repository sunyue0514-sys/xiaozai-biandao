import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取单条历史记录详情（含版本链）
 * GET /api/creative/records/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const { id } = await params;
    
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '会话无效' }, { status: 401 });
    }

    const supabase = await getSupabaseClient();
    
    // 获取当前记录
    const { data: record, error } = await supabase
      .from('creative_records')
      .select('*')
      .eq('id', parseInt(id))
      .eq('user_id', userId)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 获取版本链
    const versionChain: any[] = [record];
    
    // 向上查找所有版本
    let currentRecord = record;
    while (currentRecord.parent_id) {
      const { data: parent } = await supabase
        .from('creative_records')
        .select('*')
        .eq('id', currentRecord.parent_id)
        .single();
      
      if (parent) {
        versionChain.unshift(parent);
        currentRecord = parent;
      } else {
        break;
      }
    }

    // 向下查找所有子版本
    const collectChildren = async (parentId: number) => {
      const { data: children } = await supabase
        .from('creative_records')
        .select('*')
        .eq('parent_id', parentId)
        .order('version', { ascending: true });
      
      return children || [];
    };

    // 获取所有子版本
    const allChildren: any[] = [];
    const queue = [record.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await collectChildren(currentId);
      allChildren.push(...children);
      children.forEach((c: any) => queue.push(c.id));
    }

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        versionChain,
        children: allChildren,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
