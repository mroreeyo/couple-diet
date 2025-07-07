import { NextResponse } from 'next/server'

// API 응답 타입 정의
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 성공 응답 생성
export function createSuccessResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message
  })
}

// 에러 응답 생성
export function createErrorResponse(error: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error
  }, { status })
}

// 입력 검증 유틸리티
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: '비밀번호는 최소 8자 이상이어야 합니다.' }
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: '비밀번호는 대문자를 포함해야 합니다.' }
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: '비밀번호는 소문자를 포함해야 합니다.' }
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: '비밀번호는 숫자를 포함해야 합니다.' }
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: '비밀번호는 특수문자를 포함해야 합니다.' }
  }
  
  return { isValid: true }
}

// 요청 본문 검증
export async function validateRequestBody(request: Request, requiredFields: string[]): Promise<{ isValid: boolean; body?: unknown; error?: string }> {
  try {
    const body = await request.json()
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return { isValid: false, error: `${field} 필드가 필요합니다.` }
      }
    }
    
    return { isValid: true, body }
  } catch {
    return { isValid: false, error: '잘못된 JSON 형식입니다.' }
  }
}

// Supabase 에러 메시지 번역
export function translateSupabaseError(error: string): string {
  const errorMap: { [key: string]: string } = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'User already registered': '이미 가입된 이메일입니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
    'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    'Invalid email': '유효하지 않은 이메일 형식입니다.',
    'Weak password': '비밀번호가 너무 약합니다.',
    'Email rate limit exceeded': '이메일 전송 한도를 초과했습니다.',
    'Invalid credentials': '인증 정보가 올바르지 않습니다.',
    'User not found': '사용자를 찾을 수 없습니다.',
    'Access denied': '접근이 거부되었습니다.',
    'Session expired': '세션이 만료되었습니다.',
    'Invalid session': '유효하지 않은 세션입니다.'
  }
  
  // 에러 메시지에서 키워드 찾기
  for (const [key, translation] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return translation
    }
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}

// API 요청 로깅 (개발용)
export function logApiRequest(method: string, url: string, userAgent: string, ip: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${url}`, {
      userAgent,
      ip,
      timestamp: new Date().toISOString()
    })
  }
}

// API 에러 로깅
export function logApiError(endpoint: string, error: unknown, context?: Record<string, unknown>): void {
  console.error(`[API Error] ${endpoint}:`, {
    error: error instanceof Error ? error.message : String(error),
    context,
    timestamp: new Date().toISOString()
  })
}

// 요청 헤더에서 정보 추출
export function getRequestInfo(request: Request) {
  const userAgent = request.headers.get('user-agent') || 'Unknown'
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'Unknown'
  
  return { userAgent, ip }
}

// Bearer 토큰 추출
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
} 