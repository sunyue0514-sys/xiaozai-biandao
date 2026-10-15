import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 智能推导创作历史记录 API
 * 
 * GET /api/creative/records
 *   ?limit=20&offset=0
 *   &topic=xxx (可选，筛选特定主题)
 *   &withVersions=true (可选，获取版本链)
 * 
 * POST /api/creative/records
 *   保存新记录
 */
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const topic = searchParams.get('topic');
    const withVersions = searchParams.get('withVersions') === 'true';

    const supabase = await getSupabaseClient();
    
    // 构建查询
    let query = supabase
      .from('creative_records')
      .select(`
        id, 
        topic, 
        audience, 
        style, 
        value, 
        customer_name,
        created_at,
        version,
        action,
        edit_request,
        edit_paragraphs,
        parent_id,
        script_content
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 按主题筛选
    if (topic) {
      query = query.eq('topic', topic);
    }

    // 获取记录
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('API operation event');
      return NextResponse.json({ error: '获取历史记录失败' }, { status: 500 });
    }

    // 如果需要版本链信息，获取每个记录的版本链
    let recordsWithVersions = data || [];
    
    if (withVersions && recordsWithVersions.length > 0) {
      // 获取所有相关记录（按主题分组）的完整版本链
      const topics = [...new Set(recordsWithVersions.map(r => r.topic).filter(Boolean))];
      
      if (topics.length > 0) {
        const { data: allRecords } = await supabase
          .from('creative_records')
          .select('*')
          .in('topic', topics)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        // 按主题分组构建版本链
        const versionsByTopic = new Map<string, any[]>();
        
        allRecords?.forEach(record => {
          if (!versionsByTopic.has(record.topic)) {
            versionsByTopic.set(record.topic, []);
          }
          versionsByTopic.get(record.topic)!.push(record);
        });

        // 将版本链附加到每条记录
        recordsWithVersions = recordsWithVersions.map(record => ({
          ...record,
          versionChain: versionsByTopic.get(record.topic) || [],
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: recordsWithVersions,
      total: count || 0,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * 保存智能推导创作记录
 * POST /api/creative/records
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
  if (securityResponse) return securityResponse;

  try {
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

    const body = await request.json();
    const { 
      topic, 
      audience, 
      style, 
      value, 
      framework, 
      ip_positioning, 
      customer_name, 
      customer_id, 
      result,
      parent_id,    // 可选，用于版本链
      action = 'generate',
      edit_request,
      edit_paragraphs,
      edit_context,
    } = body;

    if (typeof topic !== 'string' || typeof result !== 'string' || !topic.trim() || !result.trim()) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 计算版本号
    const supabase = await getSupabaseClient();
    
    let version = 1;
    const insertData: any = {
      user_id: userId,
      topic,
      audience,
      style,
      value,
      framework: framework || null,
      ip_positioning: ip_positioning || null,
      customer_name: customer_name || null,
      customer_id: customer_id || null,
      script_content: result,
      action,
      edit_request: edit_request || null,
      edit_paragraphs: edit_paragraphs || null,
      edit_context: edit_context || null,
    };

    // 如果有父版本，计算新版本号
    if (parent_id) {
      const { data: parent } = await supabase
        .from('creative_records')
        .select('version, topic')
        .eq('id', parent_id)
        .eq('user_id', userId)
        .single();
      
      if (parent) {
        // 计算同主题的版本数
        const { count } = await supabase
          .from('creative_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('topic', parent.topic);
        
        version = (count || 0) + 1;
        insertData.parent_id = parent_id;
      }
    }

    insertData.version = version;

    const { data, error } = await supabase
      .from('creative_records')
      .insert(insertData)
      .select('id, version')
      .single();

    if (error) {
      console.error('API operation event');
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        version: data.version,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
