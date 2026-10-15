import { getCustomerById } from '@/lib/db-store';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentRequest, logAgentCall, getApiKey } from '@/lib/agent-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: 获取素材库列表
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
    
    const supabase = getSupabaseClient();
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const type = searchParams.get('type'); // topic, writing, script
    
    // 构建查询
    let query = supabase
      .from('customer_materials')
      .select('*')
      .eq('uid', String(systemUserId))
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (customerId) {
      query = query.eq('customer_id', parseInt(customerId));
    }
    
    if (type === 'topic') {
      // 只要有 topic，没有 content 的是选题
      query = query.is('content', null).not('topic', 'is', null);
    } else if (type === 'writing' || type === 'script') {
      // 有 content 的是文案/脚本
      query = query.not('content', 'is', null);
    }
    
    const { data, error } = await query.limit(100);
    
    if (error) {
      console.error('Get materials error:', error);
      return NextResponse.json({
        success: false,
        error: '获取素材失败',
      }, { status: 500 });
    }
    
    // 格式化返回
    const materials = (data || []).map(m => ({
      id: m.id,
      customerId: m.customer_id,
      customerName: m.customer_name,
      topic: m.topic,
      title: m.title,
      scriptType: m.script_type,
      content: m.content,
      status: m.status,
      createdAt: m.created_at,
    }));
    
    return NextResponse.json({
      success: true,
      data: materials,
      total: materials.length,
    });
  } catch (error) {
    console.error('Agent materials API error:', error);
    return NextResponse.json({
      success: false,
      error: '服务暂时不可用',
    }, { status: 500 });
  }
}

// POST: 保存素材
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { customerId, customerName, topic, title, scriptType, content } = body;
    if (customerId !== undefined && customerId !== null && customerId !== 0) {
      if (!Number.isSafeInteger(customerId) || customerId <= 0) return NextResponse.json({ success: false, error: 'Invalid customer ID' }, { status: 400 });
      const customer = await getCustomerById(customerId);
      if (!customer || customer.uid !== String(systemUserId)) return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }
    if ((topic !== undefined && typeof topic !== 'string') || (content !== undefined && content !== null && typeof content !== 'string') || (title !== undefined && typeof title !== 'string')) return NextResponse.json({ success: false, error: 'Invalid material content' }, { status: 400 });
    
    if (!topic && !content) {
      return NextResponse.json({
        success: false,
        error: '请提供选题或内容',
      }, { status: 400 });
    }
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('customer_materials')
      .insert({
        uid: String(systemUserId),
        customer_id: customerId || 0,
        customer_name: customerName || '',
        topic: topic || '',
        title: title || (topic ? topic.substring(0, 50) : ''),
        script_type: scriptType || '未分类',
        content: content || null,
        status: 'draft',
        is_deleted: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Save material error:', error);
      return NextResponse.json({
        success: false,
        error: '保存素材失败',
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        topic: data.topic,
        title: data.title,
      },
      message: '素材保存成功',
    });
  } catch (error) {
    console.error('Agent materials POST API error:', error);
    return NextResponse.json({
      success: false,
      error: '服务暂时不可用',
    }, { status: 500 });
  }
}
