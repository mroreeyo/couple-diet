import { NextRequest, NextResponse } from 'next/server'
import { 
  getClientIP, 
  getUserAgent, 
  logSecurityEvent, 
  getSecurityHeaders,
  rateLimiters,
  checkRateLimit
} from '@/lib/security'
import { runSecurityAudit, generateSecurityReport } from '@/lib/security-audit'

export async function GET(request: NextRequest) {
  const securityHeaders = getSecurityHeaders()
  const clientIP = getClientIP(request)
  const userAgent = getUserAgent(request)
  
  // Rate Limiting (일반 API 제한 사용)
  const rateLimitResult = await checkRateLimit(rateLimiters.general, clientIP)
  if (!rateLimitResult.allowed) {
    logSecurityEvent('Security audit rate limit exceeded', { 
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
  
  try {
    logSecurityEvent('Security audit requested', { 
      ip: clientIP,
      userAgent
    }, 'info')
    
    // 보안 감사 실행
    const auditResult = await runSecurityAudit()
    
    // 보고서 생성
    const report = generateSecurityReport(auditResult)
    
    logSecurityEvent('Security audit completed', { 
      score: auditResult.score,
      severity: auditResult.severity,
      ip: clientIP,
      userAgent
    }, 'info')
    
    return NextResponse.json(
      { 
        success: true, 
        data: {
          ...auditResult,
          report
        },
        message: '보안 감사가 완료되었습니다.' 
      },
      { status: 200, headers: securityHeaders }
    )
    
  } catch (error) {
    logSecurityEvent('Security audit error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP,
      userAgent
    }, 'error')
    
    return NextResponse.json(
      { success: false, message: '보안 감사 중 오류가 발생했습니다.' },
      { status: 500, headers: securityHeaders }
    )
  }
}

// POST 메서드는 지원하지 않음
export async function POST() {
  return NextResponse.json(
    { success: false, message: '지원하지 않는 메서드입니다.' },
    { status: 405, headers: getSecurityHeaders() }
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