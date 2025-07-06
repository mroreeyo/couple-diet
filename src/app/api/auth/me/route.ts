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

export async function GET(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('GET', '/api/auth/me', userAgent, ip)
  
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
      const translatedError = translateSupabaseError(userError?.message || 'Invalid token')
      return createErrorResponse(translatedError, 401)
    }
    
    // 사용자 프로필 정보 조회
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userData.user.id)
      .single()
    
    if (profileError) {
      console.warn('Profile retrieval warning:', profileError)
    }
    
    // 파트너 정보 조회 (있는 경우)
    let partnerInfo = null
    if (userProfile?.partner_id) {
      const { data: partnerData, error: partnerError } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url')
        .eq('id', userProfile.partner_id)
        .single()
      
      if (!partnerError && partnerData) {
        partnerInfo = partnerData
      }
    }
    
    // 사용자 정보 반환
    const userResponse = {
      id: userData.user.id,
      email: userData.user.email,
      displayName: userProfile?.display_name || userData.user.user_metadata?.display_name || userData.user.email?.split('@')[0],
      avatarUrl: userProfile?.avatar_url || userData.user.user_metadata?.avatar_url,
      partnerId: userProfile?.partner_id,
      partner: partnerInfo,
      createdAt: userData.user.created_at,
      lastSignIn: userData.user.last_sign_in_at,
      emailConfirmed: userData.user.email_confirmed_at ? true : false,
      profile: userProfile
    }
    
    return createSuccessResponse(userResponse, '사용자 정보 조회 성공')
    
  } catch (error) {
    logApiError('/api/auth/me', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// POST 메서드는 지원하지 않음
export async function POST() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 