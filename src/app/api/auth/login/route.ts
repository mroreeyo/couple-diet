import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  checkRateLimit, 
  sanitizeInput, 
  validateEmailAdvanced,
  getSecurityHeaders,
  getClientIP,
  getUserAgent,
  logSecurityEvent,
  validateEnvironmentVariables,
  rateLimiters
} from '@/lib/security'
import { 
  translateSupabaseError, 
  validateRequestBody,
  logApiRequest,
  logApiError
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
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
  
  // Rate Limiting 체크
  const rateLimitResult = await checkRateLimit(rateLimiters.login, clientIP)
  if (!rateLimitResult.allowed) {
    logSecurityEvent('Login rate limit exceeded', { 
      ip: clientIP, 
      userAgent,
      retryAfter: rateLimitResult.retryAfter
    }, 'warn')
    
    return NextResponse.json(
      { 
        success: false, 
        message: '로그인 시도 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
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
  
  logApiRequest('POST', '/api/auth/login', userAgent, clientIP)
  
  try {
    // 요청 본문 검증
    const validation = await validateRequestBody(request, ['email', 'password'])
    if (!validation.isValid) {
      logSecurityEvent('Login validation failed', { 
        error: validation.error,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400, headers: securityHeaders }
      )
    }
    
    const { email: rawEmail, password } = validation.body as { email: string; password: string }
    
    // 입력 데이터 Sanitization
    const email = sanitizeInput(rawEmail)
    
    // 이메일 고급 검증
    const emailValidation = validateEmailAdvanced(email)
    if (!emailValidation.isValid) {
      logSecurityEvent('Login email validation failed', { 
        email: email.substring(0, 3) + '***', // 부분 마스킹
        error: emailValidation.error,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: emailValidation.error },
        { status: 400, headers: securityHeaders }
      )
    }
    
    // 비밀번호 기본 검증
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      logSecurityEvent('Login password validation failed', { 
        email: email.substring(0, 3) + '***',
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: '유효하지 않은 비밀번호입니다.' },
        { status: 400, headers: securityHeaders }
      )
    }
    
    // 클라이언트 사이드용 Supabase 클라이언트 생성
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
      
      logSecurityEvent('Login attempt failed', { 
        email: email.substring(0, 3) + '***',
        error: authError.message,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      logApiError('/api/auth/login', authError, { email: email.substring(0, 3) + '***', ip: clientIP })
      
      return NextResponse.json(
        { success: false, message: translatedError },
        { status: 401, headers: securityHeaders }
      )
    }
    
    if (!authData.user) {
      logSecurityEvent('Login failed - no user data', { 
        email: email.substring(0, 3) + '***',
        ip: clientIP,
        userAgent
      }, 'error')
      
      return NextResponse.json(
        { success: false, message: '로그인에 실패했습니다.' },
        { status: 401, headers: securityHeaders }
      )
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
    logSecurityEvent('Login successful', { 
      userId: authData.user.id, 
      email: email.substring(0, 3) + '***',
      ip: clientIP,
      userAgent
    }, 'info')
    
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
    
    return NextResponse.json(
      { success: true, data: userResponse, message: '로그인에 성공했습니다.' },
      { status: 200, headers: securityHeaders }
    )
    
  } catch (error) {
    logSecurityEvent('Login server error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP,
      userAgent
    }, 'error')
    
    logApiError('/api/auth/login', error, { ip: clientIP })
    
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// GET 메서드는 지원하지 않음 - 보안 강화
export async function GET() {
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