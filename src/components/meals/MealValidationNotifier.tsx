'use client';

import { useCallback } from 'react';
import { useToastHelpers } from '@/components/ui/toast-container';
import { 
  ComprehensiveMealValidationResult,
  MealValidationResult,
  DuplicateValidationResult 
} from '@/lib/meal-validation';

interface MealValidationNotifierProps {
  onRetryAfterTime?: (suggestedTime: Date) => void;
  onViewExistingMeal?: (mealId: string) => void;
  onForceUpload?: () => void;
}

export function useMealValidationNotifier({
  onRetryAfterTime,
  onViewExistingMeal,
  onForceUpload
}: MealValidationNotifierProps = {}) {
  const { 
    showSuccess, 
    showError, 
    showTimeRestriction, 
    showDuplicateWarning
  } = useToastHelpers();

  const notifyValidationResult = useCallback((result: ComprehensiveMealValidationResult) => {
    if (result.isValid) {
      showSuccess('식사 업로드가 완료되었습니다!', {
        title: '업로드 성공',
        duration: 4000
      });
      return;
    }

    // 시간대 제한 알림
    if (!result.timeValidation.isValid) {
      handleTimeRestrictionNotification(result.timeValidation);
    }

    // 중복 업로드 알림
    if (result.duplicateValidation.isDuplicate) {
      handleDuplicateNotification(result.duplicateValidation);
    }
  }, [showSuccess]);

  const handleTimeRestrictionNotification = useCallback((timeValidation: MealValidationResult) => {
    const message = timeValidation.message;
    
    showTimeRestriction(message, {
      duration: 8000,
      children: timeValidation.restrictionReason && (
        <div className="mt-2 text-xs opacity-75">
          제한 사유: {timeValidation.restrictionReason}
        </div>
      )
    });
  }, [showTimeRestriction]);

  const handleDuplicateNotification = useCallback((duplicateValidation: DuplicateValidationResult) => {
    let actionButton;

    // 기존 식사 보기 액션
    if (duplicateValidation.existingMeal?.id && onViewExistingMeal) {
      actionButton = {
        label: '기존 식사 보기',
        onClick: () => onViewExistingMeal(duplicateValidation.existingMeal!.id!),
        variant: 'primary' as const
      };
    }

    const existingMealTime = duplicateValidation.existingMeal?.created_at ? 
      new Date(duplicateValidation.existingMeal.created_at).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '정보 없음';

    showDuplicateWarning(duplicateValidation.message, {
      duration: 8000,
      actionButton,
      children: duplicateValidation.existingMeal && (
        <div className="mt-2 space-y-1">
          <div className="text-xs opacity-75">
            기존 업로드 시간: {existingMealTime}
          </div>
          {duplicateValidation.existingMeal.meal_name && (
            <div className="text-xs opacity-75">
              음식: {duplicateValidation.existingMeal.meal_name}
            </div>
          )}
        </div>
      )
    });
  }, [showDuplicateWarning, onViewExistingMeal]);

  const notifyTimeRestriction = useCallback((
    mealType: string, 
    currentHour: number,
    allowedStart?: number,
    allowedEnd?: number
  ) => {
    let message = `현재 시간(${currentHour}시)에는 ${mealType} 업로드가 제한됩니다.`;
    
    if (allowedStart !== undefined && allowedEnd !== undefined) {
      message += ` ${mealType}는 ${allowedStart}-${allowedEnd}시에만 업로드할 수 있습니다.`;
    }

    showTimeRestriction(message, {
      duration: 6000
    });
  }, [showTimeRestriction]);

  const notifyDuplicateUpload = useCallback((mealType: string, existingTime?: string) => {
    let message = `오늘 이미 ${mealType}을 업로드했습니다.`;
    
    if (existingTime) {
      message += ` (업로드 시간: ${existingTime})`;
    }

    showDuplicateWarning(message, {
      duration: 6000,
      actionButton: onForceUpload ? {
        label: '스낵으로 업로드',
        onClick: onForceUpload,
        variant: 'secondary' as const
      } : undefined
    });
  }, [showDuplicateWarning, onForceUpload]);

  const notifyUploadSuccess = useCallback((mealType: string, foodName?: string) => {
    let message = `${mealType} 업로드가 완료되었습니다.`;
    
    if (foodName) {
      message = `${foodName} (${mealType}) 업로드가 완료되었습니다.`;
    }

    showSuccess(message, {
      title: '업로드 성공',
      duration: 4000
    });
  }, [showSuccess]);

  const notifyUploadError = useCallback((error: string) => {
    showError(`업로드 중 오류가 발생했습니다: ${error}`, {
      title: '업로드 실패',
      duration: 8000
    });
  }, [showError]);

  // API 응답에서 검증 에러 파싱
  const notifyFromAPIResponse = useCallback((response: any) => {
    if (response.success === false && response.validation) {
      // 개별 검증 실패 처리
      if (response.validation.timeValidation && !response.validation.timeValidation.isValid) {
        showTimeRestriction(response.validation.timeValidation.message, {
          duration: 8000,
          children: response.validation.timeValidation.restrictionReason && (
            <div className="mt-2 text-xs opacity-75">
              제한 사유: {response.validation.timeValidation.restrictionReason}
            </div>
          )
        });
      }

      if (response.validation.duplicateValidation && response.validation.duplicateValidation.isDuplicate) {
        showDuplicateWarning(response.validation.duplicateValidation.message, {
          duration: 8000
        });
      }
    } else if (response.success === false) {
      notifyUploadError(response.error || '알 수 없는 오류가 발생했습니다.');
    } else if (response.success === true) {
      notifyUploadSuccess(
        response.analysis?.meal_type || '식사',
        response.analysis?.food_name
      );
    }
  }, [showTimeRestriction, showDuplicateWarning, notifyUploadError, notifyUploadSuccess]);

  return {
    notifyValidationResult,
    notifyTimeRestriction,
    notifyDuplicateUpload,
    notifyUploadSuccess,
    notifyUploadError,
    notifyFromAPIResponse
  };
}

export default useMealValidationNotifier; 