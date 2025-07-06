import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validateRequestBody, 
  validateEmail, 
  translateSupabaseError,
  logApiRequest,
  logApiError,
  getRequestInfo
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('POST', '/api/auth/login', userAgent, ip)
  
  try {
    // 요청 본문 검증
    const validation = await validateRequestBody(request, ['email', 'password'])
    if (!validation.isValid) {
      return createErrorResponse(validation.error!, 400)
    }
    
    const { email, password } = validation.body
    
    // 이메일 형식 검증
    if (!validateEmail(email)) {
      return createErrorResponse('유효하지 않은 이메일 형식입니다.', 400)
    }
    
    // 클라이언트 사이드용 Supabase 클라이언트 생성 (서버에서 임시로 사용)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 로그인 시도
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (authError) {
      const translatedError = translateSupabaseError(authError.message)
      logApiError('/api/auth/login', authError, { email, ip })
      return createErrorResponse(translatedError, 401)
    }
    
    if (!authData.user) {
      return createErrorResponse('로그인에 실패했습니다.', 401)
    }
    
    // 사용자 프로필 정보 조회
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError) {
      console.warn('Profile retrieval warning:', profileError)
    }
    
    // 로그인 성공 로그
    console.log(`[${new Date().toISOString()}] Login successful:`, { 
      userId: authData.user.id, 
      email: authData.user.email,
      ip 
    })
    
    // 사용자 정보 반환 (세션 정보 포함)
    const userResponse = {
      id: authData.user.id,
      email: authData.user.email,
      displayName: userProfile?.display_name || authData.user.user_metadata?.display_name || email.split('@')[0],
      avatarUrl: userProfile?.avatar_url || authData.user.user_metadata?.avatar_url,
      partnerId: userProfile?.partner_id,
      createdAt: authData.user.created_at,
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at
      }
    }
    
    return createSuccessResponse(userResponse, '로그인에 성공했습니다.')
    
  } catch (error) {
    logApiError('/api/auth/login', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// GET 메서드는 지원하지 않음
export async function GET() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 