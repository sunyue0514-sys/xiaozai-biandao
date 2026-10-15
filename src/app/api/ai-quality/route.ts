import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * AI 质量分析 API
 * 统一入口，支持多种查询类型
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getStats, 
  getFeatureStats, 
  getErrorStats, 
  getOptimizationSuggestions,
  generateQualityReport,
  diagnoseAIQuality
} from '@/lib/ai-quality-logger';

// 验证调试 Token
function validateDebugToken(request: NextRequest): boolean {
  const debugToken = process.env.DEBUG_TOKEN;
  
  // 生产环境需要验证 Token
  if (!debugToken) {
    return false;
  }
  
  const requestToken = request.headers.get('X-Debug-Token');
  return requestToken === debugToken;
}

export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false,"admin":true});
  if (securityResponse) return securityResponse;

  // 验证权限
  if (!validateDebugToken(request)) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'stats';
  
  try {
    switch (action) {
      case 'stats': {
        const startDate = searchParams.get('startDate') || 
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = searchParams.get('endDate') || 
          new Date().toISOString().split('T')[0];
        const feature = searchParams.get('feature') || undefined;
        
        const summary = await getStats(startDate, endDate, feature);
        const byFeature = await getFeatureStats(startDate, endDate);
        
        return NextResponse.json({
          success: true,
          data: {
            summary,
            byFeature: feature ? byFeature.filter(f => f.feature === feature) : byFeature,
          },
        });
      }
      
      case 'errors': {
        const feature = searchParams.get('feature') || undefined;
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        
        const errors = await getErrorStats(feature, limit);
        
        return NextResponse.json({
          success: true,
          data: errors,
        });
      }
      
      case 'suggestions': {
        const suggestions = await getOptimizationSuggestions();
        
        return NextResponse.json({
          success: true,
          data: { suggestions },
        });
      }
      
      case 'diagnose': {
        const diagnosis = await diagnoseAIQuality();
        
        return NextResponse.json({
          success: true,
          data: diagnosis,
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: '未知的操作类型' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"admin":true});
  if (securityResponse) return securityResponse;

  // 验证权限
  if (!validateDebugToken(request)) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, type, features } = body;
    
    switch (action) {
      case 'report': {
        if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
          return NextResponse.json(
            { success: false, error: '请提供有效的报告类型 (daily/weekly/monthly)' },
            { status: 400 }
          );
        }
        
        const report = await generateQualityReport(type, features);
        
        return NextResponse.json({
          success: true,
          data: report,
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: '未知的操作类型' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}
