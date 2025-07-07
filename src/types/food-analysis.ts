// Google Gemini Pro Vision API 기반 음식 분석 타입 정의

export interface FoodItem {
  name: string;
  calories: number;
  amount: string;
  confidence: number;
}

export interface FoodAnalysisResult {
  foods: FoodItem[];
  total_calories: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  analysis_confidence: number;
  analyzed_at: string;
}

export interface FoodAnalysisResponse {
  success: boolean;
  data?: FoodAnalysisResult;
  error?: string;
  message?: string;
}

export interface FoodAnalysisRequest {
  image: File | Buffer;
  user_id: string;
  save_to_history?: boolean;
}

// Gemini API 관련 타입
export interface GeminiImagePart {
  inlineData: {
    data: string; // Base64 encoded image
    mimeType: string;
  };
}

export interface GeminiTextPart {
  text: string;
}

export interface GeminiRequest {
  contents: Array<{
    parts: Array<GeminiImagePart | GeminiTextPart>;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
}

// 데이터베이스 저장용 타입
export interface MealAnalysisRecord {
  id?: string;
  user_id: string;
  analysis_result: FoodAnalysisResult;
  total_calories: number;
  meal_type: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

// 에러 타입
export interface FoodAnalysisError {
  code: string;
  message: string;
  details?: unknown;
}

// 설정 타입
export interface FoodAnalysisConfig {
  maxFileSize: number; // bytes
  allowedFormats: string[];
  confidenceThreshold: number;
  apiTimeout: number; // ms
  retryAttempts: number;
} 