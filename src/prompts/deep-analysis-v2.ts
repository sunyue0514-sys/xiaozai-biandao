/**
 * 视频深度分析 V2 Prompt
 * 
 * 核心改进：
 * 1. 每个观点必须来自视频内容，标注原文证据和时间戳
 * 2. 方法论必须可直接复制使用（填空式模板 + 真实案例）
 * 3. 数据分析必须有对比和原因解释
 * 4. 风险分析必须指出具体敏感词
 * 5. 拒绝空话、套话、抽象形容词
 */

import type { TimestampedScript } from '@/types/analysis-report';

/**
 * 生成带时间戳的文案分析提示词
 */
export function generateDeepAnalysisPromptV2(params: {
  scriptContent: string;
  scriptWithTimestamps?: TimestampedScript;
  videoInfo: {
    title: string;
    author: string;
    likes: number;
    comments: number;
    shares: number;
    collects: number;
    views: number;
    estimatedViews?: boolean;
  };
  interactionRates: {
    collectRate: string;
    shareRate: string;
    commentRate: string;
    likeRate: string;
  };
}): string {
  const { scriptContent, scriptWithTimestamps, videoInfo, interactionRates } = params;
  
  // 构建带时间戳的文案展示
  let timestampedScriptDisplay = '';
  if (scriptWithTimestamps?.segments?.length) {
    timestampedScriptDisplay = `\n## 带时间戳的文案（用于引用证据）

${scriptWithTimestamps.segments.map(seg => 
  `[${formatTime(seg.startTime)}-${formatTime(seg.endTime)}] ${seg.text}`
).join('\n')}

**总时长**：${formatTime(scriptWithTimestamps.duration)}
`;
  }

  return `你是一位资深的爆款短视频分析师。你的任务是深度拆解视频，输出一份"本质归因"分析报告。

# 核心原则（CRITICAL）

1. **证据导向**：每个观点必须有原文支撑，标注时间戳
2. **拒绝空话**：禁止使用"内容丰富""表达清晰""实用性强"等抽象评价
3. **可操作性**：方法论必须是填空式模板，能直接套用
4. **具体化**：说"焦虑"不如说"担心错过机会"；说"实用"不如说"提供了可执行步骤"
5. **JSON格式**：输出必须是严格有效的JSON格式，不要有任何额外文字说明，不要使用代码块包裹
6. **禁止中文引号**：JSON字符串值内部禁止使用中文引号（""''），必须使用英文引号并转义（\\"）或使用其他标点

# 视频信息

- 标题：${videoInfo.title}
- 作者：${videoInfo.author}
- 点赞：${videoInfo.likes} | 评论：${videoInfo.comments} | 分享：${videoInfo.shares} | 收藏：${videoInfo.collects}
- 播放量：${videoInfo.views}${videoInfo.estimatedViews ? '（预估）' : ''}

# 互动率（已计算，直接使用）

| 指标 | 本视频 | 行业平均 |
|------|--------|----------|
| 点赞率 | ${interactionRates.likeRate}% | 5-8% |
| 收藏率 | ${interactionRates.collectRate}% | 15-20% |
| 分享率 | ${interactionRates.shareRate}% | 8-12% |
| 评论率 | ${interactionRates.commentRate}% | 5-10% |

# 口播文案

${scriptContent}
${timestampedScriptDisplay}

---

# 输出要求（JSON格式）

\`\`\`json
{
  "scriptType": {
    "id": "story|process|knowledge|opinion",
    "name": "讲故事|晒过程|教知识|说观点",
    "confidence": 0.0-1.0,
    "reason": "识别理由（引用原文证据）"
  },
  "coreEssence": {
    "coreEmotion": {
      "primaryEmotion": "具体情绪词（如：担心错过、渴望变好、不想被淘汰）",
      "secondaryEmotion": "具体情绪词",
      "triggerMechanism": [
        {
          "timestamp": "0-5s",
          "originalText": "原文引用",
          "explanation": "如何触发情绪"
        }
      ]
    },
    "coreDemand": {
      "demandType": "学习|娱乐|社交|身份认同|安全感",
      "demandLevel": "高|中|低",
      "demandAnalysis": {
        "targetPain": "目标用户的具体痛点（场景化描述）",
        "contentSolution": "视频提供的具体解决方案",
        "whyItWorks": "为什么有效（具体原因）"
      }
    },
    "timingAnalysis": {
      "trendBackground": "当前趋势背景（具体事件/现象）",
      "whyNow": "为什么现在能火（具体原因）"
    }
  },
  "dataAttribution": {
    "industryBenchmark": {
      "thisVideo": {
        "completionRate": "X%（如有数据）",
        "likeRate": "${interactionRates.likeRate}%",
        "commentRate": "${interactionRates.commentRate}%",
        "shareRate": "${interactionRates.shareRate}%",
        "collectRate": "${interactionRates.collectRate}%"
      },
      "industryAvg": {
        "completionRate": "30-40%",
        "likeRate": "5-8%",
        "commentRate": "5-10%",
        "shareRate": "8-12%",
        "collectRate": "15-20%"
      },
      "differenceAnalysis": "差异原因分析（对比具体数据，说明高低原因）"
    },
    "causalityChain": [
      {
        "contentElement": "内容元素（含时间戳，如'5-10s提出痛点'）",
        "effect": "产生效果",
        "dataImpact": "数据影响"
      }
    ],
    "algorithmLogic": {
      "recommendationTrigger": "推荐触发点（具体行为/数据）",
      "trafficStage": "流量阶段（冷启动/爆发/长尾）",
      "warningSignal": "预警信号（具体风险）"
    }
  },
  "userPortrait": {
    "targetAudience": {
      "ageRange": "具体年龄段",
      "occupation": "具体职业/身份",
      "painProfile": "痛点画像（场景化，如'每天加班到10点，想提升自己但没时间'）",
      "consumptionAbility": "消费能力评估"
    },
    "painPoints": [
      {
        "point": "痛点描述",
        "scenario": "具体场景"
      }
    ],
    "pleasurePoints": [
      {
        "point": "爽点描述",
        "videoEvidence": "视频证据（时间戳+原文）"
      }
    ],
    "userJourney": {
      "awareness": "认知阶段行为",
      "interest": "兴趣阶段行为",
      "desire": "欲望阶段行为",
      "action": "行动阶段行为",
      "conversion": "转化阶段行为"
    }
  },
  "contentStructure": {
    "hookAnalysis": {
      "hookType": "钩子类型（数字/痛点/悬念/反差/身份）",
      "originalText": "原文引用",
      "score": 1-10,
      "effect": "效果分析",
      "improvement": "改进建议"
    },
    "bodyAnalysis": {
      "structureType": "结构类型",
      "rhythm": "节奏控制",
      "videoEvidence": [
        {
          "timestamp": "时间戳",
          "content": "内容描述"
        }
      ],
      "score": 1-10,
      "improvement": "改进建议"
    },
    "endingAnalysis": {
      "endingType": "结尾类型",
      "originalText": "原文引用",
      "score": 1-10,
      "effect": "效果分析",
      "improvement": "改进建议"
    }
  },
  "copyableMethodology": {
    "topicFormula": {
      "template": "选题模板（填空式，如'[数字]个[领域]技巧，帮你[结果诱惑]'）",
      "examples": ["示例1（可直接使用）", "示例2（可直接使用）"],
      "keyElements": ["要素1", "要素2"]
    },
    "structureTemplate": {
      "segments": [
        {
          "timeRange": "时间范围",
          "stage": "阶段名称",
          "content": "内容模板"
        }
      ],
      "keyElements": ["要素1", "要素2"]
    },
    "checklist": ["□ 必备要素1", "□ 必备要素2", "□ 必备要素3"]
  },
  "riskWarning": {
    "contentRisks": [
      {
        "riskPoint": "风险点",
        "evidence": "证据（原文+时间戳）",
        "mitigation": "规避方式"
      }
    ],
    "copycatBoundaries": {
      "canCopy": ["可复制元素"],
      "cannotCopy": ["不可复制元素"],
      "adaptationTips": "适配修改建议"
    },
    "complianceWarning": {
      "sensitiveWords": ["敏感词1", "敏感词2"],
      "platformRisks": ["平台规则风险"]
    }
  },
  "monetizationAnalysis": {
    "monetizationPath": {
      "primaryPath": "主要变现路径",
      "conversionFunnel": "转化漏斗"
    },
    "conversionHooks": {
      "inVideoHooks": ["视频内转化点"],
      "problems": ["存在问题"],
      "optimizations": ["优化建议"]
    },
    "commercialPotential": {
      "potentialScore": 1-10,
      "suitableProducts": ["适合产品"],
      "estimatedConversionRate": "预估转化率及依据"
    }
  }
}
\`\`\`

# 注意事项

1. **互动率必须使用预计算值**：收藏率 ${interactionRates.collectRate}%、分享率 ${interactionRates.shareRate}%、评论率 ${interactionRates.commentRate}%、点赞率 ${interactionRates.likeRate}%
2. **时间戳格式**：使用 "X-Ys" 格式，如 "0-5s"、"15-20s"
3. **原文引用**：必须准确引用文案内容，不要编造
4. **敏感词检测**：仔细检查文案中是否包含敏感词、违规词
5. **数据对比**：必须说明数据高低的具体原因`;
}

/**
 * 格式化时间（秒转 mm:ss 格式）
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * V2 分析报告的默认值
 * @param videoInfo 视频信息
 * @param interactionRates 互动率
 * @param scriptWithTimestamps 已提取的文案（可选）
 */
export function getDefaultReportV2(videoInfo: {
  likes?: number;
  comments?: number;
  shares?: number;
  collects?: number;
  views?: number;
}, interactionRates: {
  collectRate: string;
  shareRate: string;
  commentRate: string;
  likeRate: string;
}, scriptWithTimestamps?: TimestampedScript) {
  const likes = videoInfo.likes || 0;
  const comments = videoInfo.comments || 0;
  const shares = videoInfo.shares || 0;
  const collects = videoInfo.collects || 0;
  const views = videoInfo.views || 0;
  
  // 如果有文案，提取第一句作为默认证据
  const firstSegment = scriptWithTimestamps?.segments?.[0];
  const defaultEvidence = firstSegment 
    ? `${Math.floor(firstSegment.startTime)}-${Math.floor(firstSegment.endTime)}s`
    : '0-5s';
  const defaultOriginalText = firstSegment?.text?.slice(0, 50) || '（分析数据生成中）';
  
  return {
    _version: "2.0" as const,
    
    videoInfo: {
      title: '',
      author: '',
      duration: scriptWithTimestamps?.duration || 0,
      platform: '',
      likes,
      comments,
      shares,
      collects,
      views,
    },
    
    scriptWithTimestamps,
    
    scriptType: {
      id: 'knowledge' as const,
      name: '教知识',
      confidence: 0.5,
      reason: '默认类型',
    },
    
    coreEssence: {
      coreEmotion: {
        primaryEmotion: '好奇心',
        secondaryEmotion: '获得感',
        triggerMechanism: [{
          timestamp: defaultEvidence,
          originalText: defaultOriginalText,
          explanation: '默认分析',
        }],
      },
      coreDemand: {
        demandType: '学习',
        demandLevel: '中' as const,
        demandAnalysis: {
          targetPain: '用户寻求有价值的信息',
          contentSolution: '提供信息内容',
          whyItWorks: '满足基础信息需求',
        },
      },
      timingAnalysis: {
        trendBackground: '内容符合当前用户关注点',
        whyNow: '该类型内容在平台有一定需求',
      },
    },
    
    dataAttribution: {
      industryBenchmark: {
        thisVideo: {
          likeRate: interactionRates.likeRate + '%',
          commentRate: interactionRates.commentRate + '%',
          shareRate: interactionRates.shareRate + '%',
          collectRate: interactionRates.collectRate + '%',
        },
        industryAvg: {
          likeRate: '5-8%',
          commentRate: '5-10%',
          shareRate: '8-12%',
          collectRate: '15-20%',
        },
        differenceAnalysis: '数据处于正常范围',
      },
      causalityChain: [{
        contentElement: '内容质量',
        effect: '用户获得价值',
        dataImpact: '影响互动率',
      }],
      algorithmLogic: {
        recommendationTrigger: '基于互动数据推荐',
        trafficStage: '正常流量池',
        warningSignal: '无明显风险',
      },
    },
    
    userPortrait: {
      targetAudience: {
        ageRange: '18-35岁',
        occupation: '内容消费者',
        painProfile: '寻求有价值的内容',
        consumptionAbility: '中等',
      },
      painPoints: [{
        point: '信息获取需求',
        scenario: '日常浏览场景',
      }],
      pleasurePoints: [{
        point: '获得有价值信息',
        videoEvidence: '（无时间戳）',
      }],
      userJourney: {
        awareness: '通过推荐发现',
        interest: '标题吸引点击',
        desire: '内容产生价值感',
        action: '可能的互动',
        conversion: '持续关注',
      },
    },
    
    contentStructure: {
      hookAnalysis: {
        hookType: '信息型',
        originalText: '（文案提取失败）',
        score: 6,
        effect: '基础吸引力',
        improvement: '可增强开头冲击力',
      },
      bodyAnalysis: {
        structureType: '信息传递型',
        rhythm: '适中',
        videoEvidence: [],
        score: 6,
        improvement: '可优化节奏',
      },
      endingAnalysis: {
        endingType: '自然收尾',
        originalText: '（文案提取失败）',
        score: 6,
        effect: '完整收尾',
        improvement: '可增加互动引导',
      },
    },
    
    copyableMethodology: {
      topicFormula: {
        template: '[领域] + [价值点]',
        examples: ['示例1', '示例2'],
        keyElements: ['主题明确', '内容有价值'],
      },
      structureTemplate: {
        segments: [{
          timeRange: '全程',
          stage: '内容展示',
          content: '传递核心信息',
        }],
        keyElements: ['清晰主题', '完整内容'],
      },
      checklist: ['□ 主题明确', '□ 内容完整', '□ 表达清晰'],
    },
    
    riskWarning: {
      contentRisks: [{
        riskPoint: '内容同质化',
        evidence: '（无证据）',
        mitigation: '增加差异化',
      }],
      copycatBoundaries: {
        canCopy: ['内容结构'],
        cannotCopy: ['原创内容'],
        adaptationTips: '结合自身领域适配',
      },
      complianceWarning: {
        sensitiveWords: [],
        platformRisks: ['遵守平台规范'],
      },
    },
    
    monetizationAnalysis: {
      monetizationPath: {
        primaryPath: '内容变现',
        conversionFunnel: '观看→关注→转化',
      },
      conversionHooks: {
        inVideoHooks: ['内容价值'],
        problems: ['无明确转化引导'],
        optimizations: ['可增加关注引导'],
      },
      commercialPotential: {
        potentialScore: 5,
        suitableProducts: ['内容服务'],
        estimatedConversionRate: '基础转化潜力',
      },
    },
  };
}
