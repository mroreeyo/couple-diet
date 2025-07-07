import { supabase } from './supabase';
import { FoodAnalysisResult, MealAnalysisRecord } from '@/types/food-analysis';
import { MultiUploadResult } from './storage';
import crypto from 'crypto';

// 히스토리 조회 옵션
export interface MealHistoryQueryOptions {
  userId: string;
  startDate?: string;
  endDate?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'total_calories';
  sortOrder?: 'asc' | 'desc';
  includePartner?: boolean;
}

// 통계 데이터 타입
export interface MealStatistics {
  period: 'daily' | 'weekly' | 'monthly';
  totalMeals: number;
  totalCalories: number;
  averageCalories: number;
  mealTypeBreakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  caloriesByDate: Array<{
    date: string;
    calories: number;
    mealCount: number;
  }>;
}

// 커플 공유 데이터 타입
export interface CoupleSharedMeal {
  id: string;
  user_id: string;
  partner_id: string;
  meal_data: MealAnalysisRecord;
  shared_at: string;
  partner_name?: string;
}

/**
 * 분석 결과를 데이터베이스에 저장
 */
export async function saveMealAnalysis(
  userId: string,
  analysisResult: FoodAnalysisResult,
  uploadResult?: MultiUploadResult,
  originalImageHash?: string
): Promise<{ success: boolean; mealId?: string; error?: string }> {
  try {
    const mealId = crypto.randomUUID();
    
    const record: MealAnalysisRecord = {
      id: mealId,
      user_id: userId,
      analysis_result: analysisResult,
      total_calories: analysisResult.total_calories,
      meal_type: analysisResult.meal_type,
      image_hash: originalImageHash,
      processing_time: uploadResult?.totalUploadTime,
      image_size: uploadResult?.totalSize,
      image_url: uploadResult?.results.original?.publicUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // meals 테이블에 저장
    const { error } = await supabase
      .from('meals')
      .insert([record]);

    if (error) {
      console.error('Failed to save meal analysis:', error);
      throw new Error(`데이터베이스 저장 실패: ${error.message}`);
    }

    return { success: true, mealId };
  } catch (error) {
    console.error('Save meal analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 사용자의 식단 히스토리 조회
 */
export async function getMealHistory(
  options: MealHistoryQueryOptions
): Promise<{
  success: boolean;
  data?: MealAnalysisRecord[];
  total?: number;
  error?: string;
}> {
  try {
    let query = supabase
      .from('meals')
      .select('*', { count: 'exact' });

    // 사용자 필터
    if (options.includePartner) {
      // 커플 관계 확인 후 파트너 데이터도 포함
      const { data: coupleData } = await supabase
        .from('couples')
        .select('partner_id')
        .eq('user_id', options.userId)
        .eq('status', 'connected')
        .single();

      if (coupleData?.partner_id) {
        query = query.in('user_id', [options.userId, coupleData.partner_id]);
      } else {
        query = query.eq('user_id', options.userId);
      }
    } else {
      query = query.eq('user_id', options.userId);
    }

    // 날짜 범위 필터
    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    // 식사 타입 필터
    if (options.mealType) {
      query = query.eq('meal_type', options.mealType);
    }

    // 정렬
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 페이징
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      data: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Get meal history error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 특정 기간의 식단 통계 조회
 */
export async function getMealStatistics(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly',
  includePartner: boolean = false
): Promise<{
  success: boolean;
  data?: MealStatistics;
  error?: string;
}> {
  try {
    // 기간별 날짜 계산
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // 히스토리 데이터 조회
    const historyResult = await getMealHistory({
      userId,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      includePartner,
      limit: 1000
    });

    if (!historyResult.success || !historyResult.data) {
      throw new Error(historyResult.error || 'Failed to get meal history');
    }

    const meals = historyResult.data;

    // 통계 계산
    const totalMeals = meals.length;
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0);
    const averageCalories = totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0;

    // 식사 타입별 분류
    const mealTypeBreakdown = {
      breakfast: meals.filter(m => m.meal_type === 'breakfast').length,
      lunch: meals.filter(m => m.meal_type === 'lunch').length,
      dinner: meals.filter(m => m.meal_type === 'dinner').length,
      snack: meals.filter(m => m.meal_type === 'snack').length
    };

    // 날짜별 칼로리 분석
    const caloriesByDate: { [date: string]: { calories: number; count: number } } = {};
    
    meals.forEach(meal => {
      const date = new Date(meal.created_at!).toISOString().split('T')[0];
      if (!caloriesByDate[date]) {
        caloriesByDate[date] = { calories: 0, count: 0 };
      }
      caloriesByDate[date].calories += meal.total_calories || 0;
      caloriesByDate[date].count += 1;
    });

    const caloriesByDateArray = Object.entries(caloriesByDate)
      .map(([date, data]) => ({
        date,
        calories: data.calories,
        mealCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const statistics: MealStatistics = {
      period,
      totalMeals,
      totalCalories,
      averageCalories,
      mealTypeBreakdown,
      caloriesByDate: caloriesByDateArray
    };

    return { success: true, data: statistics };
  } catch (error) {
    console.error('Get meal statistics error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 커플과 식단 공유
 */
export async function shareWithPartner(
  userId: string,
  mealId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 커플 관계 확인
    const { data: coupleData, error: coupleError } = await supabase
      .from('couples')
      .select('partner_id')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single();

    if (coupleError || !coupleData?.partner_id) {
      throw new Error('연결된 파트너가 없습니다.');
    }

    // 해당 식단 데이터 조회
    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .eq('user_id', userId)
      .single();

    if (mealError || !mealData) {
      throw new Error('공유할 식단을 찾을 수 없습니다.');
    }

    // 공유 데이터 생성
    const sharedMeal: CoupleSharedMeal = {
      id: crypto.randomUUID(),
      user_id: userId,
      partner_id: coupleData.partner_id,
      meal_data: mealData,
      shared_at: new Date().toISOString()
    };

    // 공유 테이블에 저장 (couple_shared_meals 테이블 필요)
    const { error: shareError } = await supabase
      .from('couple_shared_meals')
      .insert([sharedMeal]);

    if (shareError) {
      console.error('Failed to share meal:', shareError);
      throw new Error(`식단 공유 실패: ${shareError.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Share with partner error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 파트너가 공유한 식단 조회
 */
export async function getSharedMealsFromPartner(
  userId: string,
  limit: number = 10
): Promise<{
  success: boolean;
  data?: CoupleSharedMeal[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('couple_shared_meals')
      .select(`
        *,
        user:users!user_id(display_name)
      `)
      .eq('partner_id', userId)
      .order('shared_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    // 파트너 이름 추가
    const enrichedData = (data || []).map(item => ({
      ...item,
      partner_name: item.user?.display_name || '알 수 없음'
    }));

    return { success: true, data: enrichedData };
  } catch (error) {
    console.error('Get shared meals error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 특정 식단 삭제
 */
export async function deleteMeal(
  userId: string,
  mealId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 해당 식단이 사용자의 것인지 확인
    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .select('id, image_url')
      .eq('id', mealId)
      .eq('user_id', userId)
      .single();

    if (mealError || !mealData) {
      throw new Error('삭제할 식단을 찾을 수 없습니다.');
    }

    // 데이터베이스에서 삭제
    const { error: deleteError } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Delete meal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 오래된 데이터 자동 정리 (6개월 이상)
 */
export async function cleanupOldMeals(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { error } = await supabase
      .from('meals')
      .delete()
      .lt('created_at', sixMonthsAgo.toISOString());

    if (error) {
      throw new Error(error.message);
    }

    // Supabase delete는 삭제된 레코드 수를 직접 반환하지 않으므로
    // 별도 쿼리로 확인하거나 성공 메시지만 반환
    console.log('Old meal records cleanup completed');
    
    return { success: true };
  } catch (error) {
    console.error('Cleanup old meals error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 데이터 내보내기 (CSV 형식)
 */
export async function exportMealData(
  userId: string,
  format: 'csv' | 'json' = 'csv'
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const historyResult = await getMealHistory({
      userId,
      limit: 10000,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });

    if (!historyResult.success || !historyResult.data) {
      throw new Error(historyResult.error || 'Failed to get meal history');
    }

    const meals = historyResult.data;

    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(meals, null, 2)
      };
    }

    // CSV 형식 생성
    const headers = [
      '날짜',
      '식사타입',
      '총칼로리',
      '음식목록',
      '분석신뢰도'
    ];

    const csvRows = meals.map(meal => {
      const date = new Date(meal.created_at!).toLocaleDateString('ko-KR');
      const mealType = meal.meal_type || '';
      const totalCalories = meal.total_calories || 0;
      const foods = meal.analysis_result.foods
        .map(f => `${f.name}(${f.calories}kcal)`)
        .join(', ');
      const confidence = meal.analysis_result.analysis_confidence;

      return [date, mealType, totalCalories, foods, confidence].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    return { success: true, data: csvContent };
  } catch (error) {
    console.error('Export meal data error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 