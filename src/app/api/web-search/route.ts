import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserInfo } from '@/lib/session';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const user = token ? await getSessionUserInfo(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { query, count = 10 } = await request.json();
    
    if (typeof query !== 'string' || !query.trim() || query.length > 2000 || !Number.isInteger(count) || count < 1 || count > 10) {
      return NextResponse.json(
        { success: false, error: '搜索关键词不能为空' },
        { status: 400 }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new SearchClient(config, customHeaders);

    const response = await client.webSearch(query, count, true);

    return NextResponse.json({
      success: true,
      data: {
        summary: response.summary,
        web_items: response.web_items,
        image_items: response.image_items,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '搜索失败' },
      { status: 500 }
    );
  }
}
