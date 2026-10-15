import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/success-cases
 * 获取成功案例列表
 */
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data: cases, error } = await supabase
      .from('success_cases')
      .select('id,user_nickname,user_avatar,platform,case_type,case_data,used_feature,testimonial,sort_order')
      .eq('is_displayed', true)
      .order('sort_order', { ascending: true })
      .limit(20);

    if (error) {
      console.error('获取成功案例失败:', error);
      return NextResponse.json({ error: '获取案例失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: (cases || []).map(item => ({
        id: item.id, user_nickname: item.user_nickname, user_avatar: item.user_avatar,
        platform: item.platform, case_type: item.case_type, used_feature: item.used_feature,
        testimonial: item.testimonial, sort_order: item.sort_order,
        case_data: Object.fromEntries(['value', 'unit', 'time', 'industry', 'identity', 'experience']
          .filter(key => typeof item.case_data?.[key] === 'string')
          .map(key => [key, item.case_data[key]])),
      })),
    });
  } catch (error) {
    console.error('获取成功案例失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
