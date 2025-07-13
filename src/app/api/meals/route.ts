import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, getUserFromToken } from '@/lib/auth-utils';
import { createClient } from '@supabase/supabase-js';
import { MealAnalysisRecord } from '@/types/food-analysis';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 인증 토큰 검증
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 2. URL 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filter = searchParams.get('filter'); // 'mine', 'partner', 'all'
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // 3. 파트너 정보 가져오기
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('partner_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('사용자 정보 조회 오류:', userError);
      return NextResponse.json(
        { success: false, error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 4. 쿼리 조건 설정
    let query = supabase
      .from('meals')
      .select(`
        id,
        user_id,
        meal_name,
        calories,
        meal_type,
        photo_url,
        description,
        meal_date,
        created_at,
        updated_at,
        users!inner(id, email, display_name)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 5. 사용자 필터링 적용
    if (filter === 'mine') {
      query = query.eq('user_id', user.id);
    } else if (filter === 'partner' && userInfo.partner_id) {
      query = query.eq('user_id', userInfo.partner_id);
    } else {
      // 'all' 또는 기본값: 본인과 파트너의 식단 모두
      const userIds = [user.id];
      if (userInfo.partner_id) {
        userIds.push(userInfo.partner_id);
      }
      query = query.in('user_id', userIds);
    }

    // 6. 날짜 필터링 적용
    if (dateFrom) {
      query = query.gte('meal_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('meal_date', dateTo);
    }

    // 7. 데이터 조회
    const { data: meals, error: mealsError } = await query;

    if (mealsError) {
      console.error('식단 조회 오류:', mealsError);
      return NextResponse.json(
        { success: false, error: '식단 데이터를 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    // 8. MealAnalysisRecord 형태로 변환
    const transformedMeals: (MealAnalysisRecord & { authorName?: string; authorEmail?: string })[] = meals.map((meal) => ({
      id: meal.id,
      user_id: meal.user_id,
      image_url: meal.photo_url || '',
      meal_type: meal.meal_type,
      total_calories: meal.calories || 0,
      analysis_result: {
        total_calories: meal.calories || 0,
        meal_type: meal.meal_type,
        analysis_confidence: 0.85, // 기본값
        foods: [
          {
            name: meal.meal_name,
            calories: meal.calories || 0,
            amount: '1인분',
            confidence: 0.8
          }
        ]
      },
      created_at: meal.created_at,
      updated_at: meal.updated_at,
      authorName: meal.users?.[0]?.display_name || meal.users?.[0]?.email?.split('@')[0] || '익명',
      authorEmail: meal.users?.[0]?.email || ''
    }));

    // 9. 총 개수 조회 (페이지네이션용)
    let countQuery = supabase
      .from('meals')
      .select('id', { count: 'exact', head: true });

    // 같은 필터 조건 적용
    if (filter === 'mine') {
      countQuery = countQuery.eq('user_id', user.id);
    } else if (filter === 'partner' && userInfo.partner_id) {
      countQuery = countQuery.eq('user_id', userInfo.partner_id);
    } else {
      const userIds = [user.id];
      if (userInfo.partner_id) {
        userIds.push(userInfo.partner_id);
      }
      countQuery = countQuery.in('user_id', userIds);
    }

    if (dateFrom) {
      countQuery = countQuery.gte('meal_date', dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.lte('meal_date', dateTo);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('총 개수 조회 오류:', countError);
    }

    // 10. 응답 반환
    return NextResponse.json({
      success: true,
      data: {
        meals: transformedMeals,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: transformedMeals.length === limit
        },
        filter_applied: {
          filter,
          date_from: dateFrom,
          date_to: dateTo,
          partner_connected: !!userInfo.partner_id
        },
        debug_info: {
          current_user_id: user.id,
          partner_id: userInfo.partner_id,
          query_filter: filter,
          meals_found: transformedMeals.length,
          user_ids_searched: filter === 'mine' ? [user.id] : 
                            filter === 'partner' && userInfo.partner_id ? [userInfo.partner_id] :
                            userInfo.partner_id ? [user.id, userInfo.partner_id] : [user.id]
        }
      }
    });

  } catch (error) {
    console.error('식단 목록 조회 중 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
} 