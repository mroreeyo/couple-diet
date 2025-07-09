import { MealType } from '@/types/database';

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