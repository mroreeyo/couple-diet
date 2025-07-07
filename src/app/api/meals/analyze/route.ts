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
import { supabase } from '@/lib/supabase';
import { 
  processImageForAI,
  validateImageFormat,
  validateImageSize,
  validateImageIntegrity,
  cacheManager,
  getMemoryUsage,
  calculateCompressionRatio,
  ImageProcessingResult
} from '@/lib/image-processor';
import { 
  FoodAnalysisResponse, 
  FoodAnalysisResult, 
  FoodAnalysisConfig,
  MealAnalysisRecord 
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
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

// 한국어 최적화 프롬프트
const KOREAN_FOOD_ANALYSIS_PROMPT = `
당신은 한국 음식 전문가입니다. 업로드된 음식 이미지를 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

1. 이미지에서 식별할 수 있는 모든 음식을 나열하세요
2. 각 음식의 대략적인 칼로리를 계산하세요
3. 각 음식의 분량을 추정하세요 (예: 1인분, 100g, 1개 등)
4. 각 식별에 대한 신뢰도를 0-1 사이의 값으로 표시하세요
5. 전체 식사의 타입을 추정하세요 (아침, 점심, 저녁, 간식)

다음과 같은 JSON 형식으로 정확히 응답해주세요:
{
  "foods": [
    {
      "name": "음식 이름",
      "calories": 칼로리_숫자,
      "amount": "분량 설명",
      "confidence": 신뢰도_0에서1사이
    }
  ],
  "total_calories": 총칼로리_숫자,
  "meal_type": "breakfast|lunch|dinner|snack",
  "analysis_confidence": 전체분석신뢰도_0에서1사이
}

주의사항:
- 한국 음식의 특성을 고려하여 정확한 칼로리를 계산하세요
- 반찬류도 포함하여 분석하세요
- 불확실한 경우 confidence 값을 낮게 설정하세요
- 음식이 명확하지 않은 경우 "확인불가"로 표시하고 confidence를 0.3 이하로 설정하세요
`;

/**
 * 파일에서 이미지 추출
 */
async function extractImageFromFormData(request: NextRequest): Promise<Buffer> {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      throw new Error('No image file found in form data');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Only image files are allowed.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 기본 파일 크기 검증
    if (!validateImageSize(buffer, CONFIG.maxFileSize)) {
      throw new Error(`File size exceeds maximum limit of ${CONFIG.maxFileSize / (1024 * 1024)}MB`);
    }

    // 파일 형식 검증
    if (!validateImageFormat(buffer, CONFIG.allowedFormats)) {
      throw new Error(`Unsupported image format. Allowed formats: ${CONFIG.allowedFormats.join(', ')}`);
    }

    // 이미지 무결성 검증
    const isValid = await validateImageIntegrity(buffer);
    if (!isValid) {
      throw new Error('Corrupted or invalid image file');
    }

    return buffer;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to extract image from form data');
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
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API call timeout')), CONFIG.apiTimeout)
      )
    ]);

    if (!result || typeof result !== 'object' || !('response' in result)) {
      throw new Error('Invalid response from Gemini API');
    }

    // 타입 assertion을 더 구체적으로 변경
    const response = (result as { response: { text(): string } }).response;
    const text = response.text();
    
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    // JSON 파싱
    let parsedResult: FoodAnalysisResult;
    try {
      // JSON 응답에서 코드 블록 제거
      const cleanText = text.replace(/```json\s*|\s*```/g, '').trim();
      const jsonData = JSON.parse(cleanText);
      
      // 응답 구조 검증
      if (!jsonData.foods || !Array.isArray(jsonData.foods)) {
        throw new Error('Invalid response structure: missing foods array');
      }

      // Food 타입 정의
      interface RawFoodItem {
        name?: string;
        calories?: number | string;
        amount?: string;
        confidence?: number | string;
      }

      parsedResult = {
        foods: jsonData.foods.map((food: RawFoodItem) => ({
          name: food.name || '알 수 없음',
          calories: Number(food.calories) || 0,
          amount: food.amount || '알 수 없음',
          confidence: Number(food.confidence) || 0
        })),
        total_calories: Number(jsonData.total_calories) || 0,
        meal_type: jsonData.meal_type || undefined,
        analysis_confidence: Number(jsonData.analysis_confidence) || 0,
        analyzed_at: new Date().toISOString()
      };

      // 신뢰도 필터링
      parsedResult.foods = parsedResult.foods.filter(food => 
        food.confidence >= CONFIG.confidenceThreshold
      );

      // 총 칼로리 재계산
      parsedResult.total_calories = parsedResult.foods.reduce(
        (sum, food) => sum + food.calories, 0
      );

    } catch (parseError) {
      throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    return parsedResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 재시도 로직
    if (retryCount < CONFIG.retryAttempts) {
      console.log(`Retrying Gemini API call (${retryCount + 1}/${CONFIG.retryAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 점진적 백오프
      return analyzeImageWithGemini(processedImage, retryCount + 1);
    }

    throw new Error(`Gemini API analysis failed: ${errorMessage}`);
  }
}

/**
 * 분석 결과를 데이터베이스에 저장
 */
async function saveAnalysisResult(
  userId: string,
  analysisResult: FoodAnalysisResult,
  processedImage: ImageProcessingResult
): Promise<void> {
  try {
    const record: MealAnalysisRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      image_hash: processedImage.originalHash,
      analysis_result: analysisResult,
      processing_time: processedImage.processingTime,
      image_size: processedImage.analysis.size,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('meal_analysis')
      .insert([record]);

    if (error) {
      console.error('Failed to save analysis result:', error);
      throw new Error('Failed to save analysis result to database');
    }
  } catch (error) {
    console.error('Database save error:', error);
    // 데이터베이스 저장 실패는 치명적이지 않으므로 로깅만 하고 계속 진행
  }
}

/**
 * 메인 POST 핸들러
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const userAgent = getUserAgent(request);
  
  try {
    // 환경 변수 검증
    validateEnvironmentVariables();

    // Rate limiting 체크
    const rateLimitResult = await checkRateLimit(rateLimiters.general, clientIP);
    if (!rateLimitResult.allowed) {
      await logSecurityEvent('rate_limit_exceeded', {
        ip: clientIP,
        userAgent,
        endpoint: '/api/meals/analyze',
        retryAfter: rateLimitResult.retryAfter
      });
      
      return NextResponse.json({
        success: false,
        error: 'too_many_requests',
        message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + (rateLimitResult.retryAfter || 60000))
        }
      });
    }

    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'unauthorized',
        message: '인증이 필요합니다.'
      }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'invalid_token',
        message: '유효하지 않은 토큰입니다.'
      }, { status: 401 });
    }

    // 메모리 사용량 모니터링
    const memoryBefore = getMemoryUsage();
    
    // 이미지 추출 및 처리
    const imageBuffer = await extractImageFromFormData(request);
    const originalSize = imageBuffer.length;
    
    // 고도화된 이미지 처리
    const processedImage = await processImageForAI(imageBuffer);
    
    // 압축률 계산
    const compressionRatio = calculateCompressionRatio(originalSize, processedImage.analysis.size);
    
    console.log(`Image processing stats:
      - Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB
      - Processed size: ${(processedImage.analysis.size / 1024 / 1024).toFixed(2)}MB
      - Compression ratio: ${compressionRatio.toFixed(1)}%
      - Processing time: ${processedImage.processingTime}ms
      - Cache stats: ${JSON.stringify(cacheManager.getStats())}
    `);

    // AI 분석 수행
    const analysisResult = await analyzeImageWithGemini(processedImage);
    
    // 메모리 사용량 체크
    const memoryAfter = getMemoryUsage();
    const memoryUsed = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    // 분석 결과 저장 (선택적)
    const saveToHistory = request.nextUrl.searchParams.get('save_to_history') === 'true';
    if (saveToHistory) {
      await saveAnalysisResult(user.id, analysisResult, processedImage);
    }

    // 성공 로깅
    await logSecurityEvent('meal_analysis_success', {
      userId: user.id,
      ip: clientIP,
      userAgent,
      processingTime: processedImage.processingTime,
      originalSize,
      processedSize: processedImage.analysis.size,
      compressionRatio,
      memoryUsed,
      totalCalories: analysisResult.total_calories,
      foodsCount: analysisResult.foods.length,
      analysisConfidence: analysisResult.analysis_confidence
    });

    const response: FoodAnalysisResponse = {
      success: true,
      data: analysisResult,
      message: '음식 분석이 완료되었습니다.'
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': String(Date.now() - startTime),
        'X-Image-Hash': processedImage.originalHash,
        'X-Compression-Ratio': String(compressionRatio.toFixed(1))
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // 에러 로깅
    await logSecurityEvent('meal_analysis_error', {
      ip: clientIP,
      userAgent,
      endpoint: '/api/meals/analyze',
      error: errorMessage,
      processingTime: Date.now() - startTime
    });

    // 구체적인 에러 응답
    let statusCode = 500;
    let errorCode = 'internal_error';
    let userMessage = '음식 분석 중 오류가 발생했습니다.';

    if (errorMessage.includes('No image file found') || 
        errorMessage.includes('Invalid file type') ||
        errorMessage.includes('Unsupported image format')) {
      statusCode = 400;
      errorCode = 'invalid_image';
      userMessage = '올바른 이미지 파일을 업로드해주세요.';
    } else if (errorMessage.includes('File size exceeds')) {
      statusCode = 413;
      errorCode = 'file_too_large';
      userMessage = '파일 크기가 너무 큽니다. 10MB 이하의 파일을 업로드해주세요.';
    } else if (errorMessage.includes('Corrupted or invalid')) {
      statusCode = 400;
      errorCode = 'corrupted_image';
      userMessage = '손상된 이미지 파일입니다. 다른 파일을 사용해주세요.';
    } else if (errorMessage.includes('API call timeout') || 
               errorMessage.includes('Gemini API analysis failed')) {
      statusCode = 503;
      errorCode = 'service_unavailable';
      userMessage = '분석 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
    }

    const response: FoodAnalysisResponse = {
      success: false,
      error: errorCode,
      message: userMessage
    };

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': String(Date.now() - startTime)
      }
    });
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