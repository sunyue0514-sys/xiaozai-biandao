import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentRequest, logAgentCall, getApiKey } from '@/lib/agent-auth';
import { getCustomersByUid, getCustomerById } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: 获取客户档案列表
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
    const agentUser = authResult.agentUser!;
    
    // 获取客户列表
    const customers = await getCustomersByUid(String(systemUserId));
    
    // 过滤敏感信息并格式化
    const formattedCustomers = customers.map(c => {
      let coreBusiness = null;
      if (c.ipPositioning) {
        try {
          const positioning = typeof c.ipPositioning === 'string' 
            ? JSON.parse(c.ipPositioning) 
            : c.ipPositioning;
          coreBusiness = positioning?.coreBusiness || null;
        } catch {
          // 解析失败忽略
        }
      }
      
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        hasPositioning: !!c.ipPositioning,
        coreBusiness,
        createdAt: c.createdAt,
      };
    });
    
    return NextResponse.json({
      success: true,
      data: formattedCustomers,
      total: formattedCustomers.length,
    });
  } catch (error) {
    console.error('Agent customers API error:', error);
    return NextResponse.json({
      success: false,
      error: '服务暂时不可用',
    }, { status: 500 });
  }
}
