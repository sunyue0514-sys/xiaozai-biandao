/**
 * 账号规划深度采集问题配置
 * 用于生成账号规划前的补充信息采集
 */

// ==================== 类型定义 ====================

/** 问题类型 */
export type QuestionType = 'single_select' | 'multi_select' | 'text' | 'number';

/** 单个问题定义 */
export interface SurveyQuestion {
  /** 问题ID */
  id: string;
  /** 问题标题 */
  title: string;
  /** 问题描述/提示 */
  description?: string;
  /** 问题类型 */
  type: QuestionType;
  /** 选项（单选/多选时使用）*/
  options?: SurveyOption[];
  /** 是否必填 */
  required: boolean;
  /** 占位符（文本/数字输入时使用）*/
  placeholder?: string;
  /** 排序权重 */
  order: number;
}

/** 选项定义 */
export interface SurveyOption {
  /** 选项值 */
  value: string;
  /** 选项标签 */
  label: string;
  /** 选项描述 */
  description?: string;
}

/** 采集表单数据 */
export interface SurveyFormData {
  /** 当前最大痛点（多选）*/
  painPoints: string[];
  /** 核心资源优势（多选）*/
  resources: string[];
  /** 每周可发布内容数量 */
  weeklyPosts: number;
  /** 期望见效时间 */
  expectedTimeline: string;
  /** 是否有团队 */
  hasTeam: boolean | string;
  /** 是否有直播能力 */
  canLivestream: boolean | string;
  /** 其他补充信息 */
  additionalInfo?: string;
}

// ==================== 问题配置 ====================

/** 当前最大痛点选项 */
export const PAIN_POINT_OPTIONS: SurveyOption[] = [
  { value: 'no_traffic', label: '流量不足', description: '内容曝光低，没人看' },
  { value: 'low_conversion', label: '转化率低', description: '有人看但没人咨询/到店' },
  { value: 'low_price', label: '客单价上不去', description: '来的都是薅羊毛的' },
  { value: 'unclear_persona', label: '人设不清晰', description: '不知道怎么定位自己' },
  { value: 'content_risk', label: '内容违规风险', description: '发的内容容易被限流' },
  { value: 'no_time', label: '没时间运营', description: '一个人忙不过来' },
  { value: 'no_idea', label: '不知道发什么', description: '选题困难，内容枯竭' },
];

/** 核心资源优势选项 */
export const RESOURCE_OPTIONS: SurveyOption[] = [
  { value: 'professional', label: '专业背书', description: '从业年限、资质证书、行业经验' },
  { value: 'location', label: '场地优势', description: '店铺位置好、面积大、环境好' },
  { value: 'product', label: '产品优势', description: '独家产品、性价比高、特色服务' },
  { value: 'team', label: '团队优势', description: '有运营团队、员工配合度高' },
  { value: 'fans_base', label: '粉丝基础', description: '已有一定粉丝量' },
  { value: 'budget', label: '推广预算', description: '愿意投入广告费' },
  { value: 'time', label: '时间充裕', description: '有时间亲自运营' },
];

/** 期望见效时间选项 */
export const TIMELINE_OPTIONS: SurveyOption[] = [
  { value: '1_week', label: '1周内', description: '希望快速见效' },
  { value: '1_month', label: '1个月内', description: '可以接受稍长周期' },
  { value: '3_months', label: '3个月内', description: '愿意慢慢积累' },
  { value: 'no_urgent', label: '不着急', description: '长期规划为主' },
];

/** 深度采集问题列表 */
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'painPoints',
    title: '当前最大的痛点是什么？',
    description: '可多选，我们会针对性给出解决方案',
    type: 'multi_select',
    options: PAIN_POINT_OPTIONS,
    required: true,
    order: 1,
  },
  {
    id: 'resources',
    title: '你有哪些核心资源/优势？',
    description: '可多选，帮助我们更好地挖掘你的亮点',
    type: 'multi_select',
    options: RESOURCE_OPTIONS,
    required: true,
    order: 2,
  },
  {
    id: 'weeklyPosts',
    title: '每周能发布几条内容？',
    type: 'number',
    required: true,
    placeholder: '建议3-7条',
    order: 3,
  },
  {
    id: 'expectedTimeline',
    title: '希望多久看到效果？',
    type: 'single_select',
    options: TIMELINE_OPTIONS,
    required: true,
    order: 4,
  },
  {
    id: 'hasTeam',
    title: '是否有团队协助运营？',
    type: 'single_select',
    options: [
      { value: 'yes', label: '有团队' },
      { value: 'no', label: '一个人运营' },
    ],
    required: true,
    order: 5,
  },
  {
    id: 'canLivestream',
    title: '是否有直播能力？',
    type: 'single_select',
    options: [
      { value: 'yes', label: '可以直播' },
      { value: 'sometimes', label: '偶尔可以' },
      { value: 'no', label: '暂时不行' },
    ],
    required: true,
    order: 6,
  },
  {
    id: 'additionalInfo',
    title: '还有什么想补充的？',
    description: '其他情况或特殊需求',
    type: 'text',
    required: false,
    placeholder: '选填，如竞品情况、特殊限制等',
    order: 7,
  },
];

// ==================== 辅助函数 ====================

/** 获取问题列表（按顺序）*/
export function getSurveyQuestions(): SurveyQuestion[] {
  return [...SURVEY_QUESTIONS].sort((a, b) => a.order - b.order);
}

/** 根据ID获取问题 */
export function getQuestionById(id: string): SurveyQuestion | undefined {
  return SURVEY_QUESTIONS.find(q => q.id === id);
}

/** 获取默认表单数据 */
export function getDefaultFormData(): SurveyFormData {
  return {
    painPoints: [],
    resources: [],
    weeklyPosts: 5,
    expectedTimeline: '1_month',
    hasTeam: false,
    canLivestream: false,
    additionalInfo: '',
  };
}

/** 验证表单数据 */
export function validateFormData(data: Partial<SurveyFormData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.painPoints || data.painPoints.length === 0) {
    errors.push('请选择至少一个痛点');
  }
  
  if (!data.resources || data.resources.length === 0) {
    errors.push('请选择至少一个资源优势');
  }
  
  if (!data.weeklyPosts || data.weeklyPosts < 1) {
    errors.push('请填写每周发布数量');
  }
  
  if (!data.expectedTimeline) {
    errors.push('请选择期望见效时间');
  }
  
  if (data.hasTeam === undefined) {
    errors.push('请选择是否有团队');
  }
  
  if (data.canLivestream === undefined) {
    errors.push('请选择是否有直播能力');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/** 获取痛点标签映射 */
export function getPainPointLabel(value: string): string {
  const option = PAIN_POINT_OPTIONS.find(o => o.value === value);
  return option?.label || value;
}

/** 获取资源标签映射 */
export function getResourceLabel(value: string): string {
  const option = RESOURCE_OPTIONS.find(o => o.value === value);
  return option?.label || value;
}

/** 获取时间线标签映射 */
export function getTimelineLabel(value: string): string {
  const option = TIMELINE_OPTIONS.find(o => o.value === value);
  return option?.label || value;
}
