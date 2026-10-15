'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Sparkles,
  Lightbulb,
  Heart,
  Shield,
  Zap,
} from 'lucide-react';

interface AnalysisReportCardProps {
  profile: {
    // 基础字段
    targetUsers?: string | null;
    userPainPoints?: string | null;
    usageScenario?: string | null;
    sellingPoints?: string[];
    // 用户画像详情
    userAgeRange?: string | null;
    userGender?: string | null;
    userConsumptionLevel?: string | null;
    userInterests?: string[] | null;
    // 价值阶梯
    valueLadderBasic?: string | null;
    valueLadderAdvanced?: string | null;
    valueLadderTop?: string | null;
    // 痛点详情
    painPointsJson?: string | null;
    purchaseBarriersJson?: string | null;
    // 信任背书
    trustProofSales?: string | null;
    trustProofRatings?: string | null;
    trustProofCertifications?: string[] | null;
    trustProofCases?: string | null;
    trustProofEndorsements?: string | null;
    // 完整分析结果
    aiPositioning?: string | null;
    analysisCompleted?: boolean;
  };
}

/**
 * 智能分析报告卡片
 * 将分析结果以结构化方式展示给用户
 */
export default function AnalysisReportCard({ profile }: AnalysisReportCardProps) {
  // 检查是否有任何分析数据
  const hasAnalysisData = 
    profile.analysisCompleted ||
    profile.userAgeRange ||
    profile.valueLadderBasic ||
    profile.painPointsJson ||
    profile.aiPositioning;

  if (!hasAnalysisData) {
    return null;
  }

  // 解析痛点JSON
  let painPoints: Array<{ point: string; intensity: string }> = [];
  try {
    if (profile.painPointsJson) {
      painPoints = JSON.parse(profile.painPointsJson);
    }
  } catch (e) {
    // 忽略解析错误
  }

  // 解析购买阻力JSON
  let purchaseBarriers: string[] = [];
  try {
    if (profile.purchaseBarriersJson) {
      purchaseBarriers = JSON.parse(profile.purchaseBarriersJson);
    }
  } catch (e) {
    // 忽略解析错误
  }

  // 从完整分析结果中提取更多信息
  const extractedData = extractFromFullAnalysis(profile.aiPositioning || '');

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            智能分析报告
          </CardTitle>
          {profile.analysisCompleted && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              分析完成
            </Badge>
          )}
        </div>
        <CardDescription>
          基于千川编导方法论的结构化分析结果
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 用户画像卡片 */}
        {(profile.userAgeRange || profile.userGender || profile.userConsumptionLevel || profile.userInterests?.length || extractedData.userPortrait) && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm">用户画像</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {profile.userAgeRange && (
                <div>
                  <span className="text-muted-foreground">年龄段：</span>
                  <span className="font-medium">{profile.userAgeRange}</span>
                </div>
              )}
              {profile.userGender && (
                <div>
                  <span className="text-muted-foreground">性别：</span>
                  <span className="font-medium">{profile.userGender}</span>
                </div>
              )}
              {profile.userConsumptionLevel && (
                <div>
                  <span className="text-muted-foreground">消费能力：</span>
                  <span className="font-medium">{profile.userConsumptionLevel}</span>
                </div>
              )}
              {profile.userInterests && profile.userInterests.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">兴趣标签：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.userInterests.map((interest, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {extractedData.userPortrait && (
                <div className="col-span-2 text-muted-foreground text-xs">
                  {extractedData.userPortrait}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 价值阶梯 */}
        {(profile.valueLadderBasic || profile.valueLadderAdvanced || profile.valueLadderTop || extractedData.valueLadder.length > 0) && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-sm">价值阶梯</span>
            </div>
            <div className="space-y-2">
              {/* 顶层价值 */}
              {(profile.valueLadderTop || extractedData.valueLadder.find(v => v.level === 'top')?.content) && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="w-3 h-3 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">顶层价值</div>
                    <div className="text-sm">{profile.valueLadderTop || extractedData.valueLadder.find(v => v.level === 'top')?.content}</div>
                  </div>
                </div>
              )}
              {/* 进阶价值 */}
              {(profile.valueLadderAdvanced || extractedData.valueLadder.find(v => v.level === 'advanced')?.content) && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-3 h-3 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">进阶价值</div>
                    <div className="text-sm">{profile.valueLadderAdvanced || extractedData.valueLadder.find(v => v.level === 'advanced')?.content}</div>
                  </div>
                </div>
              )}
              {/* 基础价值 */}
              {(profile.valueLadderBasic || extractedData.valueLadder.find(v => v.level === 'basic')?.content) && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-3 h-3 text-green-500" />
                  </div>
                  <div>
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">基础价值</div>
                    <div className="text-sm">{profile.valueLadderBasic || extractedData.valueLadder.find(v => v.level === 'basic')?.content}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 痛点挖掘 */}
        {(painPoints.length > 0 || extractedData.painPoints.length > 0 || profile.userPainPoints) && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-red-500" />
              <span className="font-medium text-sm">痛点挖掘</span>
            </div>
            <div className="space-y-2">
              {painPoints.map((pp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{pp.point}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          pp.intensity.includes('高') ? 'bg-red-500 w-full' :
                          pp.intensity.includes('中') ? 'bg-yellow-500 w-2/3' :
                          'bg-green-500 w-1/3'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{pp.intensity}</span>
                  </div>
                </div>
              ))}
              {extractedData.painPoints.map((pp, i) => (
                <div key={`ext-${i}`} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{pp}</span>
                </div>
              ))}
              {profile.userPainPoints && painPoints.length === 0 && extractedData.painPoints.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  {profile.userPainPoints}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 核心卖点感知路径 */}
        {extractedData.sellingPoints.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-sm">核心卖点</span>
            </div>
            <div className="space-y-3">
              {extractedData.sellingPoints.map((sp, i) => (
                <div key={i} className="text-sm">
                  <div className="font-medium text-foreground mb-1">{sp.name}</div>
                  {sp.perceptionPath && (
                    <div className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">
                      感知路径：{sp.perceptionPath}
                    </div>
                  )}
                  {sp.expression && (
                    <div className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">
                      推荐表达：{sp.expression}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 目标人群和使用场景（从基础字段补充） */}
        {(profile.targetUsers || profile.usageScenario) && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {profile.targetUsers && (
                <div>
                  <span className="text-muted-foreground">目标人群：</span>
                  <span className="font-medium">{profile.targetUsers}</span>
                </div>
              )}
              {profile.usageScenario && (
                <div>
                  <span className="text-muted-foreground">使用场景：</span>
                  <span className="font-medium">{profile.usageScenario}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 信任背书 */}
        {(profile.trustProofSales || profile.trustProofRatings || profile.trustProofCertifications?.length || profile.trustProofCases) && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="font-medium text-sm">信任背书</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {profile.trustProofSales && (
                <div>
                  <span className="text-muted-foreground">销量：</span>
                  <span className="font-medium">{profile.trustProofSales}</span>
                </div>
              )}
              {profile.trustProofRatings && (
                <div>
                  <span className="text-muted-foreground">评价：</span>
                  <span className="font-medium">{profile.trustProofRatings}</span>
                </div>
              )}
              {profile.trustProofCertifications && profile.trustProofCertifications.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">认证：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.trustProofCertifications.map((cert, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.trustProofCases && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">案例：</span>
                  <span className="font-medium">{profile.trustProofCases}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 从完整分析结果中提取结构化数据
 */
function extractFromFullAnalysis(aiPositioning: string) {
  const result = {
    userPortrait: '',
    valueLadder: [] as Array<{ level: string; content: string }>,
    painPoints: [] as string[],
    sellingPoints: [] as Array<{ name: string; perceptionPath?: string; expression?: string }>,
  };

  if (!aiPositioning) return result;

  const lines = aiPositioning.split('\n');
  let currentSection = '';
  let currentSellingPoint: { name: string; perceptionPath?: string; expression?: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 识别章节
    if (line.includes('卖点拆解')) {
      currentSection = 'selling_point';
    } else if (line.includes('用户画像')) {
      currentSection = 'user_portrait';
    } else if (line.includes('价值阶梯')) {
      currentSection = 'value_ladder';
    } else if (line.includes('痛点挖掘')) {
      currentSection = 'pain_point';
    }

    // 提取核心卖点
    if (currentSection === 'selling_point') {
      const match = line.match(/^###\s*核心卖点\d+[:：]\s*(.+)/);
      if (match) {
        if (currentSellingPoint) {
          result.sellingPoints.push(currentSellingPoint);
        }
        currentSellingPoint = { name: match[1].trim() };
        continue;
      }

      // 提取用户感知路径
      if (currentSellingPoint && line.includes('用户感知路径')) {
        const pathMatch = line.match(/用户感知路径[:：]\s*(.+)/);
        if (pathMatch) {
          currentSellingPoint.perceptionPath = pathMatch[1].trim();
        }
      }

      // 提取推荐表达方式
      if (currentSellingPoint && line.includes('推荐表达')) {
        const expMatch = line.match(/推荐表达(?:方式)?[:：]\s*(.+)/);
        if (expMatch) {
          currentSellingPoint.expression = expMatch[1].trim();
        }
      }
    }

    // 提取价值阶梯
    if (currentSection === 'value_ladder') {
      if (line.includes('顶层价值') || line.includes('社交价值')) {
        const match = line.match(/[:：]\s*(.+)/);
        if (match) {
          result.valueLadder.push({ level: 'top', content: match[1].trim() });
        }
      } else if (line.includes('进阶价值') || line.includes('情感价值')) {
        const match = line.match(/[:：]\s*(.+)/);
        if (match) {
          result.valueLadder.push({ level: 'advanced', content: match[1].trim() });
        }
      } else if (line.includes('基础价值') || line.includes('功能价值')) {
        const match = line.match(/[:：]\s*(.+)/);
        if (match) {
          result.valueLadder.push({ level: 'basic', content: match[1].trim() });
        }
      }
    }

    // 提取用户画像摘要
    if (currentSection === 'user_portrait' && line.includes('典型用户')) {
      const match = line.match(/典型用户[:：]\s*(.+)/);
      if (match) {
        result.userPortrait = match[1].trim();
      }
    }

    // 提取痛点
    if (currentSection === 'pain_point') {
      const match = line.match(/^\d+\.\s*\*\*(.+?)\*\*/);
      if (match) {
        result.painPoints.push(match[1].trim());
      }
    }
  }

  // 添加最后一个卖点
  if (currentSellingPoint) {
    result.sellingPoints.push(currentSellingPoint);
  }

  return result;
}
