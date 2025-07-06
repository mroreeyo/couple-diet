import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  extractBearerToken,
  translateSupabaseError,
  logApiRequest,
  logApiError,
  getRequestInfo
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('POST', '/api/auth/logout', userAgent, ip)
  
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader || undefined)
    
    if (!token) {
      return createErrorResponse('인증 토큰이 필요합니다.', 401)
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    
    // 토큰으로 사용자 정보 조회
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      return createErrorResponse('유효하지 않은 토큰입니다.', 401)
    }
    
    // 사용자 세션 무효화
    const { error: signOutError } = await supabase.auth.admin.signOut(userData.user.id)
    
    if (signOutError) {
      const translatedError = translateSupabaseError(signOutError.message)
      logApiError('/api/auth/logout', signOutError, { userId: userData.user.id, ip })
      return createErrorResponse(translatedError, 400)
    }
    
    // 로그아웃 성공 로그
    console.log(`[${new Date().toISOString()}] Logout successful:`, { 
      userId: userData.user.id, 
      email: userData.user.email,
      ip 
    })
    
    return createSuccessResponse(
      { userId: userData.user.id }, 
      '로그아웃이 완료되었습니다.'
    )
    
  } catch (error) {
    logApiError('/api/auth/logout', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// GET 메서드는 지원하지 않음
export async function GET() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 