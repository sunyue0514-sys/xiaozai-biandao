'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Sparkles, TrendingUp } from 'lucide-react';
import type { UserPortraitV2 } from '@/types/analysis-report';
import { getEvidenceText, isEvidenceObject } from '@/utils/evidence-helper';

interface UserPortraitCardV2Props {
  data: UserPortraitV2;
}

/**
 * V2 版本 - 用户画像拆解卡片
 * 
 * 改进点：
 * - 痛点和爽点带场景描述
 * - 用户旅程更详细
 * - videoEvidence 支持字符串或对象格式
 */
export function UserPortraitCardV2({ data }: UserPortraitCardV2Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-purple-500" />
          三、用户画像拆解
          <Badge variant="outline" className="ml-auto text-xs">V2</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">核心受众与痛点爽点分析</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* 目标受众 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            目标受众
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">年龄段</p>
              <p className="font-medium">{data.targetAudience.ageRange}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">职业/身份</p>
              <p className="font-medium">{data.targetAudience.occupation}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">痛点画像</p>
              <p className="font-medium">{data.targetAudience.painProfile}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">消费能力</p>
              <p className="font-medium">{data.targetAudience.consumptionAbility}</p>
            </div>
          </div>
        </div>
        
        {/* 痛点与爽点 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 痛点 */}
          <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">!</span>
              痛点
            </h5>
            <ul className="space-y-2">
              {data.painPoints && data.painPoints.length > 0 ? (
                data.painPoints.map((item, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-foreground">{item.point}</p>
                    {item.scenario && (
                      <p className="text-muted-foreground text-xs mt-0.5">场景：{item.scenario}</p>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">暂无痛点分析</li>
              )}
            </ul>
          </div>
          
          {/* 爽点 */}
          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <h5 className="text-sm font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              爽点
            </h5>
            <ul className="space-y-2">
              {data.pleasurePoints && data.pleasurePoints.length > 0 ? (
                data.pleasurePoints.map((item, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-foreground">{item.point}</p>
                    {item.videoEvidence && (
                      <div className="text-muted-foreground text-xs mt-1 flex items-start gap-1">
                        <span className="text-muted-foreground">证据：</span>
                        {isEvidenceObject(item.videoEvidence) ? (
                          <span>
                            {item.videoEvidence.timestamp && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono mr-1">
                                {item.videoEvidence.timestamp}
                              </span>
                            )}
                            <span>{item.videoEvidence.originalText || item.videoEvidence.content || ''}</span>
                          </span>
                        ) : (
                          <span>{getEvidenceText(item.videoEvidence)}</span>
                        )}
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">暂无爽点分析</li>
              )}
            </ul>
          </div>
        </div>
        
        {/* 用户旅程 */}
        {data.userJourney && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              用户旅程
            </h4>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">认知</p>
                <p className="font-medium">{data.userJourney.awareness}</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="bg-indigo-100 dark:bg-indigo-950/30 rounded-lg px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">兴趣</p>
                <p className="font-medium">{data.userJourney.interest}</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="bg-violet-100 dark:bg-violet-950/30 rounded-lg px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">欲望</p>
                <p className="font-medium">{data.userJourney.desire}</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="bg-purple-100 dark:bg-purple-950/30 rounded-lg px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">行动</p>
                <p className="font-medium">{data.userJourney.action}</p>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="bg-pink-100 dark:bg-pink-950/30 rounded-lg px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">转化</p>
                <p className="font-medium">{data.userJourney.conversion}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
