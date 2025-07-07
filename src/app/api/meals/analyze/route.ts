import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
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
let genAI: GoogleGenerativeAI | null = null;

function initializeGeminiAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// 이미지 전처리 함수
async function preprocessImage(imageBuffer: Buffer): Promise<{ data: string; mimeType: string }> {
  try {
    // 이미지를 1024x1024로 리사이즈, 90% 품질 유지, JPEG로 변환
    const processedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 90,
        progressive: true 
      })
      .toBuffer();

    // Base64 인코딩
    const base64Data = processedBuffer.toString('base64');
    
    return {
      data: base64Data,
      mimeType: 'image/jpeg'
    };
  } catch (error) {
    throw new Error(`Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Gemini API 호출 함수
async function analyzeWithGemini(imageData: string, mimeType: string): Promise<FoodAnalysisResult> {
  const genAI = initializeGeminiAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

  const prompt = `이 음식 이미지를 정확히 분석하여 다음 정보를 JSON 형식으로 제공해주세요:

1. 식별된 각 음식의 이름 (한국어)
2. 각 음식의 예상 칼로리 (kcal) - 정확한 영양학적 데이터 기반
3. 각 음식의 분량 (예: 1공기, 1그릇, 100g, 1인분)
4. 각 음식 인식의 확신도 (0.0-1.0, 소수점 둘째자리)
5. 전체 분석의 신뢰도 (0.0-1.0, 소수점 둘째자리)
6. 식사 타입 추정 (breakfast/lunch/dinner/snack)

응답은 반드시 다음 JSON 형식으로만 제공하고, 다른 텍스트는 포함하지 마세요:

{
  "foods": [
    {
      "name": "음식이름",
      "calories": 숫자,
      "amount": "분량",
      "confidence": 0.00
    }
  ],
  "total_calories": 숫자,
  "analysis_confidence": 0.00,
  "meal_type": "breakfast|lunch|dinner|snack"
}

주의사항:
- 칼로리는 일반적인 1인분 기준으로 계산
- 한국 음식의 경우 한국인 식단 기준 적용
- 확신도가 0.7 미만인 음식은 제외
- 분량은 구체적이고 이해하기 쉽게 표현`;

  try {
    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // JSON 파싱 시도
    let parsedResult;
    try {
      // 응답에서 JSON 부분만 추출 (```json 태그 제거)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      parsedResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError}`);
    }

    // 응답 검증 및 변환
    const analysisResult: FoodAnalysisResult = {
      foods: parsedResult.foods || [],
      total_calories: parsedResult.total_calories || 0,
      meal_type: parsedResult.meal_type || 'snack',
      analysis_confidence: parsedResult.analysis_confidence || 0,
      analyzed_at: new Date().toISOString()
    };

    // 신뢰도 필터링
    analysisResult.foods = analysisResult.foods.filter(
      (food: { confidence: number }) => food.confidence >= CONFIG.confidenceThreshold
    );

    // 총 칼로리 재계산 (필터링 후)
    analysisResult.total_calories = analysisResult.foods.reduce(
      (sum: number, food: { calories: number }) => sum + (food.calories || 0), 
      0
    );

    return analysisResult;

  } catch (error) {
    throw new Error(`Gemini API analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 분석 결과 저장 함수 (선택적)
async function saveAnalysisResult(
  userId: string, 
  analysisResult: FoodAnalysisResult
): Promise<void> {
  try {
    const record: Omit<MealAnalysisRecord, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      analysis_result: analysisResult,
      total_calories: analysisResult.total_calories,
      meal_type: analysisResult.meal_type || 'snack'
    };

    const { error } = await supabase
      .from('meals')
      .insert([record]);

    if (error) {
      console.error('Failed to save analysis result:', error);
      // 저장 실패는 전체 요청을 실패시키지 않음
    }
  } catch (error) {
    console.error('Error saving analysis result:', error);
  }
}

// POST 요청 핸들러
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const userAgent = getUserAgent(request);

  try {
    // 환경 변수 검증
    validateEnvironmentVariables();

    // Rate limiting 체크 - general limiter 사용
    const rateLimitResult = await checkRateLimit(rateLimiters.general, clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded',
          message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' 
        } as FoodAnalysisResponse,
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.retryAfter || 60000) / 1000))
          }
        }
      );
    }

    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader || null);

    if (!token) {
      await logSecurityEvent('food_analysis_unauthorized_attempt', {
        ip: clientIP,
        userAgent,
        reason: 'No token provided'
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: '인증이 필요합니다' 
        } as FoodAnalysisResponse,
        { status: 401 }
      );
    }

    // 토큰에서 사용자 정보 추출
    const user = await getUserFromToken(token);
    if (!user) {
      await logSecurityEvent('food_analysis_invalid_token', {
        ip: clientIP,
        userAgent,
        token: token.substring(0, 10) + '...'
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid token',
          message: '유효하지 않은 토큰입니다' 
        } as FoodAnalysisResponse,
        { status: 401 }
      );
    }

    // FormData에서 이미지 추출
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No image provided',
          message: '이미지 파일이 필요합니다' 
        } as FoodAnalysisResponse,
        { status: 400 }
      );
    }

    // 파일 검증
    if (!CONFIG.allowedFormats.includes(imageFile.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid file format',
          message: 'JPEG, PNG, WebP 형식만 지원됩니다' 
        } as FoodAnalysisResponse,
        { status: 400 }
      );
    }

    if (imageFile.size > CONFIG.maxFileSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File too large',
          message: '파일 크기는 10MB 이하여야 합니다' 
        } as FoodAnalysisResponse,
        { status: 400 }
      );
    }

    // 이미지를 Buffer로 변환
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 이미지 전처리
    const { data: imageData, mimeType } = await preprocessImage(imageBuffer);

    // Gemini API로 분석
    const analysisResult = await analyzeWithGemini(imageData, mimeType);

    // 옵션: 분석 결과 저장
    const saveToHistory = formData.get('save_to_history') === 'true';
    if (saveToHistory) {
      await saveAnalysisResult(user.id, analysisResult);
    }

    // 성공 로그
    await logSecurityEvent('food_analysis_success', {
      userId: user.id,
      ip: clientIP,
      userAgent,
      totalCalories: analysisResult.total_calories,
      foodCount: analysisResult.foods.length,
      confidence: analysisResult.analysis_confidence
    });

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: analysisResult,
      message: '분석이 완료되었습니다'
    } as FoodAnalysisResponse);

  } catch (error: unknown) {
    // 에러 로그
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    await logSecurityEvent('food_analysis_error', {
      ip: clientIP,
      userAgent,
      error: errorMessage,
      stack: errorStack
    });

    console.error('Food analysis error:', error);

    // 에러 응답
    return NextResponse.json(
      { 
        success: false, 
        error: 'Analysis failed',
        message: '분석 중 오류가 발생했습니다. 다시 시도해주세요.' 
      } as FoodAnalysisResponse,
      { status: 500 }
    );
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