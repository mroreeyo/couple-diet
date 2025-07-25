import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import { 
  checkRateLimit, 
  rateLimiters,
  getClientIP,
  getUserAgent,
  logSecurityEvent,
  validateAIEnvironmentVariables 
} from '@/lib/security';
import { extractBearerToken, getUserFromToken } from '@/lib/auth-utils';
import { 
  processImageForAI,
  validateImageFormat,
  validateImageSize,
  validateImageIntegrity,
  getMemoryUsage,
  calculateCompressionRatio,
  ImageProcessingResult
} from '@/lib/image-processor';
import { 
  initializeStorageBucket,
  uploadProcessedImages,
  checkStorageConnection
} from '@/lib/storage';
import { 
  saveMealAnalysis
} from '@/lib/meals-history';
// **ADD MEAL VALIDATION IMPORT**
import {
  validateMealUpload
} from '@/lib/meal-validation';
import { MealType } from '@/types/database';
import { 
  FoodAnalysisResponse, 
  FoodAnalysisResult, 
  FoodAnalysisConfig
} from '@/types/food-analysis';
import { responseProcessor } from '@/lib/response-processor';

// 설정
const CONFIG: FoodAnalysisConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  confidenceThreshold: 0.7,
  apiTimeout: 30000, // 30초
  retryAttempts: 2
};

// Gemini API 클라이언트 초기화
function initializeGeminiClient(): GoogleGenerativeAI {
  console.log('=== Google API Key Debug ===')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('Google API Key exists:', !!process.env.GOOGLE_API_KEY)
  console.log('Google API Key length:', process.env.GOOGLE_API_KEY?.length || 0)
  console.log('Google API Key first 10 chars:', process.env.GOOGLE_API_KEY?.substring(0, 10) || 'N/A')
  console.log('============================')
  
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google API Key가 설정되지 않았습니다.');
  }
  return new GoogleGenerativeAI(apiKey);
}

// 간단하고 직접적인 음식 분석 프롬프트 (테스트용)
const KOREAN_FOOD_ANALYSIS_PROMPT = `
이미지에 있는 음식을 분석해주세요. 

다음 JSON 형식으로만 응답해주세요:

{
  "foods": [
    {
      "name": "음식 이름",
      "calories": 칼로리,
      "amount": "분량",
      "confidence": 0.8
    }
  ],
  "total_calories": 총칼로리,
  "meal_type": "snack",
  "analysis_confidence": 0.8,
  "analyzed_at": "${new Date().toISOString()}"
}

이미지에 음식이 보이면 반드시 foods 배열에 적어도 하나는 포함해주세요.
JSON 외의 다른 텍스트는 포함하지 마세요.
`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const userAgent = getUserAgent(request);
  let user = null;

  try {
    // 1. 환경 변수 검증 (AI 기능용)
    const envValidation = validateAIEnvironmentVariables();
    if (!envValidation.isValid) {
      throw new Error(`환경 변수 누락: ${envValidation.errors.join(', ')}`);
    }

    // 2. Rate limiting 체크
    const rateLimitResult = await checkRateLimit(rateLimiters.general, clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': Math.ceil((rateLimitResult.retryAfter || 60000) / 1000).toString()
          }
        }
      );
    }

    // 3. 인증 토큰 검증
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      );
    }

    user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 4. Storage 연결 확인 및 초기화
    const storageConnection = await checkStorageConnection();
    if (!storageConnection.success) {
      console.log('Storage bucket이 없어서 초기화 시도...');
      const initResult = await initializeStorageBucket();
      if (!initResult.success) {
        console.error('Storage 초기화 실패:', initResult.error);
        // Storage 실패는 로그만 남기고 계속 진행 (분석은 가능)
      }
    }

    // 5. FormData 파싱
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const saveToHistory = formData.get('save_to_history') === 'true';
    const saveImages = formData.get('save_images') === 'true'; // 이미지 저장 여부 (선택사항)

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: '이미지 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 6. 이미지 Buffer 변환
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 7. 이미지 기본 검증
    const sizeValidation = validateImageSize(imageBuffer);
    if (!sizeValidation) {
      return NextResponse.json(
        { success: false, error: '파일 크기가 너무 큽니다. 10MB 이하의 파일을 업로드해주세요.' },
        { status: 400 }
      );
    }

    const formatValidation = validateImageFormat(imageBuffer);
    if (!formatValidation) {
      return NextResponse.json(
        { success: false, error: '지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP 파일을 사용해주세요.' },
        { status: 400 }
      );
    }

    // 8. 이미지 무결성 검증
    const integrityValidation = await validateImageIntegrity(imageBuffer);
    if (!integrityValidation) {
      return NextResponse.json(
        { success: false, error: '손상된 이미지 파일입니다. 다른 파일을 사용해주세요.' },
        { status: 400 }
      );
    }

    // 9. 이미지 해시 계산 (중복 검사용)
    const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    
    // 10. 이미지 처리 (AI 분석용 + 저장용)
    const memoryBefore = getMemoryUsage();
    const processedImages = await processImageForAI(imageBuffer);
    const memoryAfter = getMemoryUsage();
    const compressionRatio = calculateCompressionRatio(imageBuffer.length, processedImages.analysis.size);

    logSecurityEvent('IMAGE_PROCESSED', {
      userId: user.id,
      imageHash,
      originalSize: imageBuffer.length,
      compressionRatio,
      memoryUsage: memoryAfter.heapUsed - memoryBefore.heapUsed,
      clientIP,
      userAgent
    });

    // 11. Google Gemini API 호출
    const analysisResult = await analyzeImageWithGemini(processedImages);

    // 12. 이미지 저장 (선택사항)
    let uploadResult;
    if (saveImages) {
      try {
        uploadResult = await uploadProcessedImages(processedImages, user.id);
        if (!uploadResult.success) {
          console.error('Image upload failed:', uploadResult.error);
          // 업로드 실패는 로그만 남기고 계속 진행
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // 업로드 에러는 무시하고 계속 진행
      }
    }

    // 13. 분석 결과 히스토리 저장 (선택사항)
    let mealId;
    if (saveToHistory) {
      try {
        // **ADD MEAL VALIDATION BEFORE SAVING**
        const mealType = (analysisResult.meal_type as MealType) || 'snack'; // 기본값으로 스낵 설정
        const validationResult = await validateMealUpload(
          user.id,
          mealType,
          new Date()
        );

        if (!validationResult.isValid) {
          // 검증 실패 시 상세한 에러 정보 반환
          const errorDetails = {
            timeValidation: validationResult.timeValidation,
            duplicateValidation: validationResult.duplicateValidation,
            canProceed: validationResult.canProceed
          };

          logSecurityEvent('MEAL_VALIDATION_FAILED', {
            userId: user.id,
            imageHash,
            mealType: analysisResult.meal_type,
            validationResult: errorDetails,
            clientIP,
            userAgent
          });

          return NextResponse.json({
            success: false,
            error: validationResult.message,
            validation: {
              timeValidation: {
                isValid: validationResult.timeValidation.isValid,
                message: validationResult.timeValidation.message,
                allowedMealTypes: validationResult.timeValidation.allowedMealTypes,
                currentMealType: validationResult.timeValidation.currentMealType,
                restrictionReason: validationResult.timeValidation.restrictionReason
              },
              duplicateValidation: {
                isDuplicate: validationResult.duplicateValidation.isDuplicate,
                message: validationResult.duplicateValidation.message,
                existingMeal: validationResult.duplicateValidation.existingMeal
              }
            },
            analysis: analysisResult // 분석 결과는 여전히 제공
          }, { 
            status: 422, // Unprocessable Entity - 요청은 유효하지만 규칙 위반
            headers: {
              'X-Validation-Failed': 'true',
              'X-Validation-Type': !validationResult.timeValidation.isValid ? 'time' : 'duplicate'
            }
          });
        }

        // 검증 성공 시 기존 저장 로직 진행
        const saveResult = await saveMealAnalysis(
          user.id, 
          analysisResult, 
          uploadResult, 
          imageHash
        );
        if (saveResult.success) {
          mealId = saveResult.mealId;
          
          // 검증 성공 로깅
          logSecurityEvent('MEAL_VALIDATION_SUCCESS', {
            userId: user.id,
            imageHash,
            mealId,
            mealType: analysisResult.meal_type,
            validationResult: {
              timeValid: validationResult.timeValidation.isValid,
              duplicateValid: !validationResult.duplicateValidation.isDuplicate
            },
            clientIP,
            userAgent
          });
        } else {
          console.error('Failed to save meal analysis:', saveResult.error);
        }
      } catch (saveError) {
        console.error('Save meal analysis error:', saveError);
        // 저장 실패는 로그만 남기고 계속 진행
      }
    }

    // 14. 성공 로깅
    logSecurityEvent('MEAL_ANALYSIS_SUCCESS', {
      userId: user.id,
      imageHash,
      mealId,
      totalCalories: analysisResult.total_calories,
      analysisConfidence: analysisResult.analysis_confidence,
      processingTime: Date.now() - startTime,
      savedToHistory: saveToHistory,
      savedImages: saveImages,
      clientIP,
      userAgent
    });

    // 15. 응답 반환
    const response: FoodAnalysisResponse = {
      success: true,
      data: analysisResult,
      message: '음식 분석이 완료되었습니다.'
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Processing-Time': (Date.now() - startTime).toString(),
        'X-Analysis-Confidence': analysisResult.analysis_confidence.toString(),
        'X-Total-Calories': analysisResult.total_calories.toString(),
        ...(mealId && { 'X-Meal-ID': mealId }),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 에러 로깅
    logSecurityEvent('MEAL_ANALYSIS_ERROR', {
      userId: user?.id || 'unknown',
      error: errorMessage,
      processingTime,
      clientIP,
      userAgent
    });

    console.error('Meal analysis error:', error);

    // 에러 응답
    return NextResponse.json(
      { 
        success: false, 
        error: '음식 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { 
        status: 500,
        headers: {
          'X-Processing-Time': processingTime.toString()
        }
      }
    );
  }
}

/**
 * Gemini API 호출 (개선된 재시도 로직 포함)
 */
async function analyzeImageWithGemini(
  processedImage: ImageProcessingResult,
  retryCount: number = 0
): Promise<FoodAnalysisResult> {
  const maxRetries = 3; // 증가된 재시도 횟수
  
  try {
    const genAI = initializeGeminiClient();
    
    // 모델 설정 최적화
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.1, // 일관성 향상을 위해 낮은 temperature
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 1024, // 적절한 토큰 수 제한
      },
    });

    // Gemini API 요청 구성 (수정된 형식)
    const imagePart = {
      inlineData: {
        data: processedImage.analysis.base64!,
        mimeType: `image/${processedImage.analysis.format}`
      }
    };

    // 올바른 Gemini API 형식으로 수정
    const prompt = [
      { text: KOREAN_FOOD_ANALYSIS_PROMPT },
      imagePart
    ];

    // 디버깅: 이미지 정보 확인
    console.log('=== 이미지 정보 디버깅 ===');
    console.log('이미지 형식:', processedImage.analysis.format);
    console.log('이미지 크기:', processedImage.analysis.size);
    console.log('Base64 길이:', processedImage.analysis.base64?.length);
    console.log('MIME 타입:', `image/${processedImage.analysis.format}`);
    console.log('========================');

    // API 호출 (개선된 타임아웃 설정)
    const timeoutMs = Math.min(CONFIG.apiTimeout + (retryCount * 5000), 45000); // 점진적 타임아웃 증가
    
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('API call timeout')), timeoutMs)
      )
    ]);

    if (!result.response) {
      throw new Error('Gemini API 응답이 없습니다.');
    }

    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini API 텍스트 응답이 없습니다.');
    }

    // 디버깅: Gemini 원시 응답 확인
    console.log('=== Gemini 원시 응답 ===');
    console.log('텍스트 길이:', text.length);
    console.log('원시 텍스트:', text);
    console.log('======================');

    // JSON 파싱
    let rawJsonData: any;
    try {
      // JSON 응답에서 불필요한 문자 제거
      const cleanedText = text
        .replace(/```json\n?|\n?```/g, '')
        .replace(/^[^{]*/, '') // JSON 시작 전 텍스트 제거
        .replace(/[^}]*$/, '') // JSON 끝 후 텍스트 제거
        .trim();
      
      rawJsonData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON 파싱 실패:', text);
      console.error('파싱 에러:', parseError);
      throw new Error('AI 응답을 파싱할 수 없습니다.');
    }

    // 디버깅: 실제 Gemini 응답 확인
    console.log('=== Gemini API 실제 응답 ===');
    console.log('rawJsonData:', JSON.stringify(rawJsonData, null, 2));
    console.log('foods 배열:', rawJsonData.foods);
    console.log('foods 길이:', rawJsonData.foods ? rawJsonData.foods.length : 'undefined');
    console.log('===========================');

    // 개선된 응답 처리기를 사용한 검증 및 정제
    const imageHash = crypto.createHash('md5').update(processedImage.analysis.base64!).digest('hex');
    const validationResult = responseProcessor.validateAndProcessResponse(
      rawJsonData,
      imageHash,
      Date.now() - 5000, // 시작 시간 (대략적)
      retryCount,
      false // 실제 AI 응답
    );

    if (!validationResult.isValid) {
      console.error('응답 검증 실패:', validationResult.errors);
      throw new Error(`응답 검증 실패: ${validationResult.errors.join(', ')}`);
    }

    // 경고 로그 출력
    if (validationResult.warnings.length > 0) {
      console.warn('⚠️  응답 처리 경고:', validationResult.warnings);
    }

    return validationResult.corrected_data as FoodAnalysisResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 재시도 로직 개선
    if (retryCount < maxRetries) {
      const isRetryable = (
        errorMessage.includes('timeout') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('503') ||
        errorMessage.includes('502') ||
        errorMessage.includes('500')
      );

      if (isRetryable) {
        console.log(`🔄 API 호출 재시도 ${retryCount + 1}/${maxRetries}:`, errorMessage);
        
        // 지수 백오프 대기 (개선된 대기 시간)
        const baseDelay = errorMessage.includes('overloaded') ? 5000 : 2000;
        const delay = baseDelay * Math.pow(1.5, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return analyzeImageWithGemini(processedImage, retryCount + 1);
      }
    }
    
         // Google API 할당량 초과시 개선된 Mock 데이터 반환
     if (process.env.NODE_ENV === 'development' && 
         (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('exceeded'))) {
       console.warn('⚠️  Google API 할당량 초과 - 개선된 Mock 데이터 반환');
       
       // 더 다양한 Mock 데이터 세트
       const mockDataSets = [
         {
           foods: [
             { name: "김치찌개", calories: 280, amount: "1인분 (약 200g)", confidence: 0.85 },
             { name: "흰쌀밥", calories: 210, amount: "1공기 (약 150g)", confidence: 0.90 },
             { name: "배추김치", calories: 25, amount: "적당량 (약 50g)", confidence: 0.88 }
           ],
           total_calories: 515,
           meal_type: "lunch" as const
         },
         {
           foods: [
             { name: "된장찌개", calories: 120, amount: "1그릇 (약 250ml)", confidence: 0.82 },
             { name: "현미밥", calories: 190, amount: "1공기 (약 150g)", confidence: 0.92 },
             { name: "시금치나물", calories: 35, amount: "반찬 (약 80g)", confidence: 0.75 },
             { name: "계란말이", calories: 180, amount: "2조각 (약 100g)", confidence: 0.88 }
           ],
           total_calories: 525,
           meal_type: "dinner" as const
         },
         {
           foods: [
             { name: "토스트", calories: 150, amount: "1장", confidence: 0.90 },
             { name: "딸기잼", calories: 80, amount: "1스푼 (약 20g)", confidence: 0.85 },
             { name: "우유", calories: 130, amount: "1컵 (200ml)", confidence: 0.95 }
           ],
           total_calories: 360,
           meal_type: "breakfast" as const
         }
       ];
       
       const randomMockData = mockDataSets[Math.floor(Math.random() * mockDataSets.length)];
       
       // Mock 데이터도 응답 처리기를 통해 처리
       const imageHash = crypto.createHash('md5').update(processedImage.analysis.base64!).digest('hex');
       const validationResult = responseProcessor.validateAndProcessResponse(
         randomMockData,
         imageHash,
         Date.now() - 2000, // Mock 데이터는 처리 시간이 짧음
         retryCount,
         true // Mock 데이터임을 표시
       );
       
       return validationResult.corrected_data as FoodAnalysisResult;
     }

    // 최종 에러 발생
    console.error('Gemini API 호출 실패 (재시도 완료):', error);
    throw new Error(`AI 분석 실패: ${errorMessage}`);
  }
}

// GET 요청 핸들러 (지원되지 않음)
export async function GET() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed',
      message: 'POST 요청만 지원됩니다' 
    } as FoodAnalysisResponse,
    { status: 405 }
  );
} 