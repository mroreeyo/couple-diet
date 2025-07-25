// Google Gemini Pro Vision API 기반 음식 분석 타입 정의

export interface FoodItem {
  name: string
  amount: string
  calories: number
  confidence: number
}

export interface FoodAnalysisResult {
  total_calories: number
  meal_type: string | null
  analysis_confidence: number
  foods: FoodItem[]
  image_url?: string
  thumbnail_url?: string
  analyzed_at?: string
  nutritional_info?: {
    [key: string]: number | string
  }
  metadata?: {
    processing_time_ms?: number;
    model_version?: string;
    image_quality_score?: number;
    detected_objects?: number;
    retry_count?: number;
    is_mock_data?: boolean;
    request_id?: string;
    api_version?: string;
    cache_hit?: boolean;
    rate_limit_remaining?: number;
  }
}

export interface FoodAnalysisResponse {
  success: boolean;
  data?: FoodAnalysisResult;
  error?: string;
  message?: string;
  // 추가된 응답 메타데이터
  response_metadata?: {
    request_id: string;
    processing_time_ms: number;
    api_version: string;
    cached?: boolean;
    rate_limit_remaining?: number;
    quota_used?: number;
  };
}

export interface FoodAnalysisRequest {
  image: File | Buffer;
  user_id: string;
  save_to_history?: boolean;
  save_images?: boolean;
  // 추가된 요청 옵션
  options?: {
    detail_level?: 'basic' | 'detailed' | 'comprehensive';
    include_nutrition?: boolean;
    preferred_language?: 'ko' | 'en';
  };
}

// 개선된 에러 타입
export interface FoodAnalysisError {
  code: 'INVALID_IMAGE' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_FORMAT' | 
        'API_QUOTA_EXCEEDED' | 'API_TIMEOUT' | 'PROCESSING_FAILED' | 
        'AUTHENTICATION_FAILED' | 'RATE_LIMIT_EXCEEDED' | 'UNKNOWN_ERROR';
  message: string;
  details?: {
    suggestion?: string;
    retry_after_ms?: number;
    max_file_size?: number;
    supported_formats?: string[];
  };
}

// 성능 메트릭 타입
export interface PerformanceMetrics {
  start_time: number;
  end_time: number;
  total_duration_ms: number;
  stages: {
    validation_ms: number;
    image_processing_ms: number;
    ai_analysis_ms: number;
    response_processing_ms: number;
    storage_ms?: number;
  };
  memory_usage?: {
    before_mb: number;
    after_mb: number;
    peak_mb?: number;
  };
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

// 데이터베이스 저장용 타입 (확장됨)
export interface MealAnalysisRecord {
  id: string;
  user_id: string;
  analysis_result: FoodAnalysisResult;
  total_calories: number;
  meal_type: string;
  image_hash?: string;
  processing_time?: number;
  image_size?: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

// 설정 타입
export interface FoodAnalysisConfig {
  maxFileSize: number; // bytes
  allowedFormats: string[];
  confidenceThreshold: number;
  apiTimeout: number; // ms
  retryAttempts: number;
  // 추가된 성능 설정
  performance?: {
    enableMetrics: boolean;
    enableCaching: boolean;
    cacheExpiryMs: number;
    maxConcurrentRequests: number;
  };
}

// 캐시 관련 타입
export interface AnalysisCache {
  image_hash: string;
  result: FoodAnalysisResult;
  cached_at: string;
  expires_at: string;
  hit_count: number;
}

// 응답 검증 결과 타입
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corrected_data?: Partial<FoodAnalysisResult>;
} 