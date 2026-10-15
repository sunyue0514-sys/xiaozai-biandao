import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { NextRequest } from 'next/server';
import { 
  KnowledgeClient, 
  Config, 
  HeaderUtils,
  KnowledgeDocument,
  DataSourceType,
  ChunkConfig
} from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserInfo, getSessionUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 课程内容数据
const COURSE_CONTENTS: { title: string; content: string; category: string; tags: string[] }[] = [
  {
    title: '短视频营销核心方法论',
    content: `
【课程核心体系】

一、粉丝经济体系
- 短视频营销的底层逻辑
- 如何建立粉丝信任关系
- 粉丝价值的商业转化路径
- 从粉丝到客户的转化策略

二、商业定位体系
- 平台4大变现方式详解
  1. 广告变现：品牌合作、软广植入
  2. 电商变现：直播带货、商品橱窗
  3. 知识付费：课程销售、咨询服务
  4. 私域引流：微信导流、社群运营
- 短视频平台能火的内容定位方法
- 账号策划与商业闭环设计

三、内容创作体系
- 爆款选题方法
  * 抓热点：蹭热度的正确姿势
  * 找痛点：用户最关心的问题
  * 挖爽点：能带来即时满足的内容
- 素材库搭建技巧
  * 建立选题库
  * 搭建素材库
  * 形成创作SOP
- 四大脚本类型
  1. 说观点脚本：最能引发共鸣认同、引发关注和讨论
  2. 晒过程脚本：秀手艺、展实力，最利于直接成交
  3. 教知识脚本：创作成本低，最能吸引精准粉丝
  4. 讲故事脚本：最能立人设、与粉丝建立信任

四、短视频制作技巧
- 口播置景：场景是打开流量突破口的第一把刀
- 构图运镜：会构图，懂运镜，解决拍摄老大难问题
- 剪辑进阶：单钩钓/写意镜技巧
- 表现力训练：让你拍视频更自然

五、运营投放策略
- 短视频平台算法机制深度解析
- 投放策略
- 让流量翻倍的投放技巧
- 直播间引流方法

【适合人群】
- 想涨粉但卡在500播放的小白
- 有产品不懂短视频引流的店主
- 想做知识付费却不会包装的博主
- 想靠直播带货突破流量瓶颈的团队
`,
    category: '短视频方法论',
    tags: ['短视频', '营销', '定位', '内容创作', '运营']
  },
  {
    title: '观点型脚本落地教学',
    content: `
【观点型脚本核心方法论】

一、什么是观点型脚本
- 最能引发共鸣认同的内容形式
- 最容易引发关注和讨论
- 适合打造个人IP影响力

二、观点型脚本的四大要素
1. 鲜明的观点立场
   - 不模棱两可，有明确态度
   - 能引发用户认同或反对
   - 与你的IP定位一致

2. 有力的论据支撑
   - 数据支撑
   - 案例佐证
   - 个人经历

3. 情感共鸣点
   - 击中用户痛点
   - 说出了用户想说的话
   - 引发情绪共振

4. 行动号召
   - 引导评论互动
   - 引发转发分享
   - 建立期待感

三、观点型脚本结构模板
【开头】抛出争议性观点，制造悬念
【中间】用2-3个论据支撑观点
【转折】加入个人故事或深度思考
【结尾】升华主题，引导互动

四、实战技巧
- 选题要贴近用户生活
- 观点要有独特角度
- 语言要接地气，避免说教
- 时长控制在30秒-1分钟
`,
    category: '脚本创作',
    tags: ['脚本', '观点型', '内容创作', 'IP打造']
  },
  {
    title: '晒过程脚本创作技巧',
    content: `
【晒过程脚本核心方法论】

一、晒过程脚本的价值
- 秀手艺、展实力
- 最利于直接成交
- 建立专业信任感

二、晒过程的四大内容方向
1. 工作流程展示
   - 完整的工作过程
   - 专业技能演示
   - 幕后花絮分享

2. 产品制作过程
   - 从0到1的创造过程
   - 精益求精的细节
   - 品质把控环节

3. 服务交付场景
   - 服务客户的真实场景
   - 问题解决过程
   - 客户反馈展示

4. 学习成长记录
   - 技能提升过程
   - 刻苦练习的日常
   - 突破瓶颈的时刻

三、晒过程十大技巧
1. 单钩钓技巧：用一个吸引点留住观众
2. 反差感设计：制造意外惊喜
3. 过程戏剧化：让平淡变有趣
4. 细节放大：展示专业之处
5. 节奏把控：快慢结合
6. 情绪渲染：加入情感元素
7. 悬念设置：引发好奇
8. 价值输出：让观众有收获
9. 人设强化：展现个人特质
10. 变现引导：自然植入产品

四、写意镜技巧
- 用镜头语言讲故事
- 特写与远景结合
- 创造视觉美感
- 音乐与画面配合
`,
    category: '脚本创作',
    tags: ['脚本', '晒过程', '变现', '拍摄技巧']
  },
  {
    title: '教知识脚本落地教学',
    content: `
【教知识脚本核心方法论】

一、教知识脚本的优势
- 创作成本低
- 最能吸引精准粉丝
- 建立专业权威形象

二、知识内容的选题方向
1. 行业干货
   - 专业技能分享
   - 行业经验总结
   - 避坑指南

2. 实用技巧
   - 生活小窍门
   - 工作效率提升
   - 问题解决方案

3. 认知升级
   - 思维模式
   - 新观点新方法
   - 颠覆常识

三、教知识脚本结构
【开场】抛出痛点或问题
【主体】给出解决方案（分步骤）
【案例】举例说明
【总结】提炼要点
【引导】关注获取更多

四、教知识内容的三个层次
1. What（是什么）
   - 清晰定义概念
   - 解释核心要点

2. Why（为什么）
   - 说明重要性
   - 建立认知

3. How（怎么做）
   - 给出具体方法
   - 可执行步骤

五、避免踩坑
- 不要讲得太深奥
- 不要一次性讲太多
- 不要缺少实操性
- 不要只讲理论不举例
`,
    category: '脚本创作',
    tags: ['脚本', '教知识', '干货', '内容创作']
  },
  {
    title: '讲故事脚本落地教学',
    content: `
【讲故事脚本核心方法论】

一、讲故事脚本的价值
- 最能立人设
- 与粉丝建立深层信任
- 打造情感连接

二、好故事的三大要素
1. 人物
   - 有鲜明特点
   - 能引发共鸣
   - 有成长弧光

2. 冲突
   - 面临的困境
   - 内心的挣扎
   - 外部的阻力

3. 转折
   - 关键的决定
   - 意外的转折
   - 破局的方法

三、讲故事脚本的类型
1. 创业故事
   - 从0到1的奋斗历程
   - 遇到的困难和突破
   - 关键决策时刻

2. 成长故事
   - 刻苦学习的经历
   - 突破瓶颈的过程
   - 蜕变的转折点

3. 客户故事
   - 帮助客户解决问题
   - 客户的成功案例
   - 感人的服务故事

4. 生活故事
   - 日常中的小确幸
   - 家庭生活的点滴
   - 旅行见闻

四、故事结构模板
【背景】交代人物和情境
【冲突】遇到的问题或挑战
【行动】如何应对和解决
【结果】最终的结局
【感悟】升华主题

五、讲故事的核心技巧
- 开头要抓人
- 细节要生动
- 情绪要真实
- 结尾有升华
- 自然带出人设
`,
    category: '脚本创作',
    tags: ['脚本', '讲故事', '人设', '内容创作']
  },
  {
    title: '短视频IP全链路方法论',
    content: `
【短视频IP全链路方法论】
定位→脚本→拍摄→变现→投放，完整闭环教学

一、短视频8大爆款元素定位
1. 人设定位
   - 差异化人格标签
   - 可记忆的特征
   - 真实感与专业度的平衡

2. 领域定位
   - 细分赛道选择
   - 竞争分析
   - 蓝海机会挖掘

3. 内容定位
   - 内容形式选择
   - 风格调性确定
   - 更新节奏规划

4. 用户定位
   - 目标用户画像
   - 用户需求分析
   - 粉丝运营策略

5. 变现定位
   - 商业模式设计
   - 产品服务规划
   - 转化路径设计

6. 视觉定位
   - 画面风格
   - 服装道具
   - 场景布置

7. 语言定位
   - 口头禅设计
   - 语言风格
   - 表达习惯

8. 情感定位
   - 情绪价值提供
   - 共鸣点设计
   - 信任建立

二、脚本落地教学
- 观点型脚本实操
- 知识型脚本实操
- 案例拆解分析

三、高变现型脚本创作
- 带货脚本结构
- 转化文案技巧
- 成交话术设计

四、自然表现力的拍摄剪辑
- 镜头表现力训练
- 剪辑节奏把控
- 视觉效果提升

五、短视频投放策略
- 投放技巧
- 投放数据分析
- ROI优化方法
`,
    category: 'IP定位',
    tags: ['短视频', 'IP', '流量', '变现', '投放']
  },
  {
    title: '短视频流量变现方法论',
    content: `
【短视频流量变现核心课程】

一、短视频平台的核心逻辑
- 流量分发机制
- 算法推荐原理
- 账号权重提升

二、个人IP孵化
- 人设打造的底层逻辑
- 如何做一个好IP
- IP变现路径设计

三、账号定位方法论
- 如何找到自己的定位
- 垂直领域深耕策略
- 差异化竞争方法

四、爆款文案创作
- 短视频爆款文案类型
- 文案结构与架构
- 高转化文案技巧

五、短视频拍摄技巧
- 手机拍摄入门
- 构图与运镜
- 光线与场景

六、起号方法论
- 新账号冷启动
- 养号技巧
- 突破播放瓶颈

七、粉丝运营
- 如何打造核心粉丝
- 互动与维护技巧
- 私域引流方法

八、商业模式设计
- 生意的四个象限
- 变现路径选择
- 团队搭建与管理

九、商业思维
- 风口识别与抓住
- 赛道选择逻辑
- 复制业态的方法
- 团队管理心法

十、实操案例分享
- 餐饮行业短视频玩法
- 医美行业变现案例
- 实体店短视频破局
- 私域项目起盘流程

【核心金句】
- "创业最快速的方式是什么？借鉴并超越"
- "聪明的人越简单，永远向有结果的人学习"
- "结果不会骗人"
- "在正确的赛道里，都赚钱"
`,
    category: '流量变现',
    tags: ['短视频', '流量变现', 'IP孵化', '商业思维']
  },
  {
    title: '私域运营与变现',
    content: `
【私域运营核心方法论】

一、私域的价值认知
- 为什么私域越来越重要
- 公域与私域的关系
- 私域变现的底层逻辑

二、私域特点与优势
1. 低成本触达
2. 高转化率
3. 可持续复购
4. 用户资产沉淀

三、私域IP人设打造
- 人设定位方法
- 朋友圈人设塑造
- 微信账号形象设计

四、朋友圈营销策略
- 朋友圈内容规划
- 发布节奏与时间
- 互动技巧

五、私域团队搭建
- 团队架构设计
- 人员分工
- 管理与考核

六、销售技巧与管理
- 私域销售话术
- 成交技巧
- 销售团队管理

七、私域变现路径
1. 产品销售
2. 服务交付
3. 知识付费
4. 社群运营

八、私域4P理论应用
- Product（产品）：产品定位与设计
- Price（价格）：定价策略
- Place（渠道）：渠道建设
- Promotion（推广）：推广方法

九、私域5S理论
- Speed（速度）：响应速度
- Service（服务）：服务体验
- Standard（标准）：标准化流程
- System（系统）：系统化运营
- Scale（规模）：规模化复制

十、朋友圈营销4C法则
- Content（内容）：有价值的内容
- Consistency（一致性）：持续输出
- Connection（连接）：情感连接
- Conversion（转化）：自然转化
`,
    category: '私域运营',
    tags: ['私域', '运营', '变现', '朋友圈营销']
  },
  {
    title: '财商思维与创业智慧',
    content: `
【财商思维核心内容】

一、风口的重要性
- 如何识别风口
- 风口来了怎么抓住
- 风口过后的生存之道

二、选择赛道的方法
- 赛道分析的维度
- 蓝海与红海的判断
- 个人能力与赛道的匹配

三、行业利润分析
- 利润来源分析
- 成本结构优化
- 盈利模式创新

四、企业管理智慧
- 团队组建方法
- 人才选拔标准
- 激励机制设计

五、学习借鉴思维
- 向有结果的人学习
- 借鉴并超越
- 快速迭代升级

六、副业理论
- 副业选择标准
- 副业与主业的平衡
- 副业转主业时机

七、复制业态方法
- 成功模式复制
- 本地化改造
- 规模化扩张

八、企业家IP打造
- 企业家做IP的价值
- 个人IP与企业品牌
- CEO营销方法论

九、股权设计
- 合伙人股权分配
- 员工激励股权
- 股权退出机制

十、实战案例解析
- 成功创业案例分析
- 项目起盘流程
- 商业模式拆解

【核心思维】
- 创业最快速的方式：借鉴并超越
- 在正确的赛道里，都能赚钱
- 商业的本质是解决问题
- 团队是最大的杠杆
`,
    category: '商业思维',
    tags: ['财商', '创业', '思维', '商业']
  },
  {
    title: '短视频爆款拆片技巧',
    content: `
【短视频爆款拆片方法论】

一、为什么要拆片
- 学习优秀作品的底层逻辑
- 快速提升内容创作能力
- 找到爆款可复制的套路

二、拆片的三个层次
1. 表层拆解
   - 视频时长、封面、标题
   - 点赞、评论、转发数据
   - 发布时间、发布账号

2. 结构拆解
   - 开头设计（黄金3秒）
   - 内容结构（起承转合）
   - 结尾设计（引导互动）

3. 底层拆解
   - 用户心理分析
   - 情绪价值提供
   - 变现逻辑设计

三、拆片的五个维度
1. 选题分析
   - 选题来源
   - 选题热度
   - 选题持续性

2. 脚本分析
   - 文案结构
   - 关键金句
   - 情绪节点

3. 拍摄分析
   - 镜头运用
   - 场景设计
   - 人物表现

4. 剪辑分析
   - 节奏把控
   - 特效运用
   - 音乐选择

5. 运营分析
   - 发布策略
   - 互动引导
   - 数据优化

四、拆片实操步骤
第一步：选择对标账号
第二步：筛选爆款视频
第三步：逐帧分析内容
第四步：提炼成功要素
第五步：应用到自己的内容

五、拆片工具推荐
- 数据分析平台
- 视频下载工具
- 笔记整理工具

六、避坑指南
- 不要只拆不练
- 不要照搬照抄
- 要结合自己的定位
`,
    category: '综合方法论',
    tags: ['拆片', '爆款', '学习方法', '内容创作']
  }
];

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return new Response(
        JSON.stringify({ error: '未登录或登录已过期' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const operator = await getSessionUser(token);
    if (!operator || !(operator.role === 'admin' || operator.role === 'super_admin' || isSuperAdmin(operator.uid))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const rate = checkRateLimit('knowledge-import:' + userId, RATE_LIMITS.sensitive);
    if (!rate.allowed) return createRateLimitResponse(rate.resetTime);
    const customHeaders = {};
    const config = new Config();
    const knowledgeClient = new KnowledgeClient(config, customHeaders);

    const results: { title: string; success: boolean; id?: string; error?: string }[] = [];
    
    // 分块配置
    const chunkConfig: ChunkConfig = {
      separator: '\n\n',
      max_tokens: 2000,
      remove_extra_spaces: false
    };

    // 导入课程内容到知识库
    for (const course of COURSE_CONTENTS) {
      try {
        const documents: KnowledgeDocument[] = [
          {
            source: DataSourceType.TEXT,
            raw_data: `【${course.title}】\n\n分类：${course.category}\n标签：${course.tags.join('、')}\n\n${course.content}`
          }
        ];

        const response = await knowledgeClient.addDocuments(
          documents,
          'super_director_knowledge',
          chunkConfig
        );

        if (response.code === 0 && response.doc_ids && response.doc_ids.length > 0) {
          results.push({
            title: course.title,
            success: true,
            id: response.doc_ids[0]
          });
        } else {
          results.push({
            title: course.title,
            success: false,
            error: response.msg || '导入失败'
          });
        }
      } catch (error) {
        console.error(`Failed to import ${course.title}:`, error);
        results.push({
          title: course.title,
          success: false,
          error: error instanceof Error ? error.message : '导入失败'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `成功导入 ${successCount}/${COURSE_CONTENTS.length} 条知识`,
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Knowledge import error:', error);
    return new Response(
      JSON.stringify({ error: '知识库导入失败，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
