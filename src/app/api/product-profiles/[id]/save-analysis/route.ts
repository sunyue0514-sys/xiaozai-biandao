import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserInfo, hasSession } from '@/lib/session';
import { getProductProfileById, updateProductProfile } from '@/lib/db-store';

/**
 * 保存智能分析结果到产品档案
 * 并智能解析结果，自动填充基础字段
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

    const body = await request.json();
    const { analysisType, result } = body;

    if (!analysisType || !result) {
      return NextResponse.json({ error: '缺少分析类型或结果' }, { status: 400 });
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      analysisCompleted: true,
      analysisAt: new Date().toISOString(),
    };

    // 保存完整分析结果到 aiPositioning
    const existingPositioning = profile.aiPositioning || '';
    const newPositioning = existingPositioning 
      ? `${existingPositioning}\n\n---\n\n## ${getAnalysisTitle(analysisType)}\n\n${result}`
      : `## ${getAnalysisTitle(analysisType)}\n\n${result}`;
    updateData.aiPositioning = newPositioning;  // 使用驼峰格式

    // 根据分析类型智能解析并填充基础字段
    const parsedData = parseAndMapAnalysisResult(analysisType, result, profile as unknown as Record<string, unknown>);
    Object.assign(updateData, parsedData);

    // 执行更新
    const updated = await updateProductProfile(profileId, updateData);
    if (!updated) {
      return NextResponse.json({ error: '保存失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '分析结果已保存',
      profile: updated,
    });
  } catch (error) {
    console.error('保存分析结果失败:', error);
    return NextResponse.json(
      { error: '保存失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}

function getAnalysisTitle(type: string): string {
  const titles: Record<string, string> = {
    selling_point: '卖点拆解',
    user_portrait: '用户画像',
    value_ladder: '价值阶梯',
    pain_point: '痛点挖掘',
  };
  return titles[type] || '智能分析';
}

/**
 * 智能解析分析结果并映射到基础字段
 */
function parseAndMapAnalysisResult(
  analysisType: string, 
  result: string, 
  profile: Record<string, unknown>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  // 所有分析类型都尝试提取所有可能的信息
  // 1. 提取目标人群
  if (!profile.targetUsers) {
    const targetUsers = extractTargetUsers(result);
    if (targetUsers) {
      updateData.targetUsers = targetUsers;  // 使用驼峰格式
      console.log(`[智能解析-${analysisType}] → 目标人群:`, targetUsers);
    }
  }

  // 2. 提取用户痛点
  if (!profile.userPainPoints) {
    const painPoints = extractPainPoints(result);
    if (painPoints) {
      updateData.userPainPoints = painPoints;  // 使用驼峰格式
      console.log(`[智能解析-${analysisType}] → 用户痛点:`, painPoints);
    }
  }

  // 3. 提取使用场景
  if (!profile.usageScenario) {
    const scenario = extractUsageScenario(result);
    if (scenario) {
      updateData.usageScenario = scenario;  // 使用驼峰格式
      console.log(`[智能解析-${analysisType}] → 使用场景:`, scenario);
    }
  }

  // 4. 根据特定分析类型补充特定字段
  switch (analysisType) {
    case 'selling_point':
      // 补充核心卖点
      const existingPoints = (profile.sellingPoints as string[]) || [];
      const newPoints = extractSellingPoints(result);
      if (newPoints.length > 0) {
        const mergedPoints = [...new Set([...existingPoints, ...newPoints])];
        updateData.sellingPoints = mergedPoints.slice(0, 5);  // 使用驼峰格式
        console.log('[智能解析] 卖点拆解 → 核心卖点:', updateData.sellingPoints);
      }
      break;

    case 'user_portrait':
      // 解析详细用户画像字段
      const portraitData = extractUserPortraitDetails(result);
      Object.assign(updateData, portraitData);
      break;

    case 'value_ladder':
      // 解析价值阶梯详情
      const valueData = extractValueLadderDetails(result);
      Object.assign(updateData, valueData);
      break;

    case 'pain_point':
      // 解析痛点详情
      const painPointData = extractPainPointDetails(result);
      Object.assign(updateData, painPointData);
      break;
  }

  return updateData;
}

/**
 * 从分析结果中提取目标人群描述
 * 改进：合并所有卖点的目标人群，去重后输出
 */
function extractTargetUsers(result: string): string | null {
  const lines = result.split('\n');
  const allTargetUsers: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 匹配格式："目标人群：XXX" 或 "- 目标人群：XXX"
    // 改进：提取所有匹配项，而不是只取第一个
    let match = trimmedLine.match(/[-•]?\s*目标人群[:：]\s*(.+)/);
    if (match) {
      const content = match[1].trim();
      // 过滤掉描述性文字（如"[这个卖点最吸引的目标用户群体]"）
      if (!content.startsWith('[') && !content.startsWith('（') && content.length > 2) {
        allTargetUsers.push(content);
      }
      continue;
    }
    
    // 从"用户画像"分析中提取更完整的信息
    if (trimmedLine.includes('年龄段')) {
      match = trimmedLine.match(/年龄段[:：]\s*(.+)/);
      if (match) allTargetUsers.push(match[1].trim());
    }
    if (trimmedLine.includes('性别') && !trimmedLine.includes('性格')) {
      match = trimmedLine.match(/性别[:：]\s*(.+)/);
      if (match) allTargetUsers.push(match[1].trim());
    }
    if (trimmedLine.includes('职业')) {
      match = trimmedLine.match(/职业[:：]\s*(.+)/);
      if (match) allTargetUsers.push('职业：' + match[1].trim());
    }
    // 提取兴趣标签作为目标人群补充
    if (trimmedLine.includes('兴趣') && (trimmedLine.includes('标签') || trimmedLine.includes('爱好'))) {
      match = trimmedLine.match(/兴趣(?:标签|爱好)[:：]\s*(.+)/);
      if (match) allTargetUsers.push('兴趣：' + match[1].trim());
    }
    // 从"典型用户描述"提取
    if (trimmedLine.includes('典型用户')) {
      match = trimmedLine.match(/典型用户[:：]\s*(.+)/);
      if (match) allTargetUsers.push(match[1].trim());
    }
  }

  // 去重并用顿号连接
  const uniqueUsers = [...new Set(allTargetUsers)];
  return uniqueUsers.length > 0 ? uniqueUsers.join('、') : null;
}

/**
 * 从痛点挖掘结果中提取痛点描述
 * 改进：合并所有卖点的用户痛点，去重后输出
 */
function extractPainPoints(result: string): string | null {
  const lines = result.split('\n');
  const painPoints: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 匹配格式1: "用户痛点：XXX" - 提取所有匹配项
    let match = trimmedLine.match(/[-•]?\s*用户痛点[:：]\s*(.+)/);
    if (match) {
      const content = match[1].trim();
      // 过滤掉描述性文字
      if (!content.startsWith('[') && !content.startsWith('（') && content.length > 2) {
        painPoints.push(content);
      }
      continue;
    }
    
    // 匹配格式2: 从"对比型表达"中提取痛点
    if (trimmedLine.includes('对比型表达') || trimmedLine.includes('对比型')) {
      match = trimmedLine.match(/对比型(?:表达)?[:：]\s*(.+)/);
      if (match) {
        const text = match[1].trim();
        // 从对比表达中提取痛点（通常描述了用户的困扰）
        if (text.includes('担心') || text.includes('泛红') || text.includes('问题') || text.includes('困扰') || text.includes('烦恼')) {
          painPoints.push(text);
        }
      }
    }
    
    // 匹配格式3: 从"情感感知"中提取痛点（"从担心...转变为..."格式）
    if (trimmedLine.includes('情感感知')) {
      match = trimmedLine.match(/从(担心[^，]+)[，，]/);
      if (match) {
        painPoints.push(match[1].trim());
      }
      // 也尝试提取完整内容
      match = trimmedLine.match(/情感感知[:：]\s*(.+)/);
      if (match) {
        painPoints.push(match[1].trim());
      }
    }
    
    // 匹配格式4: "痛点：XXX" 或 "- 痛点：XXX"
    match = trimmedLine.match(/[-•]\s*痛点[:：]\s*(.+)/);
    if (match) {
      const content = match[1].trim();
      if (!content.startsWith('[') && content.length > 2) {
        painPoints.push(content);
      }
    }
    
    // 匹配格式5: 痛点详情中的条目 "1. **痛点内容**"
    match = trimmedLine.match(/^\d+\.\s*\*\*(.+?)\*\*/);
    if (match && (trimmedLine.includes('痛点') || lines[Math.max(0, lines.indexOf(line) - 3)].includes('痛点'))) {
      painPoints.push(match[1].trim());
    }
  }

  // 去重并用分号连接，最多保留5个
  const uniquePainPoints = [...new Set(painPoints)];
  return uniquePainPoints.length > 0 ? uniquePainPoints.slice(0, 5).join('；') : null;
}

/**
 * 从分析结果中提取使用场景
 * 改进：合并所有卖点的使用场景，去重后输出
 */
function extractUsageScenario(result: string): string | null {
  const lines = result.split('\n');
  const scenarios: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 匹配格式1: "使用场景：XXX" - 提取所有匹配项
    let match = trimmedLine.match(/[-•]?\s*使用场景[:：]\s*(.+)/);
    if (match) {
      const content = match[1].trim();
      // 过滤掉描述性文字
      if (!content.startsWith('[') && !content.startsWith('（') && content.length > 2) {
        scenarios.push(content);
      }
      continue;
    }
    
    // 匹配格式2: 从"场景型表达"中提取
    if (trimmedLine.includes('场景型表达') || trimmedLine.includes('场景型')) {
      match = trimmedLine.match(/场景型(?:表达)?[:：]\s*(.+)/);
      if (match) {
        scenarios.push(match[1].trim());
      }
    }
    
    // 匹配格式3: "触发场景：XXX"
    if (trimmedLine.includes('触发场景')) {
      match = trimmedLine.match(/触发场景[:：]\s*(.+)/);
      if (match) {
        scenarios.push(match[1].trim());
      }
    }
    
    // 匹配格式4: 从行为轨迹中提取场景
    // 如 "07:00 起床洗脸" 这类时间+场景格式
    match = trimmedLine.match(/\d{1,2}:\d{2}\s+(.+)/);
    if (match && trimmedLine.length < 50) {
      scenarios.push(match[1].trim());
    }
    
    // 匹配格式5: "典型场景：XXX"
    if (trimmedLine.includes('典型场景')) {
      match = trimmedLine.match(/典型场景[:：]\s*(.+)/);
      if (match) {
        scenarios.push(match[1].trim());
      }
    }
    
    // 匹配格式6: 从"日常场景"或"特殊场景"中提取
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      const content = trimmedLine.replace(/^[-•]\s*/, '').trim();
      // 如果内容包含场景关键词，添加到场景列表
      if (content.length < 30 && (
        content.includes('洗脸') || content.includes('洗澡') || 
        content.includes('化妆') || content.includes('护肤') ||
        content.includes('出门') || content.includes('上班') ||
        content.includes('约会') || content.includes('运动') ||
        content.includes('做饭') || content.includes('用餐') ||
        content.includes('睡觉') || content.includes('起床') ||
        content.includes('带娃') || content.includes('宝宝')
      )) {
        scenarios.push(content);
      }
    }
  }

  // 去重并用顿号连接，最多保留5个
  const uniqueScenarios = [...new Set(scenarios)];
  return uniqueScenarios.length > 0 ? uniqueScenarios.slice(0, 5).join('、') : null;
}

/**
 * 从卖点拆解结果中提取卖点
 * 改进：提取所有核心卖点，包括更多格式
 */
function extractSellingPoints(result: string): string[] {
  const lines = result.split('\n');
  const points: string[] = [];
  
  // 定义需要过滤的关键词（这些内容应该填充到其他字段）
  const filterKeywords = ['目标人群', '用户痛点', '使用场景', '受众群体', '痛点分析', '场景描述'];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 匹配格式1: "### 核心卖点1：XXX" 或 "### 核心卖点X：XXX"
    let match = trimmedLine.match(/^###\s*核心卖点\d+[:：]\s*(.+)/);
    if (match) {
      const content = match[1].trim();
      // 过滤掉包含目标人群、用户痛点、使用场景的内容
      if (!filterKeywords.some(keyword => content.includes(keyword))) {
        points.push(content);
      }
      continue;
    }
    
    // 匹配格式2: "1. **卖点内容**" (标题型)
    match = trimmedLine.match(/^\d+\.\s*\*\*(.+?)\*\*/);
    if (match) {
      const content = match[1].trim();
      // 过滤关键词
      if (!filterKeywords.some(keyword => content.includes(keyword)) && 
          !trimmedLine.includes('映射') && !trimmedLine.includes('人群') && 
          !trimmedLine.includes('痛点') && !trimmedLine.includes('场景')) {
        points.push(content);
      }
      continue;
    }
    
    // 匹配格式3: "- 卖点内容" (列表型)
    if (trimmedLine.startsWith('- ') && !trimmedLine.includes('马斯洛') && !trimmedLine.includes('感知路径')) {
      const content = trimmedLine.slice(2).trim();
      // 过滤关键词
      const hasFilterKeyword = filterKeywords.some(keyword => content.includes(keyword));
      // 只提取简短有力的卖点描述
      if (!hasFilterKeyword && content.length > 2 && content.length < 30 && !content.startsWith('[')) {
        points.push(content);
      }
      continue;
    }
    
    // 匹配格式4: "**卖点名称**：描述"
    match = trimmedLine.match(/^\*\*(.+?)\*\*[:：]\s*(.+)/);
    if (match) {
      const name = match[1].trim();
      const desc = match[2].trim();
      // 过滤关键词
      const hasFilterKeyword = filterKeywords.some(keyword => name.includes(keyword) || desc.includes(keyword));
      // 组合名称和简短描述
      if (!hasFilterKeyword && name.length > 0 && !name.includes('映射') && !name.includes('人群')) {
        points.push(desc.length > 0 ? `${name}：${desc}` : name);
      }
    }
  }

  // 去重，最多保留5个
  return [...new Set(points)].slice(0, 5);
}

/**
 * 从用户画像结果中提取详细字段
 */
function extractUserPortraitDetails(result: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = result.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 年龄段
    let match = trimmedLine.match(/年龄段[:：]\s*(.+)/);
    if (match) {
      data.userAgeRange = match[1].trim().replace(/\*\*/g, '');  // 使用驼峰格式
    }
    
    // 性别
    match = trimmedLine.match(/性别[:：]\s*(.+)/);
    if (match) {
      data.userGender = match[1].trim().replace(/\*\*/g, '');  // 使用驼峰格式
    }
    
    // 消费能力
    match = trimmedLine.match(/消费(?:能力|水平)[:：]\s*(.+)/);
    if (match) {
      data.userConsumptionLevel = match[1].trim().replace(/\*\*/g, '');  // 使用驼峰格式
    }
    
    // 兴趣标签
    match = trimmedLine.match(/兴趣(?:标签|爱好)[:：]\s*(.+)/);
    if (match) {
      const interests = match[1].split(/[,，、]/).map(s => s.trim().replace(/\*\*/g, '')).filter(s => s);
      if (interests.length > 0) {
        data.userInterests = interests;  // 使用驼峰格式
      }
    }
  }

  return data;
}

/**
 * 从价值阶梯结果中提取详细字段
 */
function extractValueLadderDetails(result: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = result.split('\n');
  
  let currentLevel = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 识别价值层级标题
    if (trimmedLine.includes('基础价值') || trimmedLine.includes('功能价值')) {
      currentLevel = 'basic';
    } else if (trimmedLine.includes('进阶价值') || trimmedLine.includes('情感价值')) {
      currentLevel = 'advanced';
    } else if (trimmedLine.includes('顶层价值') || trimmedLine.includes('社交价值')) {
      currentLevel = 'top';
    }
    
    // 提取内容
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      const content = trimmedLine.replace(/^[-•]\s*/, '').replace(/\*\*/g, '').trim();
      
      if (currentLevel === 'basic' && !data.valueLadderBasic) {
        data.valueLadderBasic = content;  // 使用驼峰格式
      } else if (currentLevel === 'advanced' && !data.valueLadderAdvanced) {
        data.valueLadderAdvanced = content;  // 使用驼峰格式
      } else if (currentLevel === 'top' && !data.valueLadderTop) {
        data.valueLadderTop = content;  // 使用驼峰格式
      }
    }
  }

  return data;
}

/**
 * 从痛点挖掘结果中提取详细字段
 */
function extractPainPointDetails(result: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = result.split('\n');
  
  const painPoints: Array<{ point: string; intensity: string }> = [];
  const barriers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    
    // 匹配痛点条目
    const match = trimmedLine.match(/^\d+\.\s*\*\*(.+?)\*\*/);
    if (match) {
      const point = match[1].trim();
      // 查找下一行的痛点强度
      let intensity = '中等';
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const intensityMatch = nextLine.match(/痛点强度[:：]\s*(.+)/);
        if (intensityMatch) {
          intensity = intensityMatch[1].trim();
        }
      }
      painPoints.push({ point, intensity });
    }
    
    // 匹配购买阻力
    if (trimmedLine.includes('购买阻力') || trimmedLine.includes('购买障碍')) {
      const barrierMatch = trimmedLine.match(/[:：]\s*(.+)/);
      if (barrierMatch) {
        barriers.push(barrierMatch[1].trim().replace(/\*\*/g, ''));
      }
    }
  }

  if (painPoints.length > 0) {
    data.painPointsJson = JSON.stringify(painPoints);  // 使用驼峰格式
  }
  if (barriers.length > 0) {
    data.purchaseBarriersJson = JSON.stringify(barriers);  // 使用驼峰格式
  }

  return data;
}
