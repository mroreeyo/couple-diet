import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  checkRateLimit, 
  sanitizeInput, 
  validateEmailAdvanced,
  validatePasswordAdvanced,
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
  const rateLimitResult = await checkRateLimit(rateLimiters.signup, clientIP)
  if (!rateLimitResult.allowed) {
    logSecurityEvent('Signup rate limit exceeded', { 
      ip: clientIP, 
      userAgent,
      retryAfter: rateLimitResult.retryAfter
    }, 'warn')
    
    return NextResponse.json(
      { 
        success: false, 
        message: '회원가입 시도 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
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
  
  logApiRequest('POST', '/api/auth/signup', userAgent, clientIP)
  
  try {
    // 요청 본문 검증
    const validation = await validateRequestBody(request, ['email', 'password'])
    if (!validation.isValid) {
      logSecurityEvent('Signup validation failed', { 
        error: validation.error,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400, headers: securityHeaders }
      )
    }
    
    const { email: rawEmail, password, displayName: rawDisplayName } = validation.body as { email: string; password: string; displayName?: string }
    
    // 입력 데이터 Sanitization
    const email = sanitizeInput(rawEmail)
    const displayName = rawDisplayName ? sanitizeInput(rawDisplayName) : undefined
    
    // 이메일 고급 검증
    const emailValidation = validateEmailAdvanced(email)
    if (!emailValidation.isValid) {
      logSecurityEvent('Signup email validation failed', { 
        email: email.substring(0, 3) + '***',
        error: emailValidation.error,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { success: false, message: emailValidation.error },
        { status: 400, headers: securityHeaders }
      )
    }
    
    // 비밀번호 고급 검증
    const passwordValidation = validatePasswordAdvanced(password)
    if (!passwordValidation.isValid) {
      logSecurityEvent('Signup password validation failed', { 
        email: email.substring(0, 3) + '***',
        errors: passwordValidation.errors,
        strength: passwordValidation.strength,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      return NextResponse.json(
        { 
          success: false, 
          message: passwordValidation.errors[0], // 첫 번째 에러만 표시
          passwordStrength: passwordValidation.strength,
          errors: passwordValidation.errors
        },
        { status: 400, headers: securityHeaders }
      )
    }
    
    // DisplayName 검증 (제공된 경우)
    if (displayName) {
      if (displayName.length < 2 || displayName.length > 50) {
        logSecurityEvent('Signup display name validation failed', { 
          email: email.substring(0, 3) + '***',
          displayNameLength: displayName.length,
          ip: clientIP,
          userAgent
        }, 'warn')
        
        return NextResponse.json(
          { success: false, message: '표시 이름은 2자 이상 50자 이하여야 합니다.' },
          { status: 400, headers: securityHeaders }
        )
      }
      
      // 욕설 또는 부적절한 단어 체크 (간단한 예시)
      const inappropriateWords = ['test', 'admin', 'root', 'null', 'undefined']
      if (inappropriateWords.some(word => displayName.toLowerCase().includes(word))) {
        logSecurityEvent('Signup inappropriate display name', { 
          email: email.substring(0, 3) + '***',
          ip: clientIP,
          userAgent
        }, 'warn')
        
        return NextResponse.json(
          { success: false, message: '사용할 수 없는 표시 이름입니다.' },
          { status: 400, headers: securityHeaders }
        )
      }
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // 기존 사용자 존재 여부 체크 (추가 보안)
    // Supabase에서 직접 사용자 생성을 시도하여 중복 체크
    // getUserByEmail이 없으므로 createUser 시 에러 처리로 대체
    
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
      
      logSecurityEvent('Signup creation failed', { 
        email: email.substring(0, 3) + '***',
        error: authError.message,
        ip: clientIP,
        userAgent
      }, 'warn')
      
      logApiError('/api/auth/signup', authError, { email: email.substring(0, 3) + '***', ip: clientIP })
      
      return NextResponse.json(
        { success: false, message: translatedError },
        { status: 400, headers: securityHeaders }
      )
    }
    
    if (!authData.user) {
      logSecurityEvent('Signup failed - no user data', { 
        email: email.substring(0, 3) + '***',
        ip: clientIP,
        userAgent
      }, 'error')
      
      return NextResponse.json(
        { success: false, message: '사용자 생성에 실패했습니다.' },
        { status: 500, headers: securityHeaders }
      )
    }
    
    // 사용자 프로필 생성 확인
    const { error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError) {
      console.warn('Profile creation warning:', profileError)
    }
    
    // 성공 로그
    logSecurityEvent('Signup successful', { 
      userId: authData.user.id, 
      email: email.substring(0, 3) + '***',
      passwordStrength: passwordValidation.strength,
      ip: clientIP,
      userAgent
    }, 'info')
    
    // 민감한 정보 제거
    const userResponse = {
      id: authData.user.id,
      email: authData.user.email,
      displayName: authData.user.user_metadata?.display_name || displayName || email.split('@')[0],
      createdAt: authData.user.created_at
    }
    
    return NextResponse.json(
      { success: true, data: userResponse, message: '회원가입이 완료되었습니다.' },
      { status: 201, headers: securityHeaders }
    )
    
  } catch (error) {
    logSecurityEvent('Signup server error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP,
      userAgent
    }, 'error')
    
    logApiError('/api/auth/signup', error, { ip: clientIP })
    
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