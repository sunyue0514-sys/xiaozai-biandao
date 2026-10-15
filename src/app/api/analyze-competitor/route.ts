import { guardAIRequest, validatePublicUrl } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { fetchPublicContent } from '@/app/api/ai/_fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 分析竞品网站页面结构
 * GET /api/analyze-competitor?url=xxx
 */
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"service":"public-fetch","paid":true,"body":false});
  if (securityResponse) return securityResponse;

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  
  if (!targetUrl) {
    return NextResponse.json({ error: '请提供目标URL' }, { status: 400 });
  }
  if (!(await validatePublicUrl(targetUrl))) return NextResponse.json({ error: 'Invalid public URL' }, { status: 400 });

  try {


    console.log('API operation event');
    const response = await fetchPublicContent(targetUrl);

    if (response.status_code !== 0) {
      return NextResponse.json({ 
        error: '获取页面失败', 
        message: 'Content fetch failed' 
      }, { status: 500 });
    }

    // 分析页面内容
    const analysis = {
      title: response.title,
      url: response.url,
      publishTime: response.publish_time,
      fileType: response.filetype,
      
      // 提取文本内容
      textContent: response.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n'),
      
      // 提取链接
      links: response.content
        .filter(item => item.type === 'link')
        .map(item => item.url),
      
      // 提取图片
      images: response.content
        .filter(item => item.type === 'image')
        .map(item => ({
          url: item.image?.display_url,
          width: item.image?.width,
          height: item.image?.height,
        })),
      
      // 统计信息
      stats: {
        textItems: response.content.filter(item => item.type === 'text').length,
        linkItems: response.content.filter(item => item.type === 'link').length,
        imageItems: response.content.filter(item => item.type === 'image').length,
      },
    };

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ 
      error: '分析页面失败', 
      message: error instanceof Error ? 'Request failed' : 'Request failed' 
    }, { status: 400 });
  }
}
