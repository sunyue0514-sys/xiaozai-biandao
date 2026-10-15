import { guardAIRequest, validatePublicUrl } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { fetchPublicContent } from '@/app/api/ai/_fetch';

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"service":"public-fetch","paid":true});
  if (securityResponse) return securityResponse;

  try {
    const { url } = await request.json();
    if (!(await validatePublicUrl(url))) return NextResponse.json({ success: false, error: 'Invalid public URL' }, { status: 400 });
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL不能为空' },
        { status: 400 }
      );
    }



    const response = await fetchPublicContent(url);

    return NextResponse.json({
      success: true,
      data: {
        title: response.title,
        url: response.url,
        content: response.content,
        status_code: response.status_code,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '获取URL内容失败' },
      { status: 400 }
    );
  }
}
