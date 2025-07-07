import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { 
  getSecurityHeaders, 
  isValidOrigin, 
  getClientIP, 
  getUserAgent, 
  logSecurityEvent,
  validateEnvironmentVariables
} from '@/lib/security'

export function middleware(request: NextRequest) {
  // 보안 헤더 가져오기
  const securityHeaders = getSecurityHeaders()
  
  // 환경 변수 검증
  const envValidation = validateEnvironmentVariables()
  if (!envValidation.isValid) {
    console.error('Environment validation failed:', envValidation.errors)
    logSecurityEvent('Middleware env validation failed', { 
      errors: envValidation.errors 
    }, 'error')
  }
  
  const clientIP = getClientIP(request)
  const userAgent = getUserAgent(request)
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // API 경로에 대한 특별 처리
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // CORS 프리플라이트 요청 처리
    if (request.method === 'OPTIONS') {
      if (origin && isValidOrigin(origin)) {
        return new NextResponse(null, {
          status: 200,
          headers: {
            ...securityHeaders,
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 24시간
          },
        })
      } else {
        logSecurityEvent('Invalid CORS origin', { 
          origin, 
          ip: clientIP, 
          userAgent,
          path: request.nextUrl.pathname
        }, 'warn')
        
        return new NextResponse(null, {
          status: 403,
          headers: securityHeaders,
        })
      }
    }
    
    // API 요청에 대한 보안 검사
    const response = NextResponse.next()
    
    // 보안 헤더 설정
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // CORS 헤더 설정 (유효한 오리진인 경우)
    if (origin && isValidOrigin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    // API 요청 로깅
    logSecurityEvent('API request', {
      method: request.method,
      path: request.nextUrl.pathname,
      ip: clientIP,
      userAgent,
      origin,
      referer
    }, 'info')
    
    return response
  }
  
  // 정적 파일 및 Next.js 내부 경로는 기본 보안 헤더만 적용
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname.startsWith('/static/')
  ) {
    const response = NextResponse.next()
    
    // 기본 보안 헤더만 적용
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  }
  
  // 일반 페이지 요청 처리
  const response = NextResponse.next()
  
  // 보안 헤더 설정
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // CSP (Content Security Policy) 설정
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim()
  
  response.headers.set('Content-Security-Policy', cspHeader)
  
  // HSTS (HTTP Strict Transport Security) - 프로덕션에서만
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  // 페이지 요청 로깅
  logSecurityEvent('Page request', {
    method: request.method,
    path: request.nextUrl.pathname,
    ip: clientIP,
    userAgent,
    referer
  }, 'info')
  
  return response
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 