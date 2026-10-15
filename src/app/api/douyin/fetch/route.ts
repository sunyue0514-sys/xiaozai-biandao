import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { hasSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 从抖音URL中提取视频ID或用户ID
 */
function extractIds(url: string): { videoId?: string; userId?: string } | null {
  const result: { videoId?: string; userId?: string } = {};
  
  // 提取视频ID
  const videoPatterns = [
    /video\/(\d+)/,
    /mod_id=(\d+)/,
    /\/(\d{19})/,
  ];
  
  for (const pattern of videoPatterns) {
    const match = url.match(pattern);
    if (match) {
      result.videoId = match[1];
      break;
    }
  }
  
  // 提取用户ID
  const userPatterns = [
    /user\/([^?/&]+)/,
    /sec_user_id=([^&]+)/,
  ];
  
  for (const pattern of userPatterns) {
    const match = url.match(pattern);
    if (match) {
      result.userId = match[1];
      break;
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"video":true});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return new Response(
        JSON.stringify({ error: '未登录或登录已过期' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await request.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: '请输入抖音视频链接' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证URL格式
    if (!url.includes('douyin.com')) {
      return new Response(
        JSON.stringify({ error: '请输入正确的抖音视频链接' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ids = extractIds(url);
    
    // 返回轻抖工具使用引导
    // 实际生产环境可接入第三方API服务（如抖音开放平台API或付费数据服务）
    return new Response(
      JSON.stringify({ 
        success: false,
        error: '自动抓取功能暂未开放',
        hint: '推荐使用「轻抖」工具提取文案',
        guide: {
          title: '使用轻抖提取文案步骤',
          steps: [
            '1. 打开抖音APP，找到目标视频',
            '2. 点击右下角「分享」→「复制链接」',
            '3. 打开微信，搜索「轻抖」小程序',
            '4. 进入轻抖，点击「文案提取」',
            '5. 粘贴链接，点击「一键提取文案」',
            '6. 复制提取的文案，粘贴到「参考文案」输入框'
          ],
          tip: '轻抖是免费工具，无需注册即可使用'
        },
        technicalNote: '如需自动抓取功能，请联系客服接入企业版抖音API服务'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API operation event');
    return new Response(
      JSON.stringify({ 
        error: '获取内容失败',
        hint: '请使用「轻抖」工具提取文案后粘贴到「参考文案」'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
