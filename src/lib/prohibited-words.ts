/**
 * 违禁词检测模块
 * 用于检测文案中的违禁词汇，并提供替换建议
 * 
 * 涵盖：
 * 1. 绝对化用语（广告法禁止）
 * 2. 医疗功效词（普通产品禁止）
 * 3. 黑五类专属违禁词（减肥、壮阳、丰胸、增高、医美）
 * 4. 隐性违禁词（可能引起联想的描述）
 */

/**
 * 违禁词等级
 */
export type ProhibitedLevel = 'critical' | 'absolute' | 'industry' | 'risky';

/**
 * 违禁词检测结果
 */
export interface ProhibitedWordResult {
  word: string;
  level: ProhibitedLevel;
  position: [number, number];
  suggestion?: string;
  category?: string;
}

/**
 * 黑五类产品类型
 */
export type BlackFiveType = 
  | 'weight_loss' 
  | 'male_enhancement' 
  | 'breast_enhancement' 
  | 'height_increase' 
  | 'medical_beauty'
  | 'health_supplement';  // 新增：保健品滋补类

/**
 * 黑五类产品配置
 */
export const BLACK_FIVE_PRODUCTS: Record<BlackFiveType, {
  name: string;
  keywords: string[];
  riskLevel: 'high' | 'critical';
  description: string;
}> = {
  health_supplement: {
    name: '保健品滋补类',
    keywords: [
      '滋补', '补品', '保健品', '保健食品', '营养品',
      '补气', '补血', '补阴', '补阳', '滋阴', '壮阳',
      '气血', '气虚', '血虚', '阴虚', '阳虚',
      '肾虚', '脾虚', '肺虚', '肝虚', '心虚',
      '虚不受补', '气血不足', '气血两亏',
      '人参', '高丽参', '西洋参', '鹿茸', '冬虫夏草',
      '阿胶', '燕窝', '花胶', '灵芝', '孢子粉',
      '枸杞', '黄芪', '当归', '党参', '熟地',
      '气血双补', '阴阳双补', '大补', '温补', '清补',
      '调理身体', '养生', '滋补养生', '中医滋补',
      '功能性食品', '保健功能', '营养保健',
    ],
    riskLevel: 'high',
    description: '涉及滋补保健、养生调理等产品，需避免医疗功效宣传',
  },
  weight_loss: {
    name: '减肥瘦身类',
    keywords: [
      '减肥', '瘦身', '减脂', '燃脂', '甩脂', '溶脂', '吸脂',
      '瘦脸', '瘦腿', '瘦腰', '瘦肚', '瘦身', '纤体',
      '代餐', '燃脂', '酵素', '左旋肉碱', '减肥茶', '减肥药',
      '甩肉', '掉秤', '减重', '轻体', '塑身', '收腹',
      '燃脂机', '甩脂机', '瘦身霜', '减肥贴', '瘦身贴',
      '暴瘦', '速瘦', '急瘦', '狂瘦', '躺瘦',
    ],
    riskLevel: 'high',
    description: '涉及体重管理、脂肪燃烧、身材塑形等产品',
  },
  male_enhancement: {
    name: '男性增强类',
    keywords: [
      '壮阳', '补肾', '强肾', '助勃', '增大', '增粗', '增长',
      '延时', '持久', '勃起', '阳痿', '早泄', '肾虚',
      '玛卡', '淫羊藿', '锁阳', '肉苁蓉', '鹿茸', '鞭',
      '性功能', '性能力', '性欲', '阳具', '阴茎',
      '持久', '延时喷剂', '延时环', '增大膏',
      '补肾壮阳', '强肾健体', '金枪不倒',
    ],
    riskLevel: 'critical',
    description: '涉及男性性功能增强、补肾壮阳等产品',
  },
  breast_enhancement: {
    name: '丰胸美胸类',
    keywords: [
      '丰胸', '美胸', '隆胸', '增大', '挺拔', '丰满',
      '丰胸霜', '丰胸膏', '丰胸精油', '丰胸贴', '丰胸仪',
      '胸小', '平胸', '太平公主', '飞机场',
      '胸部下垂', '胸部松弛', '胸部外扩',
      '木瓜丰胸', '葛根丰胸', '胶原蛋白丰胸',
      '按摩丰胸', '针灸丰胸', '假体丰胸',
    ],
    riskLevel: 'high',
    description: '涉及胸部增大、塑形等产品',
  },
  height_increase: {
    name: '增高类',
    keywords: [
      '增高', '长高', '助长', '增高鞋', '增高垫', '增高药',
      '增高器', '增高仪', '增高贴', '增高霜',
      '个子矮', '矮个子', '矮小', '矮胖', '小个子',
      '拉伸增高', '断骨增高', '骨龄检测', '生长激素',
      '骨骺线', '骨骺闭合', '二次长高', '成年人长高',
      '儿童增高', '青少年增高', '学生增高',
    ],
    riskLevel: 'high',
    description: '涉及身高增长、骨骼拉伸等产品',
  },
  medical_beauty: {
    name: '医疗美容类',
    keywords: [
      '医美', '医疗美容', '整形', '整容', '微整', '微创',
      '隆鼻', '双眼皮', '开眼角', '祛眼袋', '切眉',
      '瘦脸针', '除皱针', '玻尿酸', '肉毒素', '水光针',
      '热玛吉', '超声刀', '皮秒', '光子嫩肤',
      '祛斑', '美白', '淡斑', '祛痣', '祛疣',
      '祛痘', '祛疤', '祛妊娠纹', '紧致', '抗衰',
      '拉皮', '线雕', '脂肪填充', '自体脂肪',
      '医疗级', '医院级', '临床验证',
    ],
    riskLevel: 'critical',
    description: '涉及医疗美容、整形手术、注射类产品',
  },
};

/**
 * 绝对违禁词配置（广告法明令禁止）
 */
export const PROHIBITED_WORDS_ABSOLUTE = [
  // "一"字系列
  { word: '第一', suggestion: '领先' },
  { word: '中国第一', suggestion: '国内知名' },
  { word: '全网第一', suggestion: '广受好评' },
  { word: '销量第一', suggestion: '热销' },
  { word: '排名第一', suggestion: '排名靠前' },
  { word: '唯一', suggestion: '独特' },
  { word: '独一无二', suggestion: '独特' },
  { word: '唯一选择', suggestion: '优质选择' },
  { word: '唯一品牌', suggestion: '知名品牌' },
  { word: '唯一产品', suggestion: '特色产品' },
  
  // "最"字系列
  { word: '最好', suggestion: '优质' },
  { word: '最佳', suggestion: '优秀' },
  { word: '最优', suggestion: '优质' },
  { word: '最新', suggestion: '新款' },
  { word: '最强', suggestion: '实力强劲' },
  { word: '最先进', suggestion: '先进' },
  { word: '最高', suggestion: '顶尖' },
  { word: '最低', suggestion: '较低' },
  { word: '最大', suggestion: '大型' },
  { word: '最小', suggestion: '小型' },
  { word: '最好用', suggestion: '好用' },
  { word: '最便宜', suggestion: '实惠' },
  { word: '最有效', suggestion: '效果好' },
  { word: '最安全', suggestion: '安全' },
  { word: '最快速', suggestion: '快速' },
  { word: '史上最强', suggestion: '实力强劲' },
  { word: '全网最', suggestion: '广受好评' },
  { word: '中国最', suggestion: '国内知名' },
  
  // 级别系列
  { word: '国家级', suggestion: '专业级' },
  { word: '世界级', suggestion: '国际水准' },
  { word: '顶级', suggestion: '高端' },
  { word: '极品', suggestion: '精品' },
  { word: '至尊', suggestion: '尊享' },
  { word: '巅峰', suggestion: '优秀' },
  { word: '极致', suggestion: '出色' },
  { word: '终极', suggestion: '高级' },
  { word: '首选', suggestion: '优选' },
  
  // NO.1系列
  { word: 'NO.1', suggestion: '领先' },
  { word: 'TOP.1', suggestion: '领先' },
  { word: 'No.1', suggestion: '领先' },
  { word: 'Top1', suggestion: '领先' },
  { word: 'top1', suggestion: '领先' },
  
  // 承诺系列
  { word: '永久', suggestion: '长期' },
  { word: '终身', suggestion: '长期' },
  { word: '一辈子', suggestion: '长期' },
  { word: '100%', suggestion: '大幅' },
  { word: '百分百', suggestion: '高比例' },
  { word: '零风险', suggestion: '低风险' },
  { word: '无风险', suggestion: '低风险' },
  { word: '包治', suggestion: '有效改善' },
  { word: '根治', suggestion: '有效改善' },
  { word: '必过', suggestion: '通过率高' },
  { word: '包过', suggestion: '通过率高' },
  { word: '保过', suggestion: '通过率高' },
  
  // 绝对化表达
  { word: '绝无仅有', suggestion: '罕见' },
  { word: '仅此一次', suggestion: '难得' },
  { word: '仅此一家', suggestion: '特色' },
  { word: '独家', suggestion: '特色' },
  { word: '首个', suggestion: '早期' },
  { word: '首创', suggestion: '创新' },
  { word: '独家专利', suggestion: '专利技术' },
];

/**
 * 医疗功效违禁词（普通产品禁止使用）
 */
export const PROHIBITED_WORDS_MEDICAL = [
  // 治疗相关
  { word: '治疗', suggestion: '改善' },
  { word: '治愈', suggestion: '有效改善' },
  { word: '疗效', suggestion: '效果' },
  { word: '药效', suggestion: '功效' },
  { word: '根治', suggestion: '有效改善' },
  { word: '药到病除', suggestion: '有效缓解' },
  { word: '对症下药', suggestion: '针对性改善' },
  
  // 医疗术语
  { word: '医疗', suggestion: '专业' },
  { word: '医用', suggestion: '专业级' },
  { word: '医学', suggestion: '科学' },
  { word: '临床', suggestion: '实验验证' },
  { word: '诊断', suggestion: '检测' },
  { word: '处方', suggestion: '建议' },
  { word: '药方', suggestion: '方案' },
  { word: '医师', suggestion: '专家' },
  { word: '医生', suggestion: '专业人士' },
  { word: '护士', suggestion: '护理人员' },
  
  // 疾病相关
  { word: '疾病', suggestion: '不适' },
  { word: '病症', suggestion: '问题' },
  { word: '病痛', suggestion: '不适' },
  { word: '消炎', suggestion: '舒缓' },
  { word: '杀菌', suggestion: '抑菌' },
  { word: '抗病毒', suggestion: '防护' },
  { word: '防癌', suggestion: '保健' },
  { word: '抗癌', suggestion: '保健' },
  
  // 治疗效果
  { word: '康复', suggestion: '恢复' },
  { word: '痊愈', suggestion: '改善' },
  { word: '止疼', suggestion: '舒缓' },
  { word: '止痛', suggestion: '舒缓' },
  { word: '镇痛', suggestion: '舒缓' },
  
  // 医疗行为
  { word: '手术', suggestion: '专业操作' },
  { word: '注射', suggestion: '使用' },
  { word: '针灸', suggestion: '按摩' },
  { word: '拔罐', suggestion: '理疗' },
];

/**
 * 减肥瘦身类违禁词
 */
export const PROHIBITED_WORDS_WEIGHT_LOSS = [
  // 减肥相关
  { word: '减肥', suggestion: '身材管理' },
  { word: '瘦身', suggestion: '塑形' },
  { word: '减脂', suggestion: '塑形' },
  { word: '燃脂', suggestion: '塑形' },
  { word: '甩脂', suggestion: '塑形' },
  { word: '溶脂', suggestion: '塑形' },
  { word: '吸脂', suggestion: '塑形' },
  { word: '掉秤', suggestion: '塑形' },
  { word: '减重', suggestion: '体重管理' },
  
  // 瘦身部位
  { word: '瘦脸', suggestion: '轮廓修饰' },
  { word: '瘦腿', suggestion: '腿部塑形' },
  { word: '瘦腰', suggestion: '腰部塑形' },
  { word: '瘦肚', suggestion: '腹部塑形' },
  { word: '瘦手臂', suggestion: '手臂塑形' },
  { word: '瘦大腿', suggestion: '大腿塑形' },
  { word: '瘦小腿', suggestion: '小腿塑形' },
  { word: '瘦下巴', suggestion: '下巴修饰' },
  
  // 效果承诺
  { word: '暴瘦', suggestion: '身材变好' },
  { word: '速瘦', suggestion: '塑形' },
  { word: '急瘦', suggestion: '塑形' },
  { word: '狂瘦', suggestion: '塑形' },
  { word: '躺瘦', suggestion: '轻松塑形' },
  { word: '躺着瘦', suggestion: '轻松塑形' },
  { word: '睡着瘦', suggestion: '轻松塑形' },
  
  // 时间承诺
  { word: '三天瘦', suggestion: '快速塑形' },
  { word: '一周瘦', suggestion: '快速塑形' },
  { word: '月瘦', suggestion: '塑形' },
  { word: '月瘦十斤', suggestion: '有效塑形' },
  { word: '月瘦二十斤', suggestion: '有效塑形' },
  
  // 脂肪相关
  { word: '燃烧脂肪', suggestion: '促进代谢' },
  { word: '分解脂肪', suggestion: '促进代谢' },
  { word: '消除脂肪', suggestion: '塑造线条' },
  { word: '溶解脂肪', suggestion: '塑造线条' },
  { word: '减少脂肪', suggestion: '塑造线条' },
  
  // 体重相关
  { word: '体重下降', suggestion: '体重管理' },
  { word: '体重减轻', suggestion: '体重管理' },
  { word: '减轻体重', suggestion: '体重管理' },
  { word: '降低体重', suggestion: '体重管理' },
];

/**
 * 丰胸美胸类违禁词
 */
export const PROHIBITED_WORDS_BREAST = [
  // 丰胸相关
  { word: '丰胸', suggestion: '美胸' },
  { word: '隆胸', suggestion: '美胸' },
  { word: '增大胸部', suggestion: '修饰胸型' },
  { word: '胸部增大', suggestion: '修饰胸型' },
  
  // 效果承诺
  { word: '丰满', suggestion: '挺拔' },
  { word: '挺拔', suggestion: '有型' },
  { word: '变大', suggestion: '有型' },
  { word: '升杯', suggestion: '塑形' },
  { word: '大胸', suggestion: '美胸' },
  
  // 负面描述
  { word: '胸小', suggestion: '胸型' },
  { word: '平胸', suggestion: '胸型' },
  { word: '飞机场', suggestion: '胸型' },
  { word: '太平公主', suggestion: '女士' },
  { word: '下垂', suggestion: '松弛' },
  { word: '外扩', suggestion: '胸型' },
  
  // 方法相关
  { word: '按摩丰胸', suggestion: '胸部护理' },
  { word: '针灸丰胸', suggestion: '胸部护理' },
  { word: '食疗丰胸', suggestion: '胸部护理' },
  { word: '木瓜丰胸', suggestion: '水果护理' },
];

/**
 * 增高类违禁词
 */
export const PROHIBITED_WORDS_HEIGHT = [
  // 增高相关
  { word: '增高', suggestion: '挺拔身姿' },
  { word: '长高', suggestion: '身体发育' },
  { word: '助长', suggestion: '营养补充' },
  { word: '二次长高', suggestion: '改善体态' },
  { word: '成年人长高', suggestion: '改善体态' },
  
  // 效果承诺
  { word: '长高5厘米', suggestion: '改善体态' },
  { word: '长高10厘米', suggestion: '改善体态' },
  { word: '增高5cm', suggestion: '改善体态' },
  { word: '增高10cm', suggestion: '改善体态' },
  
  // 负面描述
  { word: '个子矮', suggestion: '身高' },
  { word: '矮个子', suggestion: '身高' },
  { word: '矮小', suggestion: '身高' },
  { word: '矮胖', suggestion: '体型' },
  { word: '小个子', suggestion: '娇小' },
  { word: '矮子', suggestion: '身高' },
  
  // 方法相关
  { word: '拉伸增高', suggestion: '拉伸运动' },
  { word: '断骨增高', suggestion: '专业矫正' },
  { word: '骨骺线', suggestion: '骨骼发育' },
  { word: '生长激素', suggestion: '营养补充' },
];

/**
 * 医美祛斑类违禁词
 */
export const PROHIBITED_WORDS_BEAUTY = [
  // 祛斑相关
  { word: '祛斑', suggestion: '淡斑' },
  { word: '淡斑', suggestion: '改善色斑' },
  { word: '美白', suggestion: '提亮肤色' },
  { word: '增白', suggestion: '提亮' },
  { word: '瓷肌', suggestion: '肌肤光滑' },
  
  // 祛痘相关
  { word: '祛痘', suggestion: '改善痘痘' },
  { word: '除痘', suggestion: '改善痘痘' },
  { word: '去痘', suggestion: '改善痘痘' },
  { word: '消痘', suggestion: '改善痘痘' },
  { word: '祛痘印', suggestion: '改善痘印' },
  
  // 抗衰相关
  { word: '抗衰老', suggestion: '抗初老' },
  { word: '抗皱', suggestion: '淡化细纹' },
  { word: '去皱', suggestion: '淡化细纹' },
  { word: '除皱', suggestion: '淡化细纹' },
  { word: '祛皱', suggestion: '淡化细纹' },
  { word: '逆龄', suggestion: '年轻态' },
  
  // 医美相关
  { word: '医美', suggestion: '美容' },
  { word: '医疗美容', suggestion: '美容护理' },
  { word: '整形', suggestion: '美容' },
  { word: '整容', suggestion: '美容' },
  { word: '微整', suggestion: '美容' },
  
  // 医美项目
  { word: '隆鼻', suggestion: '鼻部修饰' },
  { word: '双眼皮', suggestion: '眼部修饰' },
  { word: '瘦脸针', suggestion: '面部修饰' },
  { word: '除皱针', suggestion: '面部护理' },
  { word: '玻尿酸', suggestion: '保湿成分' },
  { word: '肉毒素', suggestion: '美容成分' },
  { word: '水光针', suggestion: '保湿护理' },
  { word: '热玛吉', suggestion: '美容护理' },
  { word: '超声刀', suggestion: '美容护理' },
  { word: '皮秒', suggestion: '美容护理' },
  
  // 效果承诺
  { word: '换肤', suggestion: '改善肤质' },
  { word: '嫩肤', suggestion: '肌肤光滑' },
  { word: '焕肤', suggestion: '改善肤质' },
  { word: '永久脱毛', suggestion: '脱毛' },
  { word: '根除', suggestion: '有效改善' },
];

/**
 * 男性增强类违禁词
 */
export const PROHIBITED_WORDS_MALE = [
  // 壮阳相关
  { word: '壮阳', suggestion: '滋补' },
  { word: '补肾', suggestion: '滋补' },
  { word: '强肾', suggestion: '滋补' },
  { word: '助勃', suggestion: '保健' },
  { word: '增大', suggestion: '保健' },
  { word: '增粗', suggestion: '保健' },
  { word: '增长', suggestion: '保健' },
  
  // 效果承诺
  { word: '延时', suggestion: '保健' },
  { word: '持久', suggestion: '保健' },
  { word: '金枪不倒', suggestion: '保健' },
  { word: '久战不泄', suggestion: '保健' },
  
  // 疾病相关
  { word: '阳痿', suggestion: '亚健康' },
  { word: '早泄', suggestion: '亚健康' },
  { word: '肾虚', suggestion: '亚健康' },
  { word: '性功能', suggestion: '健康' },
  { word: '性能力', suggestion: '健康' },
  
  // 成分相关
  { word: '玛卡', suggestion: '滋补成分' },
  { word: '淫羊藿', suggestion: '滋补成分' },
  { word: '锁阳', suggestion: '滋补成分' },
  { word: '肉苁蓉', suggestion: '滋补成分' },
  { word: '鹿茸', suggestion: '滋补成分' },
];

/**
 * 保健品滋补类违禁词（重点规避医疗功效宣传）
 */
export const PROHIBITED_WORDS_HEALTH_SUPPLEMENT = [
  // 🔴 中医诊断术语（绝对禁止）
  { word: '气血不足', suggestion: '身体状态不佳' },
  { word: '气血两亏', suggestion: '身体状态不佳' },
  { word: '气虚', suggestion: '疲劳' },
  { word: '血虚', suggestion: '面色不佳' },
  { word: '阴虚', suggestion: '体质偏热' },
  { word: '阳虚', suggestion: '体质偏寒' },
  { word: '肾虚', suggestion: '亚健康' },
  { word: '脾虚', suggestion: '消化功能弱' },
  { word: '肺虚', suggestion: '呼吸系统敏感' },
  { word: '肝虚', suggestion: '亚健康' },
  { word: '心虚', suggestion: '亚健康' },
  { word: '虚不受补', suggestion: '敏感体质' },
  { word: '阴阳两虚', suggestion: '体质虚弱' },
  { word: '气血差', suggestion: '精神状态不佳' },
  { word: '气血虚', suggestion: '身体虚弱' },
  
  // 🔴 医疗指标承诺（绝对禁止）
  { word: '指标提升', suggestion: '状态改善' },
  { word: '指标改善', suggestion: '状态改善' },
  { word: '气血指标', suggestion: '身体状态' },
  { word: '体测指标', suggestion: '身体数据' },
  { word: '血液指标', suggestion: '健康数据' },
  { word: '血液循环指标', suggestion: '循环状态' },
  { word: '血糖指标', suggestion: '血糖数据' },
  { word: '血压指标', suggestion: '血压数据' },
  { word: '血脂指标', suggestion: '血脂数据' },
  { word: '免疫指标', suggestion: '免疫状态' },
  { word: '肝功能指标', suggestion: '肝脏状态' },
  { word: '肾功能指标', suggestion: '肾脏状态' },
  
  // 🔴 效果承诺（禁止）
  { word: '从根源解决', suggestion: '有助于改善' },
  { word: '根源解决', suggestion: '深层调理' },
  { word: '彻底解决', suggestion: '有效改善' },
  { word: '再也不用怕', suggestion: '减少担忧' },
  { word: '再也不怕', suggestion: '减少担忧' },
  { word: '根治', suggestion: '有效改善' },
  { word: '断根', suggestion: '改善' },
  { word: '永不再犯', suggestion: '减少复发' },
  { word: '永不复发', suggestion: '减少复发' },
  
  // 🔴 数据背书（需要资质，禁止随意使用）
  { word: '提升了21%', suggestion: '有明显改善' },
  { word: '提升了', suggestion: '改善了' },
  { word: '提高了', suggestion: '改善了' },
  { word: '改善了', suggestion: '有助于' },
  { word: '87%的人', suggestion: '许多用户' },
  { word: '%的人说', suggestion: '用户反馈' },
  { word: '%的用户', suggestion: '众多用户' },
  { word: '上千条反馈', suggestion: '众多反馈' },
  { word: '上万条反馈', suggestion: '大量反馈' },
  { word: '临床验证', suggestion: '实验测试' },
  { word: '临床试验', suggestion: '产品测试' },
  { word: '实验证明', suggestion: '测试表明' },
  { word: '数据证明', suggestion: '反馈显示' },
  { word: '研究表明', suggestion: '资料显示' },
  
  // 🔴 功能性宣传（保健品禁止）
  { word: '辅助降血压', suggestion: '适合关注血压的人群' },
  { word: '辅助降血糖', suggestion: '适合关注血糖的人群' },
  { word: '辅助降血脂', suggestion: '适合关注血脂的人群' },
  { word: '调节免疫', suggestion: '营养补充' },
  { word: '增强免疫', suggestion: '营养支持' },
  { word: '提高免疫', suggestion: '营养补充' },
  { word: '改善睡眠', suggestion: '放松身心' },
  { word: '促进睡眠', suggestion: '放松身心' },
  { word: '安神', suggestion: '舒缓' },
  { word: '助眠', suggestion: '放松' },
  { word: '养颜', suggestion: '美容护理' },
  { word: '延缓衰老', suggestion: '保持年轻态' },
  { word: '延年益寿', suggestion: '健康生活' },
  { word: '益智健脑', suggestion: '营养补充' },
  { word: '补脑', suggestion: '营养补充' },
  { word: '健脑', suggestion: '营养支持' },
  
  // 🔴 症状描述（禁止）
  { word: '手脚冰凉', suggestion: '体温调节敏感' },
  { word: '手脚冰', suggestion: '体温敏感' },
  { word: '怕冷', suggestion: '体质偏寒' },
  { word: '畏寒', suggestion: '体质偏寒' },
  { word: '怕热', suggestion: '体质偏热' },
  { word: '潮热', suggestion: '体温波动' },
  { word: '盗汗', suggestion: '出汗' },
  { word: '自汗', suggestion: '出汗' },
  { word: '失眠多梦', suggestion: '睡眠质量不佳' },
  { word: '健忘', suggestion: '记忆力下降' },
  { word: '头晕', suggestion: '头部不适' },
  { word: '乏力', suggestion: '疲劳' },
  { word: '精神不振', suggestion: '精力不足' },
  { word: '腰膝酸软', suggestion: '腰部不适' },
  { word: '腰酸', suggestion: '腰部疲劳' },
  
  // 🔴 体质诊断（禁止）
  { word: '阳虚体质', suggestion: '偏寒体质' },
  { word: '阴虚体质', suggestion: '偏热体质' },
  { word: '气虚体质', suggestion: '虚弱体质' },
  { word: '痰湿体质', suggestion: '体质' },
  { word: '湿热体质', suggestion: '体质' },
  { word: '血瘀体质', suggestion: '体质' },
  { word: '气郁体质', suggestion: '体质' },
  { word: '特禀体质', suggestion: '敏感体质' },
  { word: '平和体质', suggestion: '健康体质' },
  
  // 🔴 滋补功效（谨慎表达）
  { word: '大补', suggestion: '滋补' },
  { word: '大补元气', suggestion: '滋补养生' },
  { word: '气血双补', suggestion: '滋补养生' },
  { word: '阴阳双补', suggestion: '滋补养生' },
  { word: '滋补强身', suggestion: '营养补充' },
  { word: '强身健体', suggestion: '健康生活' },
  { word: '固本培元', suggestion: '养生调理' },
  { word: '扶正固本', suggestion: '调理养生' },
  { word: '调理身体', suggestion: '日常养生' },
  { word: '滋补调理', suggestion: '日常养护' },
];

/**
 * 隐性违禁词（特定语境下可能引起联想）
 */
export const PROHIBITED_WORDS_IMPLICIT = [
  // 敏感描述词
  { word: '立竿见影', suggestion: '效果明显' },
  { word: '快速见效', suggestion: '效果明显' },
  { word: '当场见效', suggestion: '即时感受' },
  { word: '立马见效', suggestion: '即时感受' },
  { word: '瞬间见效', suggestion: '即时感受' },
  { word: '马上见效', suggestion: '即时感受' },
  { word: '一用就', suggestion: '使用后' },
  { word: '一擦就', suggestion: '使用后' },
  { word: '一抹就', suggestion: '使用后' },
  
  // 夸大效果
  { word: '神效', suggestion: '效果好' },
  { word: '奇效', suggestion: '效果好' },
  { word: '特效', suggestion: '效果好' },
  { word: '神药', suggestion: '产品' },
  { word: '灵丹妙药', suggestion: '好产品' },
  { word: '包治百病', suggestion: '有效改善' },
  { word: '万能', suggestion: '多功能' },
  
  // 惊悚用语
  { word: '震惊', suggestion: '令人关注' },
  { word: '吓哭', suggestion: '令人惊讶' },
  { word: '吓死', suggestion: '令人惊讶' },
  { word: '不敢相信', suggestion: '令人惊喜' },
  { word: '疯抢', suggestion: '热销' },
  { word: '抢疯了', suggestion: '热销' },
  { word: '卖疯了', suggestion: '热销' },
  
  // 贬低用语
  { word: '丑女', suggestion: '女士' },
  { word: '矮穷挫', suggestion: '普通人' },
  { word: '矮矬穷', suggestion: '普通人' },
  { word: '胖妞', suggestion: '女士' },
  { word: '肥婆', suggestion: '女士' },
  { word: '黄脸婆', suggestion: '女士' },
  { word: '大妈', suggestion: '女士' },
  
  // 容貌焦虑
  { word: '显老', suggestion: '成熟' },
  { word: '显丑', suggestion: '形象' },
  { word: '变丑', suggestion: '形象变化' },
  { word: '变老', suggestion: '年龄增长' },
  { word: '衰老', suggestion: '年龄增长' },
  { word: '皱纹', suggestion: '细纹' },
  { word: '色斑', suggestion: '肤色不均' },
];

/**
 * 风险词汇（可能被拒审）
 */
export const PROHIBITED_WORDS_RISKY = [
  { word: '最低价', suggestion: '超值价格' },
  { word: '最便宜', suggestion: '高性价比' },
  { word: '史无前例', suggestion: '难得一见' },
  { word: '空前绝后', suggestion: '独特' },
  { word: '革命性', suggestion: '创新性' },
  { word: '颠覆性', suggestion: '突破性' },
  { word: '神器', suggestion: '好物' },
  { word: '必备', suggestion: '推荐' },
  { word: '必买', suggestion: '推荐购买' },
  { word: '必入', suggestion: '推荐' },
  { word: '必囤', suggestion: '推荐囤货' },
  { word: '闭眼入', suggestion: '放心购买' },
  { word: '闭眼冲', suggestion: '放心购买' },
];

/**
 * 行业违禁词配置
 */
export const PROHIBITED_WORDS_INDUSTRY = {
  // 美妆类目
  cosmetic: [
    ...PROHIBITED_WORDS_BEAUTY,
    ...PROHIBITED_WORDS_BREAST,
  ],
  // 食品类目（包含保健品）
  food: [
    ...PROHIBITED_WORDS_MEDICAL,
    ...PROHIBITED_WORDS_WEIGHT_LOSS,
    ...PROHIBITED_WORDS_HEALTH_SUPPLEMENT, // 添加保健品违禁词
  ],
  // 金融类目
  finance: [
    { word: '保本', suggestion: '稳健' },
    { word: '保收益', suggestion: '收益可观' },
    { word: '稳赚', suggestion: '收益稳定' },
    { word: '包赚', suggestion: '收益可观' },
    { word: '高收益', suggestion: '收益可观' },
    { word: '躺赚', suggestion: '轻松获利' },
    { word: '暴利', suggestion: '收益可观' },
    { word: '翻倍', suggestion: '增值' },
    { word: '翻番', suggestion: '增值' },
  ],
  // 教育类目
  education: [
    { word: '包过', suggestion: '通过率高' },
    { word: '必过', suggestion: '通过率高' },
    { word: '百分百', suggestion: '高比例' },
    { word: '速成', suggestion: '快速学习' },
    { word: '保过', suggestion: '高通过率' },
    { word: '保录', suggestion: '录取率高' },
    { word: '包录', suggestion: '录取率高' },
    { word: '押题', suggestion: '重点题型' },
    { word: '押中', suggestion: '覆盖考点' },
  ],
  // 医疗健康
  health: [
    ...PROHIBITED_WORDS_MEDICAL,
    ...PROHIBITED_WORDS_MALE,
    ...PROHIBITED_WORDS_HEALTH_SUPPLEMENT,
  ],
  // 其他
  other: [],
};

/**
 * 产品类目类型
 */
export type ProductCategory = 'cosmetic' | 'food' | 'finance' | 'education' | 'health' | 'other';

/**
 * 黑五类产品检测结果
 */
export interface BlackFiveDetectionResult {
  isBlackFive: boolean;
  types: BlackFiveType[];
  warnings: string[];
  riskLevel: 'none' | 'high' | 'critical';
}

/**
 * 检测产品是否属于黑五类
 * @param productName 产品名称
 * @param sellingPoints 核心卖点
 * @param productCategory 产品类目
 * @returns 黑五类检测结果
 */
export function detectBlackFiveProduct(
  productName: string,
  sellingPoints: string[],
  productCategory?: ProductCategory
): BlackFiveDetectionResult {
  const combinedText = `${productName} ${sellingPoints.join(' ')}`.toLowerCase();
  const detectedTypes: BlackFiveType[] = [];
  const warnings: string[] = [];
  
  // 检测各类黑五类产品
  for (const [type, config] of Object.entries(BLACK_FIVE_PRODUCTS)) {
    const matchedKeywords = config.keywords.filter(keyword => 
      combinedText.includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      detectedTypes.push(type as BlackFiveType);
      warnings.push(
        `检测到${config.name}相关关键词：${matchedKeywords.slice(0, 3).join('、')}${matchedKeywords.length > 3 ? '等' : ''}`
      );
    }
  }
  
  const isBlackFive = detectedTypes.length > 0;
  let riskLevel: 'none' | 'high' | 'critical' = 'none';
  
  if (isBlackFive) {
    const hasCritical = detectedTypes.some(
      type => BLACK_FIVE_PRODUCTS[type].riskLevel === 'critical'
    );
    riskLevel = hasCritical ? 'critical' : 'high';
  }
  
  return {
    isBlackFive,
    types: detectedTypes,
    warnings,
    riskLevel,
  };
}

/**
 * 生成合规约束提示词
 * @param blackFiveTypes 检测到的黑五类类型
 * @returns 合规约束提示词
 */
export function generateCompliancePrompt(blackFiveTypes: BlackFiveType[]): string {
  if (blackFiveTypes.length === 0) {
    return `
【合规创作要求】
1. 禁止使用绝对化用语（第一、最好、唯一、顶级等）
2. 禁止涉及医疗功效描述（治疗、治愈、疗效等）
3. 禁止承诺具体效果时间（X天见效、立竿见影等）
4. 内容需真实可信，避免夸大宣传
`;
  }
  
  const typeNames = blackFiveTypes.map(type => BLACK_FIVE_PRODUCTS[type].name);
  
  let specificConstraints = '';
  
  // 减肥瘦身类约束
  if (blackFiveTypes.includes('weight_loss')) {
    specificConstraints += `
【减肥塑形类特别约束】
⚠️ 该产品属于体重管理类，必须遵循以下规则：
1. 禁止承诺减重效果（不能说"瘦X斤"、"X天见效"）
2. 禁止使用"减肥"、"燃脂"、"甩脂"等词汇
3. 替代表达：用"塑形"、"身材管理"、"修饰线条"、"改善体态"
4. 侧重描述：产品舒适度、材质、设计、使用体验
5. 禁止制造身材焦虑（不能说"太胖了"、"丑"等）
`;
  }
  
  // 男性增强类约束
  if (blackFiveTypes.includes('male_enhancement')) {
    specificConstraints += `
【滋补保健类特别约束】
⚠️ 该产品属于滋补保健类，必须遵循以下规则：
1. 禁止涉及性功能描述和效果承诺
2. 禁止使用"壮阳"、"延时"、"增大"等词汇
3. 替代表达：用"滋补"、"调理"、"养护"、"健康生活"
4. 侧重描述：产品成分（用通用名）、使用方式、日常保健价值
5. 禁止低俗暗示和性暗示表达
`;
  }
  
  // 丰胸类约束
  if (blackFiveTypes.includes('breast_enhancement')) {
    specificConstraints += `
【美胸塑形类特别约束】
⚠️ 该产品属于胸部护理类，必须遵循以下规则：
1. 禁止承诺丰胸效果（不能说"升杯"、"变大"）
2. 禁止使用"丰胸"、"隆胸"等词汇
3. 替代表达：用"美胸"、"胸部护理"、"修饰胸型"
4. 侧重描述：产品舒适度、成分温和、护理体验
5. 禁止负面描述胸部形态
`;
  }
  
  // 增高类约束
  if (blackFiveTypes.includes('height_increase')) {
    specificConstraints += `
【体态改善类特别约束】
⚠️ 该产品属于体态改善类，必须遵循以下规则：
1. 禁止承诺增高效果（不能说"长高X厘米"）
2. 禁止使用"增高"、"长高"等词汇
3. 替代表达：用"挺拔身姿"、"改善体态"、"修饰身形"
4. 侧重描述：产品舒适度、设计科学、使用体验
5. 禁止制造身高焦虑
`;
  }
  
  // 医美类约束
  if (blackFiveTypes.includes('medical_beauty')) {
    specificConstraints += `
【美容护理类特别约束】
⚠️ 该产品属于美容护理类，必须遵循以下规则：
1. 禁止使用医疗术语（治疗、整形、注射等）
2. 禁止承诺具体功效（不能说"祛斑"、"美白"、"祛痘"）
3. 替代表达：用"淡斑"、"提亮"、"改善"、"修饰"
4. 侧重描述：产品成分、使用体验、日常护理价值
5. 禁止涉及医美项目和手术描述
`;
  }
  
  // 🔴 保健品滋补类约束（新增）
  if (blackFiveTypes.includes('health_supplement')) {
    specificConstraints += `
【保健品滋补类特别约束】⚠️ 重点合规要求
═══════════════════════════════════════════════════════════════
该产品属于滋补保健类，必须严格遵循以下规则：

【🚫 绝对禁止】
1. 禁止使用中医诊断术语：
   ❌ 气虚、血虚、阴虚、阳虚、肾虚、脾虚
   ❌ 气血不足、气血两亏、虚不受补、阴阳两虚
   
2. 禁止承诺医疗指标变化：
   ❌ "指标提升了X%"、"体测指标改善"
   ❌ "血液循环指标"、"免疫指标提升"
   
3. 禁止数据背书（无资质证明）：
   ❌ "87%的人说"、"临床验证"、"实验证明"
   ❌ "上千条用户反馈证明效果"
   
4. 禁止功能性宣传：
   ❌ "辅助降血压/降血糖/降血脂"
   ❌ "增强免疫力"、"改善睡眠"
   
5. 禁止效果承诺：
   ❌ "从根源解决"、"彻底解决"、"再也不用怕"
   ❌ "根治"、"断根"、"永不复发"

【✅ 合规替代表达】
- "气虚/血虚" → "疲劳"、"精神状态不佳"
- "阴虚/阳虚" → "体质偏热/偏寒"
- "气血不足" → "身体状态不佳"
- "手脚冰凉" → "体温调节敏感"
- "指标提升" → "状态改善"
- "87%的人说" → "许多用户反馈"
- "从根源解决" → "有助于改善"
- "滋补强身" → "营养补充"、"日常养护"

【📝 创作重点】
1. 侧重产品成分介绍（原料产地、工艺特点）
2. 强调使用场景和便捷性
3. 描述口感和饮用体验
4. 突出品质保障和品牌背书
5. 用"日常养生"、"营养补充"、"生活品质"等中性表达

【💡 合规示例】
❌ 错误："喝了2个月，气血指标提升了21%，再也不用怕虚不受补"
✅ 正确："坚持饮用一段时间，配合健康的生活方式，让日常状态更加舒适。精选道地原料，温和不刺激，适合日常养生饮用。"

═══════════════════════════════════════════════════════════════
`;
  }
  
  return `
═══════════════════════════════════════════════════════════════
【⚠️ 重要：合规创作约束】
检测到产品涉及：${typeNames.join('、')}
═══════════════════════════════════════════════════════════════

【通用合规要求】
1. 🚫 绝对禁止使用医疗术语：治疗、治愈、疗效、药物、处方、诊断
2. 🚫 绝对禁止使用绝对化用语：第一、最好、唯一、顶级、100%
3. 🚫 绝对禁止承诺具体效果：X天见效、立竿见影、瞬间变化
4. 🚫 绝对禁止制造焦虑：不能说用户"丑"、"老"、"胖"、"矮"
5. ✅ 使用合规表达：改善、修饰、护理、调理、养护、保养
${specificConstraints}
【合规创作示例】
❌ 错误："使用一周瘦了5斤，效果立竿见影"
✅ 正确："坚持使用一段时间，搭配合理饮食，帮助塑造更优美的身体线条"

❌ 错误："7天祛斑，皮肤白得像剥壳鸡蛋"
✅ 正确："温和护理肌肤，帮助改善肤色不均，让肌肤看起来更加透亮"

═══════════════════════════════════════════════════════════════
`;
}

/**
 * 检测文本中的违禁词
 * @param content 要检测的内容
 * @param category 产品类目（可选，用于检测行业违禁词）
 * @param blackFiveTypes 黑五类类型（可选，用于检测相关违禁词）
 * @returns 违禁词检测结果数组
 */
export function checkProhibitedWords(
  content: string,
  category?: ProductCategory,
  blackFiveTypes?: BlackFiveType[]
): ProhibitedWordResult[] {
  const results: ProhibitedWordResult[] = [];

  // 检测绝对违禁词
  PROHIBITED_WORDS_ABSOLUTE.forEach((item) => {
    let startIndex = 0;
    while (true) {
      const index = content.indexOf(item.word, startIndex);
      if (index === -1) break;
      results.push({
        word: item.word,
        level: 'absolute',
        position: [index, index + item.word.length],
        suggestion: item.suggestion,
      });
      startIndex = index + item.word.length;
    }
  });

  // 检测医疗功效违禁词
  PROHIBITED_WORDS_MEDICAL.forEach((item) => {
    let startIndex = 0;
    while (true) {
      const index = content.indexOf(item.word, startIndex);
      if (index === -1) break;
      results.push({
        word: item.word,
        level: 'critical',
        position: [index, index + item.word.length],
        suggestion: item.suggestion,
        category: 'medical',
      });
      startIndex = index + item.word.length;
    }
  });

  // 检测黑五类相关违禁词
  if (blackFiveTypes) {
    if (blackFiveTypes.includes('weight_loss')) {
      PROHIBITED_WORDS_WEIGHT_LOSS.forEach((item) => {
        let startIndex = 0;
        while (true) {
          const index = content.indexOf(item.word, startIndex);
          if (index === -1) break;
          results.push({
            word: item.word,
            level: 'critical',
            position: [index, index + item.word.length],
            suggestion: item.suggestion,
            category: 'weight_loss',
          });
          startIndex = index + item.word.length;
        }
      });
    }
    
    if (blackFiveTypes.includes('breast_enhancement')) {
      PROHIBITED_WORDS_BREAST.forEach((item) => {
        let startIndex = 0;
        while (true) {
          const index = content.indexOf(item.word, startIndex);
          if (index === -1) break;
          results.push({
            word: item.word,
            level: 'critical',
            position: [index, index + item.word.length],
            suggestion: item.suggestion,
            category: 'breast_enhancement',
          });
          startIndex = index + item.word.length;
        }
      });
    }
    
    if (blackFiveTypes.includes('height_increase')) {
      PROHIBITED_WORDS_HEIGHT.forEach((item) => {
        let startIndex = 0;
        while (true) {
          const index = content.indexOf(item.word, startIndex);
          if (index === -1) break;
          results.push({
            word: item.word,
            level: 'critical',
            position: [index, index + item.word.length],
            suggestion: item.suggestion,
            category: 'height_increase',
          });
          startIndex = index + item.word.length;
        }
      });
    }
    
    if (blackFiveTypes.includes('medical_beauty')) {
      PROHIBITED_WORDS_BEAUTY.forEach((item) => {
        let startIndex = 0;
        while (true) {
          const index = content.indexOf(item.word, startIndex);
          if (index === -1) break;
          results.push({
            word: item.word,
            level: 'critical',
            position: [index, index + item.word.length],
            suggestion: item.suggestion,
            category: 'medical_beauty',
          });
          startIndex = index + item.word.length;
        }
      });
    }
    
    if (blackFiveTypes.includes('male_enhancement')) {
      PROHIBITED_WORDS_MALE.forEach((item) => {
        let startIndex = 0;
        while (true) {
          const index = content.indexOf(item.word, startIndex);
          if (index === -1) break;
          results.push({
            word: item.word,
            level: 'critical',
            position: [index, index + item.word.length],
            suggestion: item.suggestion,
            category: 'male_enhancement',
          });
          startIndex = index + item.word.length;
        }
      });
    }
    
    // 🔴 保健品滋补类违禁词检测
    if (blackFiveTypes.includes('health_supplement')) {
      PROHIBITED_WORDS_HEALTH_SUPPLEMENT.forEach((item) => {
        let startIndex = 0;
        while (true) {
          const index = content.indexOf(item.word, startIndex);
          if (index === -1) break;
          results.push({
            word: item.word,
            level: 'critical',
            position: [index, index + item.word.length],
            suggestion: item.suggestion,
            category: 'health_supplement',
          });
          startIndex = index + item.word.length;
        }
      });
    }
  }

  // 检测行业违禁词
  if (category && category !== 'other' && PROHIBITED_WORDS_INDUSTRY[category]) {
    PROHIBITED_WORDS_INDUSTRY[category].forEach((item) => {
      let startIndex = 0;
      while (true) {
        const index = content.indexOf(item.word, startIndex);
        if (index === -1) break;
        results.push({
          word: item.word,
          level: 'industry',
          position: [index, index + item.word.length],
          suggestion: item.suggestion,
          category,
        });
        startIndex = index + item.word.length;
      }
    });
  }

  // 检测隐性违禁词
  PROHIBITED_WORDS_IMPLICIT.forEach((item) => {
    let startIndex = 0;
    while (true) {
      const index = content.indexOf(item.word, startIndex);
      if (index === -1) break;
      results.push({
        word: item.word,
        level: 'industry',
        position: [index, index + item.word.length],
        suggestion: item.suggestion,
        category: 'implicit',
      });
      startIndex = index + item.word.length;
    }
  });

  // 检测风险词汇
  PROHIBITED_WORDS_RISKY.forEach((item) => {
    let startIndex = 0;
    while (true) {
      const index = content.indexOf(item.word, startIndex);
      if (index === -1) break;
      results.push({
        word: item.word,
        level: 'risky',
        position: [index, index + item.word.length],
        suggestion: item.suggestion,
      });
      startIndex = index + item.word.length;
    }
  });

  // 按位置排序并去重
  const uniqueResults = results.filter((result, index, self) =>
    index === self.findIndex(r => 
      r.word === result.word && 
      r.position[0] === result.position[0]
    )
  );
  
  uniqueResults.sort((a, b) => a.position[0] - b.position[0]);

  return uniqueResults;
}

/**
 * 替换内容中的违禁词
 * @param content 原始内容
 * @param results 违禁词检测结果
 * @returns 替换后的内容
 */
export function replaceProhibitedWords(
  content: string,
  results: ProhibitedWordResult[]
): string {
  if (results.length === 0) return content;

  // 从后往前替换，避免位置偏移
  const sortedResults = [...results].sort((a, b) => b.position[0] - a.position[0]);
  let newContent = content;

  sortedResults.forEach((result) => {
    if (result.suggestion) {
      newContent =
        newContent.slice(0, result.position[0]) +
        result.suggestion +
        newContent.slice(result.position[1]);
    }
  });

  return newContent;
}

/**
 * 获取违禁词等级的显示样式
 */
export function getProhibitedLevelStyle(level: ProhibitedLevel): {
  color: string;
  bgColor: string;
  label: string;
} {
  switch (level) {
    case 'critical':
      return {
        color: 'text-red-700',
        bgColor: 'bg-red-50 border-red-300',
        label: '严重违禁',
      };
    case 'absolute':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        label: '绝对违禁',
      };
    case 'industry':
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 border-amber-200',
        label: '行业违禁',
      };
    case 'risky':
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
        label: '风险词汇',
      };
  }
}
