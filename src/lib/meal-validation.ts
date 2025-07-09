import { MealType } from '@/types/database';
import { supabase } from '@/lib/supabase';

/**
 * 시간대별 식사 제한 설정
 */
export interface TimeSlotConfig {
  breakfast: { start: number; end: number }; // 5-11시
  lunch: { start: number; end: number };     // 11-17시  
  dinner: { start: number; end: number };    // 17-23시
  snack: { allowed: boolean };               // 언제든지 허용
}

/**
 * 기본 시간대 설정
 */
export const DEFAULT_TIME_SLOTS: TimeSlotConfig = {
  breakfast: { start: 5, end: 11 },
  lunch: { start: 11, end: 17 },
  dinner: { start: 17, end: 23 },
  snack: { allowed: true }
};

/**
 * 시간대별 식사 검증 결과
 */
export interface MealValidationResult {
  isValid: boolean;
  allowedMealTypes: MealType[];
  currentMealType: MealType | null;
  message: string;
  restrictionReason?: string;
}

/**
 * 현재 시간을 기준으로 허용된 식사 타입들을 반환
 * @param date 검증할 날짜 (기본값: 현재 시간)
 * @param timeSlots 시간대 설정 (기본값: DEFAULT_TIME_SLOTS)
 * @returns 허용된 식사 타입 배열
 */
export function getAllowedMealTypes(
  date: Date = new Date(),
  timeSlots: TimeSlotConfig = DEFAULT_TIME_SLOTS
): MealType[] {
  const hour = date.getHours();
  const allowedTypes: MealType[] = [];

  // 스낵은 항상 허용
  if (timeSlots.snack.allowed) {
    allowedTypes.push('snack');
  }

  // 시간대별 식사 타입 확인
  if (hour >= timeSlots.breakfast.start && hour < timeSlots.breakfast.end) {
    allowedTypes.push('breakfast');
  }
  
  if (hour >= timeSlots.lunch.start && hour < timeSlots.lunch.end) {
    allowedTypes.push('lunch');
  }
  
  if (hour >= timeSlots.dinner.start && hour < timeSlots.dinner.end) {
    allowedTypes.push('dinner');
  }

  return allowedTypes;
}

/**
 * 현재 시간에 가장 적합한 식사 타입을 반환
 * @param date 검증할 날짜 (기본값: 현재 시간)
 * @param timeSlots 시간대 설정 (기본값: DEFAULT_TIME_SLOTS)
 * @returns 현재 시간에 적합한 식사 타입
 */
export function getCurrentMealType(
  date: Date = new Date(),
  timeSlots: TimeSlotConfig = DEFAULT_TIME_SLOTS
): MealType | null {
  const hour = date.getHours();

  if (hour >= timeSlots.breakfast.start && hour < timeSlots.breakfast.end) {
    return 'breakfast';
  }
  
  if (hour >= timeSlots.lunch.start && hour < timeSlots.lunch.end) {
    return 'lunch';
  }
  
  if (hour >= timeSlots.dinner.start && hour < timeSlots.dinner.end) {
    return 'dinner';
  }

  return null; // 정규 식사 시간이 아님 (스낵만 허용)
}

/**
 * 특정 식사 타입이 현재 시간에 허용되는지 검증
 * @param mealType 검증할 식사 타입
 * @param date 검증할 날짜 (기본값: 현재 시간)
 * @param timeSlots 시간대 설정 (기본값: DEFAULT_TIME_SLOTS)
 * @returns 검증 결과
 */
export function validateMealTime(
  mealType: MealType,
  date: Date = new Date(),
  timeSlots: TimeSlotConfig = DEFAULT_TIME_SLOTS
): MealValidationResult {
  const allowedTypes = getAllowedMealTypes(date, timeSlots);
  const currentType = getCurrentMealType(date, timeSlots);
  const hour = date.getHours();
  const isValid = allowedTypes.includes(mealType);

  if (isValid) {
    return {
      isValid: true,
      allowedMealTypes: allowedTypes,
      currentMealType: currentType,
      message: `${mealType} 업로드가 허용된 시간입니다.`
    };
  }

  // 에러 메시지 생성
  let restrictionReason = '';
  let suggestedTime = '';

  switch (mealType) {
    case 'breakfast':
      restrictionReason = `아침식사는 ${timeSlots.breakfast.start}시-${timeSlots.breakfast.end}시에만 업로드할 수 있습니다.`;
      suggestedTime = `${timeSlots.breakfast.start}:00-${timeSlots.breakfast.end}:00`;
      break;
    case 'lunch':
      restrictionReason = `점심식사는 ${timeSlots.lunch.start}시-${timeSlots.lunch.end}시에만 업로드할 수 있습니다.`;
      suggestedTime = `${timeSlots.lunch.start}:00-${timeSlots.lunch.end}:00`;
      break;
    case 'dinner':
      restrictionReason = `저녁식사는 ${timeSlots.dinner.start}시-${timeSlots.dinner.end}시에만 업로드할 수 있습니다.`;
      suggestedTime = `${timeSlots.dinner.start}:00-${timeSlots.dinner.end}:00`;
      break;
    case 'snack':
      // 스낵은 항상 허용되므로 이 케이스는 발생하지 않아야 함
      restrictionReason = '스낵은 언제든지 업로드할 수 있습니다.';
      break;
  }

  return {
    isValid: false,
    allowedMealTypes: allowedTypes,
    currentMealType: currentType,
    message: `현재 ${hour}시에는 ${mealType} 업로드가 허용되지 않습니다.`,
    restrictionReason: `${restrictionReason} 현재 허용된 식사: ${allowedTypes.join(', ')}`
  };
}

/**
 * 시간대별 제한 정보를 반환
 * @param timeSlots 시간대 설정 (기본값: DEFAULT_TIME_SLOTS)
 * @returns 시간대별 제한 정보
 */
export function getTimeSlotInfo(timeSlots: TimeSlotConfig = DEFAULT_TIME_SLOTS) {
  return {
    breakfast: `${timeSlots.breakfast.start}:00 - ${timeSlots.breakfast.end}:00`,
    lunch: `${timeSlots.lunch.start}:00 - ${timeSlots.lunch.end}:00`,
    dinner: `${timeSlots.dinner.start}:00 - ${timeSlots.dinner.end}:00`,
    snack: '24시간 업로드 가능'
  };
}

/**
 * 다음 허용 시간을 계산
 * @param mealType 원하는 식사 타입
 * @param date 현재 날짜 (기본값: 현재 시간)
 * @param timeSlots 시간대 설정 (기본값: DEFAULT_TIME_SLOTS)
 * @returns 다음 허용 시간
 */
export function getNextAllowedTime(
  mealType: MealType,
  date: Date = new Date(),
  timeSlots: TimeSlotConfig = DEFAULT_TIME_SLOTS
): Date | null {
  if (mealType === 'snack') {
    return new Date(); // 스낵은 언제든지 허용
  }

  const currentHour = date.getHours();
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let targetHour: number;
  
  switch (mealType) {
    case 'breakfast':
      targetHour = timeSlots.breakfast.start;
      break;
    case 'lunch':
      targetHour = timeSlots.lunch.start;
      break;
    case 'dinner':
      targetHour = timeSlots.dinner.start;
      break;
    default:
      return null;
  }

  // 오늘 해당 시간대가 아직 남아있는지 확인
  if (currentHour < targetHour) {
    const nextTime = new Date(date);
    nextTime.setHours(targetHour, 0, 0, 0);
    return nextTime;
  }

  // 내일로 설정
  tomorrow.setHours(targetHour, 0, 0, 0);
  return tomorrow;
}

// ===== 데이터베이스 중복 검증 관련 =====

/**
 * 데이터베이스 중복 검증 결과
 */
export interface DuplicateValidationResult {
  isDuplicate: boolean;
  existingMeal?: {
    id: string;
    meal_name: string;
    created_at: string;
  };
  message: string;
}

/**
 * 통합 식사 검증 결과 (시간대 + 중복)
 */
export interface ComprehensiveMealValidationResult {
  isValid: boolean;
  timeValidation: MealValidationResult;
  duplicateValidation: DuplicateValidationResult;
  message: string;
  canProceed: boolean;
}

/**
 * 특정 날짜에 사용자가 해당 식사 타입을 이미 업로드했는지 확인
 * @param userId 사용자 ID
 * @param mealType 식사 타입
 * @param mealDate 식사 날짜 (YYYY-MM-DD 형식)
 * @returns 중복 검증 결과
 */
export async function checkDuplicateMeal(
  userId: string,
  mealType: MealType,
  mealDate: string
): Promise<DuplicateValidationResult> {
  try {
    // 스낵은 중복 허용
    if (mealType === 'snack') {
      return {
        isDuplicate: false,
        message: '스낵은 하루에 여러 번 업로드할 수 있습니다.'
      };
    }

    // 데이터베이스에서 중복 확인
    const { data: existingMeals, error } = await supabase
      .from('meals')
      .select('id, meal_name, created_at')
      .eq('user_id', userId)
      .eq('meal_type', mealType)
      .eq('meal_date', mealDate)
      .limit(1);

    if (error) {
      console.error('데이터베이스 중복 확인 오류:', error);
      throw new Error('데이터베이스 확인 중 오류가 발생했습니다.');
    }

    if (existingMeals && existingMeals.length > 0) {
      const existingMeal = existingMeals[0];
      const mealTypeKorean = {
        breakfast: '아침식사',
        lunch: '점심식사', 
        dinner: '저녁식사',
        snack: '스낵'
      }[mealType];

      return {
        isDuplicate: true,
        existingMeal: {
          id: existingMeal.id,
          meal_name: existingMeal.meal_name,
          created_at: existingMeal.created_at
        },
        message: `오늘 이미 ${mealTypeKorean}를 업로드하셨습니다. (${existingMeal.meal_name})`
      };
    }

    return {
      isDuplicate: false,
      message: '중복되지 않습니다. 업로드 가능합니다.'
    };

  } catch (error) {
    console.error('중복 확인 중 오류:', error);
    return {
      isDuplicate: true, // 안전한 기본값으로 중복으로 처리
      message: '중복 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    };
  }
}

/**
 * 포괄적인 식사 업로드 검증 (시간대 + 중복)
 * @param userId 사용자 ID
 * @param mealType 식사 타입
 * @param date 검증할 날짜 (기본값: 현재 시간)
 * @param timeSlots 시간대 설정 (기본값: DEFAULT_TIME_SLOTS)
 * @returns 포괄적인 검증 결과
 */
export async function validateMealUpload(
  userId: string,
  mealType: MealType,
  date: Date = new Date(),
  timeSlots: TimeSlotConfig = DEFAULT_TIME_SLOTS
): Promise<ComprehensiveMealValidationResult> {
  // 1. 시간대 검증
  const timeValidation = validateMealTime(mealType, date, timeSlots);
  
  // 2. 중복 검증 (시간대가 유효한 경우에만)
  let duplicateValidation: DuplicateValidationResult;
  
  if (timeValidation.isValid) {
    const mealDate = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    duplicateValidation = await checkDuplicateMeal(userId, mealType, mealDate);
  } else {
    // 시간대가 무효하면 중복 검사 스킵
    duplicateValidation = {
      isDuplicate: false,
      message: '시간대 검증을 먼저 통과해야 합니다.'
    };
  }

  // 3. 종합 결과 결정
  const canProceed = timeValidation.isValid && !duplicateValidation.isDuplicate;
  
  let message: string;
  if (!timeValidation.isValid) {
    message = timeValidation.message;
  } else if (duplicateValidation.isDuplicate) {
    message = duplicateValidation.message;
  } else {
    message = '업로드 가능합니다!';
  }

  return {
    isValid: canProceed,
    timeValidation,
    duplicateValidation,
    message,
    canProceed
  };
}

/**
 * 특정 날짜의 사용자 식사 기록 요약
 * @param userId 사용자 ID
 * @param mealDate 조회할 날짜 (YYYY-MM-DD 형식)
 * @returns 해당 날짜의 식사 기록 요약
 */
export async function getDailyMealSummary(
  userId: string,
  mealDate: string
): Promise<{
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  snackCount: number;
  totalMeals: number;
  meals: Array<{
    id: string;
    meal_type: MealType;
    meal_name: string;
    created_at: string;
  }>;
}> {
  try {
    const { data: meals, error } = await supabase
      .from('meals')
      .select('id, meal_type, meal_name, created_at')
      .eq('user_id', userId)
      .eq('meal_date', mealDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('일일 식사 요약 조회 오류:', error);
      throw new Error('식사 기록 조회 중 오류가 발생했습니다.');
    }

    const summary = {
      breakfast: false,
      lunch: false,
      dinner: false,
      snackCount: 0,
      totalMeals: meals?.length || 0,
      meals: meals || []
    };

    meals?.forEach(meal => {
      switch (meal.meal_type) {
        case 'breakfast':
          summary.breakfast = true;
          break;
        case 'lunch':
          summary.lunch = true;
          break;
        case 'dinner':
          summary.dinner = true;
          break;
        case 'snack':
          summary.snackCount++;
          break;
      }
    });

    return summary;

  } catch (error) {
    console.error('일일 식사 요약 오류:', error);
    // 오류 시 기본값 반환
    return {
      breakfast: false,
      lunch: false,
      dinner: false,
      snackCount: 0,
      totalMeals: 0,
      meals: []
    };
  }
} 