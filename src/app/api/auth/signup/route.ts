import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validateRequestBody, 
  validateEmail, 
  validatePassword, 
  translateSupabaseError,
  logApiRequest,
  logApiError,
  getRequestInfo
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('POST', '/api/auth/signup', userAgent, ip)
  
  try {
    // 요청 본문 검증
    const validation = await validateRequestBody(request, ['email', 'password'])
    if (!validation.isValid) {
      return createErrorResponse(validation.error!, 400)
    }
    
    const { email, password, displayName } = validation.body
    
    // 이메일 형식 검증
    if (!validateEmail(email)) {
      return createErrorResponse('유효하지 않은 이메일 형식입니다.', 400)
    }
    
    // 비밀번호 강도 검증
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return createErrorResponse(passwordValidation.error!, 400)
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    
    // 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 생략 (개발 단계)
      user_metadata: {
        display_name: displayName || email.split('@')[0]
      }
    })
    
    if (authError) {
      const translatedError = translateSupabaseError(authError.message)
      logApiError('/api/auth/signup', authError, { email, ip })
      return createErrorResponse(translatedError, 400)
    }
    
    if (!authData.user) {
      return createErrorResponse('사용자 생성에 실패했습니다.', 500)
    }
    
    // 사용자 프로필 생성 (이미 trigger로 자동 생성되지만 확인용)
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError) {
      console.warn('Profile creation warning:', profileError)
    }
    
    // 민감한 정보 제거
    const userResponse = {
      id: authData.user.id,
      email: authData.user.email,
      displayName: authData.user.user_metadata?.display_name || displayName || email.split('@')[0],
      createdAt: authData.user.created_at
    }
    
    console.log(`[${new Date().toISOString()}] User created successfully:`, { 
      userId: authData.user.id, 
      email: authData.user.email,
      ip 
    })
    
    return createSuccessResponse(userResponse, '회원가입이 완료되었습니다.')
    
  } catch (error) {
    logApiError('/api/auth/signup', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// GET 메서드는 지원하지 않음
export async function GET() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 