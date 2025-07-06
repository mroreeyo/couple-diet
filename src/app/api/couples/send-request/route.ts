import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  extractBearerToken,
  validateEmail,
  logApiRequest,
  logApiError,
  getRequestInfo
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('POST', '/api/couples/send-request', userAgent, ip)
  
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader || undefined)
    
    if (!token) {
      return createErrorResponse('인증 토큰이 필요합니다.', 401)
    }
    
    // 요청 본문 파싱
    const body = await request.json()
    const { partnerEmail } = body
    
    // 입력 검증
    if (!partnerEmail || typeof partnerEmail !== 'string') {
      return createErrorResponse('파트너 이메일이 필요합니다.', 400)
    }
    
    if (!validateEmail(partnerEmail)) {
      return createErrorResponse('올바른 이메일 형식이 아닙니다.', 400)
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    
    // 토큰으로 현재 사용자 정보 조회
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      return createErrorResponse('유효하지 않은 토큰입니다.', 401)
    }
    
    const currentUser = userData.user
    
    // 자기 자신에게 요청 보내는 것 방지
    if (currentUser.email === partnerEmail) {
      return createErrorResponse('자기 자신에게는 커플 요청을 보낼 수 없습니다.', 400)
    }
    
    // 파트너 사용자 조회
    const { data: partnerData, error: partnerError } = await supabase
      .from('users')
      .select('id, email, display_name, partner_id')
      .eq('email', partnerEmail)
      .single()
    
    if (partnerError || !partnerData) {
      return createErrorResponse('해당 이메일의 사용자를 찾을 수 없습니다.', 404)
    }
    
    // 현재 사용자 정보 조회
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('id, email, display_name, partner_id')
      .eq('id', currentUser.id)
      .single()
    
    if (currentUserError || !currentUserData) {
      return createErrorResponse('현재 사용자 정보를 찾을 수 없습니다.', 404)
    }
    
    // 이미 파트너가 있는지 확인
    if (currentUserData.partner_id) {
      return createErrorResponse('이미 커플 관계가 있습니다.', 400)
    }
    
    if (partnerData.partner_id) {
      return createErrorResponse('상대방이 이미 다른 사람과 커플 관계입니다.', 400)
    }
    
    // 기존 요청 확인 (보낸 요청 또는 받은 요청)
    const { data: existingRequests, error: requestError } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id, relationship_status, requested_by')
      .or(`and(user1_id.eq.${currentUserData.id},user2_id.eq.${partnerData.id}),and(user1_id.eq.${partnerData.id},user2_id.eq.${currentUserData.id})`)
      .in('relationship_status', ['pending', 'active'])
    
    if (requestError) {
      logApiError('/api/couples/send-request', requestError, { userId: currentUser.id, partnerEmail, ip })
      return createErrorResponse('요청 확인 중 오류가 발생했습니다.', 500)
    }
    
    if (existingRequests && existingRequests.length > 0) {
      const existingRequest = existingRequests[0]
      
      if (existingRequest.relationship_status === 'active') {
        return createErrorResponse('이미 커플 관계가 활성화되어 있습니다.', 400)
      }
      
      if (existingRequest.relationship_status === 'pending') {
        if (existingRequest.requested_by === currentUserData.id) {
          return createErrorResponse('이미 커플 요청을 보냈습니다.', 400)
        } else {
          return createErrorResponse('상대방이 이미 당신에게 커플 요청을 보냈습니다. 요청을 수락해주세요.', 400)
        }
      }
    }
    
    // 커플 요청 보내기 (Supabase 함수 사용)
    const { data: requestResult, error: sendError } = await supabase
      .rpc('send_couple_request', {
        p_user1_id: currentUserData.id,
        p_user2_id: partnerData.id
      })
    
    if (sendError) {
      logApiError('/api/couples/send-request', sendError, { userId: currentUser.id, partnerEmail, ip })
      return createErrorResponse('커플 요청 전송 중 오류가 발생했습니다.', 500)
    }
    
    // 성공 로그
    console.log(`[${new Date().toISOString()}] Couple request sent:`, {
      from: currentUserData.email,
      to: partnerData.email,
      fromUserId: currentUserData.id,
      toUserId: partnerData.id,
      ip
    })
    
    return createSuccessResponse({
      requestId: requestResult,
      from: {
        id: currentUserData.id,
        email: currentUserData.email,
        displayName: currentUserData.display_name
      },
      to: {
        id: partnerData.id,
        email: partnerData.email,
        displayName: partnerData.display_name
      }
    }, '커플 요청이 성공적으로 전송되었습니다.')
    
  } catch (error) {
    logApiError('/api/couples/send-request', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// GET 메서드는 지원하지 않음
export async function GET() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 