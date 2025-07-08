import crypto from 'crypto';
import { 
  FoodAnalysisResult, 
  FoodAnalysisResponse, 
  FoodAnalysisError,
  PerformanceMetrics,
  ValidationResult,
  FoodItem
} from '@/types/food-analysis';

/**
 * 응답 검증 및 처리 유틸리티
 */
export class ResponseProcessor {
  private static instance: ResponseProcessor;
  
  public static getInstance(): ResponseProcessor {
    if (!ResponseProcessor.instance) {
      ResponseProcessor.instance = new ResponseProcessor();
    }
    return ResponseProcessor.instance;
  }

  /**
   * AI 응답 검증 및 정제
   */
  public validateAndProcessResponse(
    rawResponse: any,
    imageHash: string,
    processingStartTime: number,
    retryCount: number = 0,
    isMockData: boolean = false
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let correctedData: Partial<FoodAnalysisResult> = {};

    try {
      // 1. 기본 구조 검증
      if (!rawResponse || typeof rawResponse !== 'object') {
        errors.push('응답 데이터가 유효하지 않습니다.');
        return { isValid: false, errors, warnings };
      }

      // 2. 필수 필드 검증
      if (!rawResponse.foods || !Array.isArray(rawResponse.foods)) {
        errors.push('음식 목록이 유효하지 않습니다.');
        return { isValid: false, errors, warnings };
      }

      if (rawResponse.foods.length === 0) {
        errors.push('분석된 음식이 없습니다.');
        return { isValid: false, errors, warnings };
      }

      // 3. 음식 데이터 검증 및 정제
      const validatedFoods = this.validateFoodItems(rawResponse.foods, warnings);
      if (validatedFoods.length === 0) {
        errors.push('유효한 음식 데이터가 없습니다.');
        return { isValid: false, errors, warnings };
      }

      // 4. 총 칼로리 검증 및 재계산
      const calculatedCalories = validatedFoods.reduce((sum, food) => sum + food.calories, 0);
      const originalCalories = rawResponse.total_calories;
      
      if (Math.abs(calculatedCalories - originalCalories) > 50) {
        warnings.push(`칼로리 불일치 감지: 원본 ${originalCalories}kcal → 수정 ${calculatedCalories}kcal`);
      }

      // 5. 식사 타입 검증
      const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      const mealType = validMealTypes.includes(rawResponse.meal_type) 
        ? rawResponse.meal_type 
        : this.inferMealType(calculatedCalories, validatedFoods);

      if (rawResponse.meal_type && !validMealTypes.includes(rawResponse.meal_type)) {
        warnings.push(`유효하지 않은 식사 타입 "${rawResponse.meal_type}" → "${mealType}"로 수정`);
      }

      // 6. 신뢰도 검증
      const analysisConfidence = this.calculateAnalysisConfidence(validatedFoods, isMockData);
      
      // 7. 메타데이터 생성
      const processingTime = Date.now() - processingStartTime;
      const metadata = {
        processing_time_ms: processingTime,
        model_version: isMockData ? 'mock-v1.0' : 'gemini-1.5-pro',
        image_quality_score: this.estimateImageQuality(validatedFoods),
        detected_objects_count: validatedFoods.length,
        retry_count: retryCount,
        is_mock_data: isMockData
      };

      // 8. 수정된 응답 데이터 구성
      correctedData = {
        foods: validatedFoods,
        total_calories: calculatedCalories,
        meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        analysis_confidence: analysisConfidence,
        analyzed_at: new Date().toISOString(),
        metadata
      };

      return {
        isValid: true,
        errors,
        warnings,
        corrected_data: correctedData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(`응답 검증 중 오류 발생: ${errorMessage}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * 음식 항목 검증 및 정제
   */
  private validateFoodItems(foods: any[], warnings: string[]): FoodItem[] {
    const validatedFoods: FoodItem[] = [];
    const seenFoods = new Set<string>();

    for (const food of foods) {
      try {
        // 필수 필드 검증
        if (!food || typeof food !== 'object') {
          warnings.push('잘못된 음식 데이터 형식 감지됨');
          continue;
        }

        const name = this.validateAndCleanFoodName(food.name);
        if (!name) {
          warnings.push('음식명이 유효하지 않아 제외됨');
          continue;
        }

        // 중복 제거
        const normalizedName = name.toLowerCase().trim();
        if (seenFoods.has(normalizedName)) {
          warnings.push(`중복된 음식 "${name}" 제외됨`);
          continue;
        }
        seenFoods.add(normalizedName);

        const calories = this.validateCalories(food.calories, name);
        const amount = this.validateAmount(food.amount);
        const confidence = this.validateConfidence(food.confidence);

        // 신뢰도가 너무 낮은 음식 필터링
        if (confidence < 0.4) {
          warnings.push(`신뢰도가 낮은 음식 "${name}" (${confidence}) 제외됨`);
          continue;
        }

        validatedFoods.push({
          name,
          calories,
          amount,
          confidence: Number(confidence.toFixed(2))
        });

      } catch (error) {
        warnings.push(`음식 데이터 처리 중 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return validatedFoods.slice(0, 10); // 최대 10개로 제한
  }

  /**
   * 음식명 검증 및 정제
   */
  private validateAndCleanFoodName(name: any): string | null {
    if (typeof name !== 'string') return null;
    
    const cleaned = name.trim()
      .replace(/[^\p{L}\p{N}\s\-_()]/gu, '') // 유니코드 문자, 숫자, 공백, 기본 기호만 허용
      .replace(/\s+/g, ' '); // 연속 공백 정리
    
    if (cleaned.length < 1 || cleaned.length > 50) return null;
    
    // 한국어 음식명 검증 (한글이 포함되어야 함)
    const hasKorean = /[\u3131-\u3163\uac00-\ud7af]/.test(cleaned);
    if (!hasKorean) return null;
    
    return cleaned;
  }

  /**
   * 칼로리 검증
   */
  private validateCalories(calories: any, foodName: string): number {
    const parsed = Number(calories);
    if (isNaN(parsed) || parsed < 0) return 0;
    
    // 비현실적인 칼로리 조정
    if (parsed > 2000) {
      console.warn(`⚠️  "${foodName}"의 칼로리가 비현실적으로 높음: ${parsed}kcal → 500kcal로 조정`);
      return 500;
    }
    
    return Math.round(parsed);
  }

  /**
   * 분량 검증
   */
  private validateAmount(amount: any): string {
    if (typeof amount !== 'string') return '적당량';
    
    const cleaned = amount.trim();
    if (cleaned.length === 0 || cleaned.length > 100) return '적당량';
    
    return cleaned;
  }

  /**
   * 신뢰도 검증
   */
  private validateConfidence(confidence: any): number {
    const parsed = Number(confidence);
    if (isNaN(parsed)) return 0.5;
    
    return Math.min(1, Math.max(0, parsed));
  }

  /**
   * 식사 타입 추론
   */
  private inferMealType(totalCalories: number, foods: FoodItem[]): string {
    const foodNames = foods.map(f => f.name.toLowerCase()).join(' ');
    
    // 아침 식사 키워드
    if (foodNames.includes('토스트') || foodNames.includes('시리얼') || 
        foodNames.includes('우유') || foodNames.includes('커피') ||
        totalCalories < 400) {
      return 'breakfast';
    }
    
    // 간식 키워드
    if (foodNames.includes('과자') || foodNames.includes('음료') ||
        foodNames.includes('케이크') || foodNames.includes('아이스크림') ||
        (totalCalories < 300 && foods.length <= 2)) {
      return 'snack';
    }
    
    // 점심/저녁 구분 (칼로리 기준)
    return totalCalories > 600 ? 'dinner' : 'lunch';
  }

  /**
   * 분석 신뢰도 계산
   */
  private calculateAnalysisConfidence(foods: FoodItem[], isMockData: boolean): number {
    if (isMockData) return 0.75;
    
    if (foods.length === 0) return 0;
    
    const avgConfidence = foods.reduce((sum, food) => sum + food.confidence, 0) / foods.length;
    
    // 음식 개수에 따른 가중치 (너무 많거나 적으면 신뢰도 감소)
    let countWeight = 1.0;
    if (foods.length < 2) countWeight = 0.9;
    if (foods.length > 7) countWeight = 0.95;
    
    const finalConfidence = avgConfidence * countWeight * 0.9; // 약간 보수적으로 조정
    return Number(Math.min(1, Math.max(0, finalConfidence)).toFixed(2));
  }

  /**
   * 이미지 품질 추정
   */
  private estimateImageQuality(foods: FoodItem[]): number {
    if (foods.length === 0) return 0.3;
    
    const avgConfidence = foods.reduce((sum, food) => sum + food.confidence, 0) / foods.length;
    const detectedCount = foods.length;
    
    // 신뢰도와 검출 개수 기반으로 이미지 품질 추정
    let quality = avgConfidence * 0.7 + Math.min(detectedCount / 5, 1) * 0.3;
    
    return Number(Math.min(1, Math.max(0.2, quality)).toFixed(2));
  }

  /**
   * 성능 메트릭 생성
   */
  public createPerformanceMetrics(
    startTime: number,
    stages: {
      validation_ms: number;
      image_processing_ms: number;
      ai_analysis_ms: number;
      response_processing_ms: number;
      storage_ms?: number;
    },
    memoryBefore?: number,
    memoryAfter?: number,
    memoryPeak?: number
  ): PerformanceMetrics {
    const endTime = Date.now();
    
    return {
      start_time: startTime,
      end_time: endTime,
      total_duration_ms: endTime - startTime,
      stages,
      memory_usage: (memoryBefore && memoryAfter) ? {
        before_mb: Number((memoryBefore / 1024 / 1024).toFixed(2)),
        after_mb: Number((memoryAfter / 1024 / 1024).toFixed(2)),
        peak_mb: memoryPeak ? Number((memoryPeak / 1024 / 1024).toFixed(2)) : undefined
      } : undefined
    };
  }

  /**
   * 구조화된 에러 응답 생성
   */
  public createErrorResponse(
    errorCode: FoodAnalysisError['code'],
    message: string,
    details?: FoodAnalysisError['details'],
    requestId?: string,
    processingTime?: number
  ): FoodAnalysisResponse {
    return {
      success: false,
      error: message,
      response_metadata: {
        request_id: requestId || crypto.randomUUID(),
        processing_time_ms: processingTime || 0,
        api_version: '1.0.0'
      }
    };
  }

  /**
   * 성공 응답 생성
   */
  public createSuccessResponse(
    data: FoodAnalysisResult,
    requestId?: string,
    cached: boolean = false,
    rateLimitRemaining?: number
  ): FoodAnalysisResponse {
    return {
      success: true,
      data,
      message: '음식 분석이 완료되었습니다.',
      response_metadata: {
        request_id: requestId || crypto.randomUUID(),
        processing_time_ms: data.metadata?.processing_time_ms || 0,
        api_version: '1.0.0',
        cached,
        rate_limit_remaining: rateLimitRemaining
      }
    };
  }
}

export const responseProcessor = ResponseProcessor.getInstance(); 