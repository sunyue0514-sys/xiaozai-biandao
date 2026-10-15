/**
 * 系统提示词常量
 * 包含内容审核约束和通用行为规范
 */

// 内容审核系统提示词 - 必须添加到所有LLM调用中
export const CONTENT_SAFETY_PROMPT = `## 内容安全规范

你是一个专业的内容创作助手，必须严格遵守以下内容安全规范：

### 禁止生成的内容
1. **违法违规内容**
   - 违反中国法律法规的内容
   - 危害国家安全、泄露国家秘密的内容
   - 煽动民族仇恨、民族歧视的内容
   - 破坏宗教信仰自由的内容
   - 散布谣言、扰乱社会秩序的内容

2. **低俗不良内容**
   - 淫秽、色情、低俗的内容
   - 暴力、血腥、恐怖的内容
   - 赌博、吸毒、酗酒等不良行为美化

3. **侵权内容**
   - 侵犯他人知识产权的内容
   - 侵犯他人隐私的内容
   - 诽谤、侮辱他人的内容

4. **虚假信息**
   - 虚假广告、夸大宣传
   - 伪科学内容
   - 误导性健康信息

5. **敏感政治内容**
   - 涉及政治敏感话题的内容
   - 可能引发社会争议的政治评论

### 生成内容规范
- 所有生成的内容必须积极向上、健康文明
- 内容应当真实可信，不传播虚假信息
- 尊重他人的合法权益，不侵犯他人隐私和知识产权
- 用词文明，不使用低俗、粗俗的语言
- 内容应当具有建设性和正面价值

### 遇到违规请求时的处理
- 如果用户的请求涉及上述禁止内容，请礼貌拒绝并说明原因
- 可以建议用户提出其他合规的创作需求
- 不要尝试绕过限制或以隐晦方式生成违规内容

`;

// 🔥 前3秒钩子设计 - 短视频生死线
export const HOOK_DESIGN_PROMPT = `【🔥 开头钩子设计 - 前3秒定生死】
短视频前三秒决定用户是否继续观看，必须使用以下钩子之一开头：

1. 提问钩子：用问题引发好奇
   - "你知道为什么...吗？"
   - "有没有想过..."
   - "很多人问我..."

2. 反常识钩子：颠覆认知，制造悬念
   - "大多数人都搞错了..."
   - "真相其实是..."
   - "你以为...但其实..."

3. 利益钩子：直接展示价值
   - "今天教你..."
   - "学会这一招..."
   - "只要3分钟让你..."

4. 故事钩子：用场景代入
   - "我有一个朋友..."
   - "昨天发生了一件事..."
   - "记得有一次..."

5. 数据钩子：用数字说话
   - "90%的人不知道..."
   - "我测试了100次发现..."
   - "这个方法帮了10万人..."

6. 负面钩子：制造紧迫感
   - "千万别..."
   - "如果你还在...那就危险了"
   - "再不...就晚了"

7. 对比钩子：制造反差
   - "别人花3年，我只用3天..."
   - "同样是...为什么他能..."
   - "以前我也...直到..."

8. 揭秘钩子：满足窥探欲
   - "终于有人敢说实话了..."
   - "今天曝光一个秘密..."
   - "内部消息..."

【钩子使用要点】
- 开头第一句话必须是钩子
- 钩子要与内容主题强相关
- 钩子要自然过渡到正文
- 不要为了钩子而钩子`;

// 💎 金句植入 - 传播记忆点
export const GOLDEN_SENTENCE_PROMPT = `【💎 金句植入 - 必须包含1-2句金句】
文案/脚本中必须植入金句，金句特点：
- 短小精悍，10-20字
- 朗朗上口，便于传播
- 有道理有共鸣
- 可以独立成句被引用

金句位置：文案中后段，作为升华或总结

金句示例：
- "创业最快速的方式是什么？借鉴并超越"
- "你不是没时间，你是不够想要"
- "认知决定高度，行动决定结果"`;

// 🎭 情绪调动设计
export const EMOTION_DESIGN_PROMPT = `【🎭 情绪调动设计】
文案/脚本的情绪曲线：

1. 开头（0-3秒）：引发好奇/焦虑/期待
   - 目的：抓住注意力
   - 手法：钩子+悬念

2. 中间（3-45秒）：产生共鸣/认同/惊讶
   - 目的：建立情感连接
   - 手法：故事+案例+金句

3. 高潮（45-55秒）：情绪爆发/反转/顿悟
   - 目的：制造记忆点
   - 手法：金句+升华

4. 结尾（55-60秒）：行动欲望/转发冲动/收藏动机
   - 目的：驱动行为
   - 手法：引导+号召`;

// 短视频创作专用的系统提示词
export const VIDEO_CREATION_PROMPT = `## 短视频内容创作规范

你是一个专业的短视频内容创作专家，帮助用户创作高质量的短视频脚本和文案。

### 创作原则
1. 内容原创，避免抄袭
2. 语言自然流畅，符合口语表达习惯
3. 开头要抓住眼球，3秒内吸引观众
4. 内容有实用价值或娱乐价值
5. 结尾有引导互动的元素

### 内容风格
- 接地气，贴近生活
- 有温度，能引起共鸣
- 有态度，观点鲜明但不极端
- 有趣味，但不低俗

### 禁止事项
- 不生成任何违法违规内容
- 不生成低俗、庸俗、媚俗的内容
- 不生成可能引发社会争议的敏感内容
- 不生成虚假夸大的营销内容

`;

// 运营分析专用的系统提示词
export const OPERATIONS_PROMPT = `## 运营分析规范

你是一个专业的短视频运营分析师，帮助用户进行账号分析和运营策略制定。

### 分析原则
1. 数据驱动，客观分析
2. 提供可执行的建议
3. 关注平台规则和最佳实践
4. 保护用户隐私，不泄露敏感数据

### 禁止事项
- 不提供刷量、刷粉等违规操作建议
- 不建议任何违反平台规则的行为
- 不分析或传播他人的私密信息

`;

// 获取完整的系统提示词
export function getSystemPrompt(type: 'content' | 'video' | 'operations' = 'video'): string {
  const prompts: Record<string, string> = {
    content: CONTENT_SAFETY_PROMPT,
    video: CONTENT_SAFETY_PROMPT + VIDEO_CREATION_PROMPT,
    operations: CONTENT_SAFETY_PROMPT + OPERATIONS_PROMPT,
  };
  
  return prompts[type] || prompts.video;
}

/**
 * IP定位信息接口定义
 */
// 从统一类型文件导入
import type { IPPositioning } from '@/types/ip-positioning';

// 重新导出以保持向后兼容
export type { IPPositioning } from '@/types/ip-positioning';

// ⚠️ 以下接口已迁移到 src/types/ip-positioning.ts
// 请使用 import { IPPositioning } from '@/types/ip-positioning'
// 本地定义已删除，使用统一类型

/**
 * 构建完整的IP定位提示词（用于AI创作参考）
 * @param ipPositioning IP定位信息
 * @param customerName 客户名称（可选）
 * @param mode 模式：'full' 完整版 | 'compact' 精简版 | 'topic' 选题专用
 * @returns 格式化的IP定位提示词
 * @deprecated 请使用 `buildIPConstraints` 替代。新版本将IP定位从"参考信息"变为"创作约束"，解决了生成内容不贴切的问题。
 * @see {@link import('@/lib/prompt-engineering').buildIPConstraints}
 */
export function buildIPPositioningPrompt(
  ipPositioning: IPPositioning | null | undefined,
  customerName?: string,
  mode: 'full' | 'compact' | 'topic' = 'full'
): string {
  if (!ipPositioning) return '';

  const sections: string[] = [];

  // 基本身份信息
  if (ipPositioning.basicInfo?.identity || ipPositioning.basicInfo?.nickname) {
    const basicParts: string[] = [];
    if (ipPositioning.basicInfo.identity) {
      basicParts.push(`身份定位：${ipPositioning.basicInfo.identity}`);
    }
    if (ipPositioning.basicInfo.nickname) {
      basicParts.push(`昵称/人设：${ipPositioning.basicInfo.nickname}`);
    }
    if (ipPositioning.basicInfo.gender && mode === 'full') {
      basicParts.push(`性别：${ipPositioning.basicInfo.gender}`);
    }
    if (ipPositioning.basicInfo.age && mode === 'full') {
      basicParts.push(`年龄：${ipPositioning.basicInfo.age}`);
    }
    if (ipPositioning.basicInfo.location && mode === 'full') {
      basicParts.push(`所在地：${ipPositioning.basicInfo.location}`);
    }
    if (ipPositioning.basicInfo.appearance && mode === 'full') {
      basicParts.push(`外貌形象：${ipPositioning.basicInfo.appearance}`);
    }
    if (ipPositioning.basicInfo.personality?.length && mode === 'full') {
      const personalityText = Array.isArray(ipPositioning.basicInfo.personality)
        ? ipPositioning.basicInfo.personality.join('、')
        : ipPositioning.basicInfo.personality;
      basicParts.push(`性格特点：${personalityText}`);
    }
    if (ipPositioning.basicInfo.othersEvaluation && mode === 'full') {
      basicParts.push(`他人评价：${ipPositioning.basicInfo.othersEvaluation}`);
    }
    if (ipPositioning.basicInfo.familyInfluence && mode === 'full') {
      basicParts.push(`家庭影响：${ipPositioning.basicInfo.familyInfluence}`);
    }
    if (ipPositioning.basicInfo.careerView && mode === 'full') {
      basicParts.push(`事业观：${ipPositioning.basicInfo.careerView}`);
    }
    sections.push(`【身份信息】\n${basicParts.join('\n')}`);
  }

  // 核心价值与擅长领域
  if (ipPositioning.coreValue?.interests?.length || ipPositioning.coreValue?.skills?.length || ipPositioning.coreValue?.specialties?.length || ipPositioning.coreValue?.passions || ipPositioning.coreValue?.valueProvided) {
    const valueParts: string[] = [];
    if (ipPositioning.coreValue.interests?.length) {
      const interestsText = Array.isArray(ipPositioning.coreValue.interests)
        ? ipPositioning.coreValue.interests.join('、')
        : ipPositioning.coreValue.interests;
      valueParts.push(`兴趣爱好：${interestsText}`);
    }
    if (ipPositioning.coreValue.skills?.length) {
      const skillsText = Array.isArray(ipPositioning.coreValue.skills)
        ? ipPositioning.coreValue.skills.join('、')
        : ipPositioning.coreValue.skills;
      valueParts.push(`擅长技能：${skillsText}`);
    }
    if (ipPositioning.coreValue.specialties?.length) {
      const specialtiesText = Array.isArray(ipPositioning.coreValue.specialties) 
        ? ipPositioning.coreValue.specialties.join('、')
        : ipPositioning.coreValue.specialties;
      valueParts.push(`专业特长：${specialtiesText}`);
    }
    if (ipPositioning.coreValue.passions && mode === 'full') {
      valueParts.push(`热情所在：${ipPositioning.coreValue.passions}`);
    }
    if (ipPositioning.coreValue.valueProvided && mode === 'full') {
      valueParts.push(`核心价值：${ipPositioning.coreValue.valueProvided}`);
    }
    sections.push(`【核心价值】\n${valueParts.join('\n')}`);
  }

  // 专业领域与定位方向
  if (ipPositioning.positioningDirection?.nicheField || ipPositioning.positioningDirection?.contentTrack?.length || ipPositioning.positioningDirection?.monetization?.length) {
    const expertParts: string[] = [];
    if (ipPositioning.positioningDirection.nicheField) {
      expertParts.push(`专业领域：${ipPositioning.positioningDirection.nicheField}`);
    }
    if (ipPositioning.positioningDirection.contentTrack?.length) {
      const contentTrackText = Array.isArray(ipPositioning.positioningDirection.contentTrack)
        ? ipPositioning.positioningDirection.contentTrack.join('、')
        : ipPositioning.positioningDirection.contentTrack;
      expertParts.push(`内容赛道：${contentTrackText}`);
    }
    if (ipPositioning.positioningDirection.monetization?.length && mode !== 'compact') {
      const monetizationText = Array.isArray(ipPositioning.positioningDirection.monetization)
        ? ipPositioning.positioningDirection.monetization.join('、')
        : ipPositioning.positioningDirection.monetization;
      expertParts.push(`变现方向：${monetizationText}`);
    }
    sections.push(`【定位方向】\n${expertParts.join('\n')}`);
  }

  // 核心业务（兼容旧字段）
  if (ipPositioning.coreBusiness) {
    sections.push(`【核心业务】\n${ipPositioning.coreBusiness}`);
  }

  // 人生经历（故事类内容专用）
  if (ipPositioning.lifeExperience && mode === 'full') {
    const lifeParts: string[] = [];
    if (ipPositioning.lifeExperience.last10Years) {
      lifeParts.push(`近10年经历：${ipPositioning.lifeExperience.last10Years}`);
    }
    if (ipPositioning.lifeExperience.turningPoints) {
      lifeParts.push(`人生转折点：${ipPositioning.lifeExperience.turningPoints}`);
    }
    if (ipPositioning.lifeExperience.highlights) {
      lifeParts.push(`高光时刻：${ipPositioning.lifeExperience.highlights}`);
    }
    if (ipPositioning.lifeExperience.darkMoments) {
      lifeParts.push(`至暗时刻：${ipPositioning.lifeExperience.darkMoments}`);
    }
    if (ipPositioning.lifeExperience.motto) {
      lifeParts.push(`人生格言：${ipPositioning.lifeExperience.motto}`);
    }
    if (lifeParts.length > 0) {
      sections.push(`【人生经历】\n${lifeParts.join('\n')}`);
    }
  }

  // 目标用户与痛点
  if (ipPositioning.userPersona?.targetUsers || ipPositioning.userPersona?.userPainPoints || ipPositioning.userPersona?.competitiveAdvantage || ipPositioning.userPersona?.commonQuestions?.length) {
    const userParts: string[] = [];
    if (ipPositioning.userPersona.targetUsers) {
      userParts.push(`目标用户：${ipPositioning.userPersona.targetUsers}`);
    }
    if (ipPositioning.userPersona.userPainPoints) {
      userParts.push(`用户痛点：${ipPositioning.userPersona.userPainPoints}`);
    }
    if (ipPositioning.userPersona.competitiveAdvantage && mode !== 'compact') {
      userParts.push(`竞争优势：${ipPositioning.userPersona.competitiveAdvantage}`);
    }
    if (ipPositioning.userPersona.commonQuestions?.length && mode === 'full') {
      const questionsText = Array.isArray(ipPositioning.userPersona.commonQuestions)
        ? ipPositioning.userPersona.commonQuestions.join('、')
        : ipPositioning.userPersona.commonQuestions;
      userParts.push(`用户常问：${questionsText}`);
    }
    sections.push(`【目标用户】\n${userParts.join('\n')}`);
  }

  // 产品服务
  if ((ipPositioning.productsServices?.products?.length || ipPositioning.productsServices?.services?.length) && mode === 'full') {
    const productParts: string[] = [];
    if (ipPositioning.productsServices.products?.length) {
      const productsText = Array.isArray(ipPositioning.productsServices.products)
        ? ipPositioning.productsServices.products.join('、')
        : ipPositioning.productsServices.products;
      productParts.push(`产品：${productsText}`);
    }
    if (ipPositioning.productsServices.services?.length) {
      const servicesText = Array.isArray(ipPositioning.productsServices.services)
        ? ipPositioning.productsServices.services.join('、')
        : ipPositioning.productsServices.services;
      productParts.push(`服务：${servicesText}`);
    }
    sections.push(`【产品服务】\n${productParts.join('\n')}`);
  }

  // 内容方向
  if (ipPositioning.contentDirection?.contentStyle || ipPositioning.contentDirection?.mainTopics?.length || ipPositioning.contentDirection?.updateFrequency) {
    const contentParts: string[] = [];
    if (ipPositioning.contentDirection.contentStyle) {
      contentParts.push(`内容风格：${ipPositioning.contentDirection.contentStyle}`);
    }
    if (ipPositioning.contentDirection.mainTopics?.length && mode !== 'compact') {
      const topicsText = Array.isArray(ipPositioning.contentDirection.mainTopics)
        ? ipPositioning.contentDirection.mainTopics.join('、')
        : ipPositioning.contentDirection.mainTopics;
      contentParts.push(`主要话题：${topicsText}`);
    }
    if (ipPositioning.contentDirection.updateFrequency && mode === 'full') {
      contentParts.push(`更新频率：${ipPositioning.contentDirection.updateFrequency}`);
    }
    sections.push(`【内容方向】\n${contentParts.join('\n')}`);
  }

  if (sections.length === 0) return '';

  const header = customerName 
    ? `【创作者档案：${customerName}】（仅供参考，不要在输出中提及档案信息）`
    : '【创作者档案】（仅供参考，不要在输出中提及档案信息）';

  return `\n\n${header}\n\n${sections.join('\n\n')}\n`;
}

/**
 * 构建选题专用的IP定位提示词（精简版）
 * @deprecated 请使用 `buildIPConstraints` 替代，设置 mode: 'minimal'
 * @see {@link import('@/lib/prompt-engineering').buildIPConstraints}
 */
export function buildTopicIPPositioningPrompt(
  ipPositioning: IPPositioning | null | undefined,
  customerName?: string
): string {
  return buildIPPositioningPrompt(ipPositioning, customerName, 'topic');
}

/**
 * 构建文案/脚本专用的IP定位提示词（完整版）
 * @deprecated 请使用 `buildIPConstraints` 替代，设置 mode: 'strict' 或 'flexible'
 * @see {@link import('@/lib/prompt-engineering').buildIPConstraints}
 */
export function buildContentIPPositioningPrompt(
  ipPositioning: IPPositioning | null | undefined,
  customerName?: string
): string {
  return buildIPPositioningPrompt(ipPositioning, customerName, 'full');
}
