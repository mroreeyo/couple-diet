import { NextRequest, NextResponse } from 'next/server'
import { 
  checkRateLimit, 
  getSecurityHeaders,
  getClientIP,
  getUserAgent,
  logSecurityEvent,
  validateEnvironmentVariables,
  rateLimiters
} from '@/lib/security'
import { createSupabaseAdmin } from '@/lib/supabase'
import { 
  translateSupabaseError,
  logApiRequest,
  logApiError,
  extractBearerToken
} from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  // 보안 헤더 설정
  const securityHeaders = getSecurityHeaders()
  
  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables()
  if (!envValidation.isValid) {
    logSecurityEvent('Environment validation failed', { errors: envValidation.errors }, 'error')
    return NextResponse.json(
      { success: false, message: '서버 설정 오류' },
      { status: 500, headers: securityHeaders }
    )
  }
  
  const clientIP = getClientIP(request)
  const userAgent = getUserAgent(request)
  
  // Rate Limiting 체크 (일반 API 제한 사용)
  const rateLimitResult = await checkRateLimit(rateLimiters.general, clientIP)
  if (!rateLimitResult.allowed) {
    logSecurityEvent('Me endpoint rate limit exceeded', { 
      ip: clientIP, 
      userAgent,
      retryAfter: rateLimitResult.retryAfter
    }, 'warn')
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: rateLimitResult.retryAfter
      },
      { 
        status: 429, 
        headers: {
          ...securityHeaders,
          'Retry-After': Math.ceil((rateLimitResult.retryAfter || 0) / 1000).toString()
        }
      }
    )
  }
  
  logApiRequest('GET', '/api/auth/me', userAgent, clientIP)
  
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)
    
    if (!token) {
      logSecurityEvent('Me endpoint missing token', { 
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: '인증 토큰이 필요합니다.' },
        { status: 401, headers: securityHeaders }
      )
    }
    
    // 토큰 기본 형식 검증
    if (token.length < 10 || token.length > 1000) {
      logSecurityEvent('Me endpoint invalid token format', { 
        tokenLength: token.length,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: '유효하지 않은 토큰 형식입니다.' },
        { status: 401, headers: securityHeaders }
      )
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    
    // 토큰으로 사용자 정보 조회
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      const translatedError = translateSupabaseError(userError?.message || 'Invalid token')
      
      logSecurityEvent('Me endpoint token validation failed', { 
        error: userError?.message || 'No user data',
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: translatedError },
        { status: 401, headers: securityHeaders }
      )
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
    
    // 성공 로그
    logSecurityEvent('Me endpoint successful', { 
      userId: userData.user.id,
      email: userData.user.email?.substring(0, 3) + '***',
      ip: clientIP,
      userAgent
    }, 'info')
    
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
    
    return NextResponse.json(
      { success: true, data: userResponse, message: '사용자 정보 조회 성공' },
      { status: 200, headers: securityHeaders }
    )
    
  } catch (error) {
    logSecurityEvent('Me endpoint server error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP,
      userAgent
    }, 'error')
    
    logApiError('/api/auth/me', error, { ip: clientIP })
    
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// POST 메서드는 지원하지 않음 - 보안 강화
export async function POST() {
  const securityHeaders = getSecurityHeaders()
  
  return NextResponse.json(
    { success: false, message: '지원하지 않는 메서드입니다.' },
    { status: 405, headers: securityHeaders }
  )
}

// 다른 HTTP 메서드들도 명시적으로 거부
export async function PUT() {
  return NextResponse.json(
    { success: false, message: '지원하지 않는 메서드입니다.' },
    { status: 405, headers: getSecurityHeaders() }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: '지원하지 않는 메서드입니다.' },
    { status: 405, headers: getSecurityHeaders() }
  )
} 