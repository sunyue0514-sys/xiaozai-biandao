import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserInfo, hasSession } from '@/lib/session';
import { getProductProfileById, updateProductProfile } from '@/lib/db-store';

/**
 * 一键完善产品档案API
 * 将智能分析结果自动填充到产品档案基础字段
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || request.cookies.get('sessionToken')?.value;
    const user = token && (await hasSession(token)) ? await getSessionUserInfo(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const profileId = Number(idParam);
    
    if (!Number.isSafeInteger(profileId) || profileId <= 0) {
      return NextResponse.json({ error: '无效的产品档案ID' }, { status: 400 });
    }

    // 获取产品档案
    const profile = await getProductProfileById(profileId);
    if (!profile || profile.uid !== String(user.id)) {
      return NextResponse.json({ error: '产品档案不存在' }, { status: 404 });
    }

    // 检查是否已完成分析
    if (!profile.analysisCompleted) {
      return NextResponse.json({ error: '请先完成智能分析' }, { status: 400 });
    }

    // 解析痛点JSON
    let painPoints: Array<{ pain: string; intensity: number; scenario: string }> = [];
    if (profile.painPointsJson) {
      try {
        painPoints = JSON.parse(profile.painPointsJson);
      } catch (e) {
        console.error('解析痛点JSON失败:', e);
      }
    }

    // 解析购买阻力JSON
    let barriers: Array<{ barrier: string; solution: string }> = [];
    if (profile.purchaseBarriersJson) {
      try {
        barriers = JSON.parse(profile.purchaseBarriersJson);
      } catch (e) {
        console.error('解析购买阻力JSON失败:', e);
      }
    }

    // 构建更新数据 - 智能映射
    const updateData: Record<string, unknown> = {};

    // 1. 卖点映射：从价值阶梯提取
    const sellingPoints: string[] = [];
    if (profile.sellingPoints && profile.sellingPoints.length > 0) {
      // 保留原有卖点
      sellingPoints.push(...profile.sellingPoints);
    }
    
    // 从价值阶梯补充卖点
    if (profile.valueLadderBasic && !sellingPoints.includes(profile.valueLadderBasic)) {
      sellingPoints.push(profile.valueLadderBasic);
    }
    if (profile.valueLadderAdvanced && !sellingPoints.includes(profile.valueLadderAdvanced)) {
      sellingPoints.push(profile.valueLadderAdvanced);
    }
    if (profile.valueLadderTop && !sellingPoints.includes(profile.valueLadderTop)) {
      sellingPoints.push(profile.valueLadderTop);
    }
    
    if (sellingPoints.length > 0) {
      updateData.sellingPoints = sellingPoints.slice(0, 5); // 最多5个卖点
    }

    // 2. 目标用户映射：从用户画像构建
    if (!profile.targetUsers) {
      const targetParts: string[] = [];
      if (profile.userAgeRange) targetParts.push(profile.userAgeRange);
      if (profile.userGender) targetParts.push(profile.userGender);
      if (profile.userConsumptionLevel) targetParts.push(profile.userConsumptionLevel + '消费能力');
      if (profile.userInterests && profile.userInterests.length > 0) {
        targetParts.push('兴趣: ' + profile.userInterests.slice(0, 3).join('、'));
      }
      
      if (targetParts.length > 0) {
        updateData.targetUsers = targetParts.join('，');
      }
    }

    // 3. 痛点映射：从痛点详情提取
    if (!profile.userPainPoints && painPoints.length > 0) {
      const painTexts = painPoints.slice(0, 3).map(p => 
        `${p.pain}（${p.scenario}，强度${p.intensity}/10）`
      );
      updateData.userPainPoints = painTexts.join('；');
    }

    // 执行更新
    if (Object.keys(updateData).length > 0) {
      const updated = await updateProductProfile(profileId, updateData);
      if (!updated) {
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: '已智能填充以下字段：' + Object.keys(updateData).map(k => {
          const fieldNames: Record<string, string> = {
            'sellingPoints': '核心卖点',
            'targetUsers': '目标人群',
            'userPainPoints': '用户痛点'
          };
          return fieldNames[k] || k;
        }).join('、'),
        updatedFields: Object.keys(updateData),
        profile: updated
      });
    } else {
      return NextResponse.json({
        success: true,
        message: '所有字段已完善，无需更新',
        updatedFields: []
      });
    }
  } catch (error) {
    console.error('一键完善失败:', error);
    return NextResponse.json(
      { error: '一键完善失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}
