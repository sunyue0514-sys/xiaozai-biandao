import { NextRequest, NextResponse } from 'next/server';
import { getRedemptionCodeByCode } from '@/lib/db-store';
import { hasSession, getSessionUserId } from '@/lib/session';

// 兑换码类型显示名称映射
const CODE_TYPE_NAMES: Record<string, string> = {
  'trial': '体验版',
  'monthly': '月度会员',
  'yearly': '年度会员',
  'power': '算力包',
  'custom': '自定义',
};

// 兑换码预览API - 用户输入兑换码后实时显示信息
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;
    
    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 });
    }
    
    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 });
    }
    
    // 获取兑换码参数
    const code = request.nextUrl.searchParams.get('code');
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ 
        success: false, 
        error: '请输入兑换码' 
      }, { status: 400 });
    }
    
    const trimmedCode = code.trim().toUpperCase();
    
    // 查询兑换码信息
    const redemptionCode = await getRedemptionCodeByCode(trimmedCode);
    
    // 兑换码不存在
    if (!redemptionCode) {
      return NextResponse.json({ 
        success: false, 
        error: '兑换码无效，请检查后重试',
        preview: null,
      });
    }
    
    // 检查状态
    let statusMessage = '可使用';
    let canUse = true;
    
    if (redemptionCode.status === 'used') {
      statusMessage = '已被使用';
      canUse = false;
    } else if (redemptionCode.status === 'expired') {
      statusMessage = '已过期';
      canUse = false;
    } else if (redemptionCode.expiresAt && new Date(redemptionCode.expiresAt) < new Date()) {
      statusMessage = '已过期';
      canUse = false;
    } else if (redemptionCode.usedCount >= redemptionCode.maxUses) {
      statusMessage = '已被使用';
      canUse = false;
    } else if (redemptionCode.usedBy.includes(userId)) {
      statusMessage = '您已使用过';
      canUse = false;
    }
    
    // 计算时长显示
    let durationText = '';
    const days = redemptionCode.rewardDays;
    if (days < 1) {
      durationText = `${Math.round(days * 24)}小时`;
    } else if (days < 30) {
      durationText = `${days}天`;
    } else {
      durationText = `${Math.round(days / 30)}个月`;
    }
    
    // 构建预览信息
    const preview = {
      code: redemptionCode.code,
      type: CODE_TYPE_NAMES[redemptionCode.type] || redemptionCode.type,
      typeCode: redemptionCode.type,
      days: redemptionCode.rewardDays,
      durationText,
      power: redemptionCode.rewardPower,
      status: redemptionCode.status,
      statusMessage,
      canUse,
      expiresAt: redemptionCode.expiresAt,
      maxUses: redemptionCode.maxUses,
      usedCount: redemptionCode.usedCount,
    };
    
    return NextResponse.json({
      success: true,
      preview,
    });
    
  } catch (error) {
    console.error('兑换码预览失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '查询失败，请稍后重试',
      preview: null,
    }, { status: 500 });
  }
}
