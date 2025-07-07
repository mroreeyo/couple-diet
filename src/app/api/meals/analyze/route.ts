import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import { 
  checkRateLimit, 
  rateLimiters,
  getClientIP,
  getUserAgent,
  logSecurityEvent,
  validateEnvironmentVariables 
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
import { 
  FoodAnalysisResponse, 
  FoodAnalysisResult, 
  FoodAnalysisConfig
} from '@/types/food-analysis';

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
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google API Key가 설정되지 않았습니다.');
  }
  return new GoogleGenerativeAI(apiKey);
}

// 한국어 최적화 음식 분석 프롬프트
const KOREAN_FOOD_ANALYSIS_PROMPT = `
당신은 한국 음식 전문 영양 분석가입니다. 제공된 음식 이미지를 분석하여 정확한 칼로리 정보를 제공해주세요.

분석 요구사항:
1. 이미지에서 식별 가능한 모든 음식을 찾아주세요
2. 각 음식의 대략적인 양(그릇, 개, 컵 등)을 추정해주세요
3. 음식별 칼로리를 계산해주세요
4. 전체 식사의 칼로리 총합을 구해주세요
5. 식사 종류(아침/점심/저녁/간식)를 추정해주세요

응답은 반드시 다음 JSON 형식으로만 제공해주세요:

{
  "foods": [
    {
      "name": "음식이름",
      "calories": 칼로리숫자,
      "amount": "분량설명",
      "confidence": 0.0~1.0 신뢰도
    }
  ],
  "total_calories": 총칼로리,
  "meal_type": "breakfast|lunch|dinner|snack",
  "analysis_confidence": 전체분석신뢰도(0.0~1.0),
  "analyzed_at": "${new Date().toISOString()}"
}

주의사항:
- 한국 음식 기준으로 분석해주세요
- 칼로리는 일반적인 한국인 기준으로 계산해주세요
- 불확실한 음식은 낮은 신뢰도로 표시해주세요
- JSON 형식 외의 다른 텍스트는 포함하지 마세요
`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const userAgent = getUserAgent(request);
  let user = null;

  try {
    // 1. 환경 변수 검증
    const envValidation = validateEnvironmentVariables();
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
        const saveResult = await saveMealAnalysis(
          user.id, 
          analysisResult, 
          uploadResult, 
          imageHash
        );
        if (saveResult.success) {
          mealId = saveResult.mealId;
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
 * Gemini API 호출 (재시도 로직 포함)
 */
async function analyzeImageWithGemini(
  processedImage: ImageProcessingResult,
  retryCount: number = 0
): Promise<FoodAnalysisResult> {
  try {
    const genAI = initializeGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    // Gemini API 요청 구성
    const imagePart = {
      inlineData: {
        data: processedImage.analysis.base64!,
        mimeType: `image/${processedImage.analysis.format}`
      }
    };

    const prompt = [KOREAN_FOOD_ANALYSIS_PROMPT, imagePart];

    // API 호출 (타임아웃 설정)
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('API call timeout')), CONFIG.apiTimeout)
      )
    ]);

    if (!result.response) {
      throw new Error('Gemini API 응답이 없습니다.');
    }

    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini API 텍스트 응답이 없습니다.');
    }

    // JSON 파싱 및 검증
    let jsonData: FoodAnalysisResult;
    try {
      // JSON 응답에서 코드 블록 제거
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      jsonData = JSON.parse(cleanedText);
    } catch {
      console.error('JSON 파싱 실패:', text);
      throw new Error('AI 응답을 파싱할 수 없습니다.');
    }

    // 응답 데이터 검증 및 정리
    if (!jsonData.foods || !Array.isArray(jsonData.foods)) {
      throw new Error('올바르지 않은 음식 데이터 형식입니다.');
    }

    // 신뢰도 기반 필터링
    const filteredFoods = jsonData.foods
      .filter((food: unknown) => {
        if (typeof food === 'object' && food !== null && 'confidence' in food) {
          const foodItem = food as { confidence: number };
          return foodItem.confidence >= CONFIG.confidenceThreshold;
        }
        return false;
      })
      .map((food: unknown) => {
        const foodItem = food as { name: string; calories: number; amount: string; confidence: number };
        return {
          name: foodItem.name || '알 수 없는 음식',
          calories: Math.max(0, Math.round(foodItem.calories || 0)),
          amount: foodItem.amount || '적당량',
          confidence: Math.min(1, Math.max(0, foodItem.confidence || 0))
        };
      });

    if (filteredFoods.length === 0) {
      throw new Error('신뢰도가 충분한 음식을 찾을 수 없습니다.');
    }

    // 총 칼로리 재계산
    const totalCalories = filteredFoods.reduce((sum, food) => sum + food.calories, 0);

    const finalResult: FoodAnalysisResult = {
      foods: filteredFoods,
      total_calories: totalCalories,
      meal_type: jsonData.meal_type || undefined,
      analysis_confidence: Math.min(1, Math.max(0, jsonData.analysis_confidence || 0)),
      analyzed_at: new Date().toISOString()
    };

    return finalResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 재시도 로직
    if (retryCount < CONFIG.retryAttempts && !errorMessage.includes('timeout')) {
      console.log(`Retrying Gemini API call (${retryCount + 1}/${CONFIG.retryAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return analyzeImageWithGemini(processedImage, retryCount + 1);
    }

    throw new Error(`음식 분석 실패: ${errorMessage}`);
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