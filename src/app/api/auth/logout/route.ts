import { NextRequest } from 'next/server'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  logApiRequest,
  logApiError,
  getRequestInfo
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('POST', '/api/auth/logout', userAgent, ip)
  
  try {
    // 로그아웃 성공 로그
    console.log(`[${new Date().toISOString()}] Logout requested:`, { 
      ip,
      userAgent 
    })
    
    // 로그아웃은 클라이언트 측에서 처리
    // 서버 측에서는 단순히 성공 응답만 반환
    return createSuccessResponse(
      { message: '로그아웃 요청이 처리되었습니다.' }, 
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