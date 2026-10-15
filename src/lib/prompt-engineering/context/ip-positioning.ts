/**
 * IP定位上下文构建器
 * 
 * 核心改进：将IP定位从"参考信息"变为"创作约束"
 * 
 * 设计原则：
 * 1. 身份约束：创作者必须以档案身份进行创作
 * 2. 领域约束：内容必须围绕专业领域展开
 * 3. 用户约束：内容必须面向目标用户
 * 4. 风格约束：保持风格一致性
 */

import { IPPositioning } from '@/lib/system-prompts';

/**
 * 约束强度选项
 */
export interface IPConstraintOptions {
  /** 
   * 约束模式
   * - strict: 严格约束，必须遵守
   * - flexible: 灵活参考，可适当调整
   * - minimal: 精简模式，仅包含核心约束（用于选题等轻量场景）
   */
  mode: 'strict' | 'flexible' | 'minimal';
  
  /**
   * 强调哪些约束维度
   */
  emphasis: Array<'identity' | 'expertise' | 'audience' | 'tone' | 'content'>;
  
  /**
   * 是否包含详细指导
   */
  includeGuidance?: boolean;
}

/**
 * 构建IP定位约束（核心约束层）
 * 
 * 这是解决"生成内容不贴切"问题的关键
 * 将档案信息转化为明确的创作约束，而非模糊的参考信息
 */
export function buildIPConstraints(
  ipPositioning: IPPositioning | null | undefined,
  customerName?: string,
  options: IPConstraintOptions = { mode: 'strict', emphasis: ['identity', 'expertise', 'audience'] }
): string {
  if (!ipPositioning) return '';

  const constraints: string[] = [];
  // minimal模式默认不包含详细指导
  const { mode, emphasis, includeGuidance = mode !== 'minimal' } = options;
  
  // 约束强度标记
  const constraintWord = mode === 'strict' ? '必须' : '应该';
  const constraintLevel = mode === 'strict' ? '必须遵守' : mode === 'minimal' ? '核心约束' : '重要参考';
  
  // === 身份约束 ===
  if (emphasis.includes('identity') && ipPositioning.basicInfo?.identity) {
    const identity = ipPositioning.basicInfo.identity;
    const nickname = ipPositioning.basicInfo.nickname;
    const personality = ipPositioning.basicInfo.personality 
      ? (Array.isArray(ipPositioning.basicInfo.personality) 
          ? ipPositioning.basicInfo.personality.join('、') 
          : ipPositioning.basicInfo.personality)
      : null;
    const age = ipPositioning.basicInfo.age;
    const location = ipPositioning.basicInfo.location;
    
    // minimal模式使用精简格式
    if (mode === 'minimal') {
      constraints.push(`【创作者身份】
身份：${identity}${nickname ? `（${nickname}）` : ''}
${personality ? `特点：${personality}` : ''}`);
    } else {
      constraints.push(`【身份约束 - ${constraintLevel}】

你的身份是"${identity}"${nickname ? `（可称呼"${nickname}"）` : ''}。
${constraintWord}以这个身份的视角和口吻进行创作。

${age ? `年龄特征：${age}` : ''}
${location ? `地域特征：${location}` : ''}
${personality ? `性格特点：${personality}` : ''}

${includeGuidance ? `
【身份创作指南】
✅ 正确做法：
- 使用符合身份的专业术语和表达方式
- 分享与身份相关的真实经验和见解
- 案例来自身份相关的行业领域

❌ 错误做法：
- 使用不符合身份的网络流行语
- 分享跨行业的生硬案例
- 表达与身份不符的观点
` : ''}`);
    }
  }
  
  // === 专业领域约束 ===
  if (emphasis.includes('expertise') && (
    ipPositioning.positioningDirection?.nicheField ||
    ipPositioning.coreValue?.skills?.length ||
    ipPositioning.coreValue?.specialties?.length
  )) {
    const nicheField = ipPositioning.positioningDirection?.nicheField;
    const skills = ipPositioning.coreValue?.skills 
      ? (Array.isArray(ipPositioning.coreValue.skills) 
          ? ipPositioning.coreValue.skills.join('、') 
          : ipPositioning.coreValue.skills)
      : null;
    const specialties = ipPositioning.coreValue?.specialties 
      ? (Array.isArray(ipPositioning.coreValue.specialties) 
          ? ipPositioning.coreValue.specialties.join('、') 
          : ipPositioning.coreValue.specialties)
      : null;
    const contentTrack = ipPositioning.positioningDirection?.contentTrack 
      ? (Array.isArray(ipPositioning.positioningDirection.contentTrack) 
          ? ipPositioning.positioningDirection.contentTrack.join('、') 
          : ipPositioning.positioningDirection.contentTrack)
      : null;
    
    // minimal模式使用精简格式
    if (mode === 'minimal') {
      constraints.push(`
【专业领域】
${nicheField ? `领域：${nicheField}` : ''}
${specialties ? `特长：${specialties}` : ''}`);
    } else {
      constraints.push(`【专业领域约束 - ${constraintLevel}】

${nicheField ? `专业领域：${nicheField}` : ''}
${skills ? `擅长技能：${skills}` : ''}
${specialties ? `专业特长：${specialties}` : ''}
${contentTrack ? `内容赛道：${contentTrack}` : ''}

内容${constraintWord}围绕以上专业领域展开，案例和素材${constraintWord}来自相关领域。

${includeGuidance ? `
【专业领域创作指南】
✅ 正确做法：
- 深入讲解专业领域内的知识
- 分享领域内的真实案例和经验
- 用专业视角分析问题

❌ 错误做法：
- 跨领域生搬硬套不相关案例
- 使用非专业领域的生涩术语
- 分享与专业无关的内容
` : ''}`);
    }
  }
  
  // === 目标用户约束 ===
  if (emphasis.includes('audience') && (
    ipPositioning.userPersona?.targetUsers ||
    ipPositioning.userPersona?.userPainPoints ||
    ipPositioning.userPersona?.commonQuestions?.length
  )) {
    const targetUsers = ipPositioning.userPersona?.targetUsers;
    const painPoints = ipPositioning.userPersona?.userPainPoints;
    const commonQuestions = ipPositioning.userPersona?.commonQuestions 
      ? (Array.isArray(ipPositioning.userPersona.commonQuestions) 
          ? ipPositioning.userPersona.commonQuestions.join('、') 
          : ipPositioning.userPersona.commonQuestions)
      : null;
    
    // minimal模式使用精简格式
    if (mode === 'minimal') {
      constraints.push(`
【目标用户】
${targetUsers ? `用户：${targetUsers}` : ''}
${painPoints ? `痛点：${painPoints}` : ''}`);
    } else {
      constraints.push(`【目标用户约束 - ${constraintLevel}】

${targetUsers ? `目标用户：${targetUsers}` : ''}
${painPoints ? `用户痛点：${painPoints}` : ''}
${commonQuestions ? `用户常问：${commonQuestions}` : ''}

内容${constraintWord}针对目标用户的需求和痛点，使用他们能理解的语言。

${includeGuidance ? `
【目标用户创作指南】
✅ 正确做法：
- 用目标用户熟悉的语言和场景表达
- 回答目标用户关心的问题
- 解决目标用户的实际痛点

❌ 错误做法：
- 使用过于专业或生涩的表达
- 讨论目标用户不关心的话题
- 忽略目标用户的认知水平
` : ''}`);
    }
  }
  
  // === 风格调性约束 ===
  if (emphasis.includes('tone') && (
    ipPositioning.contentDirection?.contentStyle ||
    ipPositioning.basicInfo?.personality?.length
  )) {
    const contentStyle = ipPositioning.contentDirection?.contentStyle;
    const personality = ipPositioning.basicInfo?.personality 
      ? (Array.isArray(ipPositioning.basicInfo.personality) 
          ? ipPositioning.basicInfo.personality.join('、') 
          : ipPositioning.basicInfo.personality)
      : null;
    
    // minimal模式跳过风格约束（选题场景不需要）
    if (mode !== 'minimal') {
      constraints.push(`【风格调性约束 - ${constraintLevel}】

${contentStyle ? `内容风格：${contentStyle}` : ''}
${personality ? `性格特点：${personality}` : ''}

${constraintWord}保持风格一致性，表达方式${constraintWord}符合性格特点。

${includeGuidance ? `
【风格调性创作指南】
✅ 正确做法：
- 保持与历史内容一致的风格
- 用符合性格的方式表达观点
- 建立独特的个人风格标签

❌ 错误做法：
- 风格跳跃、前后不一致
- 模仿其他创作者的说话方式
- 忽略已建立的个人调性
` : ''}`);
    }
  }
  
  // === 内容方向约束 ===
  if (emphasis.includes('content') && (
    ipPositioning.contentDirection?.mainTopics?.length ||
    ipPositioning.lifeExperience
  )) {
    const mainTopics = ipPositioning.contentDirection?.mainTopics 
      ? (Array.isArray(ipPositioning.contentDirection.mainTopics) 
          ? ipPositioning.contentDirection.mainTopics.join('、') 
          : ipPositioning.contentDirection.mainTopics)
      : null;
    const motto = ipPositioning.lifeExperience?.motto;
    const highlights = ipPositioning.lifeExperience?.highlights;
    
    // minimal模式跳过内容方向约束（选题场景不需要）
    if (mode !== 'minimal') {
      constraints.push(`【内容方向约束 - ${constraintLevel}】

${mainTopics ? `主要话题：${mainTopics}` : ''}
${motto ? `人生格言：${motto}` : ''}
${highlights ? `高光时刻：${highlights}` : ''}

${constraintWord}围绕以上话题方向创作内容。

${includeGuidance ? `
【内容方向创作指南】
✅ 正确做法：
- 选择与话题方向相关的主题
- 融入个人经历和感悟
- 保持内容的一致性和连续性

❌ 错误做法：
- 选择与话题方向无关的主题
- 内容跳跃、缺乏主线
- 忽略个人经历和特色
` : ''}`);
    }
  }

  if (constraints.length === 0) return '';
  
  // minimal模式使用精简头部
  const header = mode === 'minimal'
    ? customerName 
      ? `【创作者档案：${customerName}】`
      : `【创作者档案】`
    : customerName 
      ? `═══════════════════════════════════════════════════════════════
【创作者档案约束：${customerName}】
═══════════════════════════════════════════════════════════════`
      : `═══════════════════════════════════════════════════════════════
【创作者档案约束】
═══════════════════════════════════════════════════════════════`;

  // minimal模式不显示尾部装饰线和自检
  const footer = mode === 'minimal' ? '' : '\n\n═══════════════════════════════════════════════════════════════';

  // minimal模式不显示自检
  const selfCheck = mode === 'minimal' ? '' : `
【⚠️ 身份自检 - 生成前必须检查】
□ 是否以"${ipPositioning.basicInfo?.identity || '创作者'}"视角创作？
□ 案例是否来自"${ipPositioning.positioningDirection?.nicheField || '专业领域'}"？
□ 表达方式是否符合"${ipPositioning.userPersona?.targetUsers || '目标用户'}"的理解水平？
□ 有没有出现与身份不符的案例或表达？（如有则删除替换）`;

  return `\n\n${header}\n\n${constraints.join('\n\n')}${selfCheck}${footer}`;
}

/**
 * 构建IP定位参考信息（用于选题等不需要严格约束的场景）
 */
export function buildIPReference(
  ipPositioning: IPPositioning | null | undefined,
  customerName?: string
): string {
  if (!ipPositioning) return '';

  const sections: string[] = [];
  
  // 基本信息
  if (ipPositioning.basicInfo?.identity) {
    const parts: string[] = [];
    parts.push(`身份：${ipPositioning.basicInfo.identity}`);
    if (ipPositioning.basicInfo.nickname) parts.push(`昵称：${ipPositioning.basicInfo.nickname}`);
    if (ipPositioning.basicInfo.age) parts.push(`年龄：${ipPositioning.basicInfo.age}`);
    if (ipPositioning.basicInfo.location) parts.push(`所在地：${ipPositioning.basicInfo.location}`);
    sections.push(`【身份信息】\n${parts.join('、')}`);
  }
  
  // 专业领域
  if (ipPositioning.positioningDirection?.nicheField) {
    sections.push(`【专业领域】${ipPositioning.positioningDirection.nicheField}`);
  }
  
  // 目标用户
  if (ipPositioning.userPersona?.targetUsers) {
    sections.push(`【目标用户】${ipPositioning.userPersona.targetUsers}`);
  }

  if (sections.length === 0) return '';
  
  const header = customerName 
    ? `【创作者：${customerName}】（仅供参考）`
    : '【创作者档案】（仅供参考）';

  return `\n\n${header}\n${sections.join('\n')}\n`;
}

/**
 * 构建仿写身份映射指令
 * 
 * 这是仿写功能的核心：将参考视频的身份映射到创作者档案的身份
 */
export function buildIdentityMappingInstruction(
  ipPositioning: IPPositioning | null | undefined,
  originalContext?: string
): string {
  if (!ipPositioning?.basicInfo?.identity) return '';

  const targetIdentity = ipPositioning.basicInfo.identity;
  const targetField = ipPositioning.positioningDirection?.nicheField || '相关领域';
  const targetAudience = ipPositioning.userPersona?.targetUsers || '目标用户';
  
  return `
【仿写身份映射指令 - 必须执行】

你正在进行"仿写"创作，核心是将参考内容的身份映射到创作者档案的身份。

═══════════════════════════════════════════════════════════════
身份映射规则
═══════════════════════════════════════════════════════════════

目标身份：${targetIdentity}
目标领域：${targetField}
目标用户：${targetAudience}

映射步骤：
1. 识别参考内容的"话题"（核心讨论点）
2. 识别参考内容的"结构"（叙事流程、情绪曲线）
3. 将参考内容中的"身份"替换为"${targetIdentity}"
4. 将参考内容中的"案例"替换为${targetField}相关案例
5. 将参考内容中的"表达"调整为符合目标用户习惯

═══════════════════════════════════════════════════════════════
映射示例
═══════════════════════════════════════════════════════════════

原内容（烧烤店老板）：
"做烧烤8年，我发现90%的新手都犯一个错——上来就追求味道。其实位置比味道重要十倍..."

仿写后（${targetIdentity}）：
"开${targetField}多年，我发现90%的新手都犯一个错——[替换为${targetField}相关问题]。其实[替换为${targetField}核心要点]..."

═══════════════════════════════════════════════════════════════
重要提醒
═══════════════════════════════════════════════════════════════

✅ 必须保持：
- 话题核心逻辑
- 叙事结构流程
- 情绪起伏曲线
- 爆款技巧（钩子、金句位置）

✅ 必须替换：
- 身份角色 → ${targetIdentity}
- 行业案例 → ${targetField}相关
- 用户场景 → ${targetAudience}相关

❌ 禁止：
- 直接照搬参考内容
- 使用与${targetIdentity}身份不符的表达
- 使用与${targetField}无关的案例
`;
}
