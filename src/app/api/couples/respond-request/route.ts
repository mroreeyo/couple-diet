import { NextRequest } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  extractBearerToken,
  logApiRequest,
  logApiError,
  getRequestInfo
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('POST', '/api/couples/respond-request', userAgent, ip)
  
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader || undefined)
    
    if (!token) {
      return createErrorResponse('인증 토큰이 필요합니다.', 401)
    }
    
    // 요청 본문 파싱
    const body = await request.json()
    const { action, requestId } = body
    
    // 입력 검증
    if (!action || !['accept', 'reject'].includes(action)) {
      return createErrorResponse('action은 "accept" 또는 "reject"이어야 합니다.', 400)
    }
    
    if (!requestId || typeof requestId !== 'number') {
      return createErrorResponse('요청 ID가 필요합니다.', 400)
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    
    // 토큰으로 현재 사용자 정보 조회
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      return createErrorResponse('유효하지 않은 토큰입니다.', 401)
    }
    
    const currentUser = userData.user
    
    // 현재 사용자 정보 조회
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('id, email, display_name, partner_id')
      .eq('id', currentUser.id)
      .single()
    
    if (currentUserError || !currentUserData) {
      return createErrorResponse('현재 사용자 정보를 찾을 수 없습니다.', 404)
    }
    
    // 커플 요청 조회
    const { data: requestData, error: requestError } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id, relationship_status, requested_by')
      .eq('id', requestId)
      .eq('relationship_status', 'pending')
      .single()
    
    if (requestError || !requestData) {
      return createErrorResponse('해당 커플 요청을 찾을 수 없습니다.', 404)
    }
    
    // 상대방 사용자 정보 조회
    const partnerId = requestData.user1_id === currentUserData.id ? requestData.user2_id : requestData.user1_id
    const { data: partnerInfo, error: partnerError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', partnerId)
      .single()
    
    if (partnerError || !partnerInfo) {
      return createErrorResponse('상대방 정보를 찾을 수 없습니다.', 404)
    }
    
    // 현재 사용자가 요청을 받은 사람인지 확인
    const isRecipient = (requestData.user1_id === currentUserData.id && requestData.requested_by === requestData.user2_id) ||
                       (requestData.user2_id === currentUserData.id && requestData.requested_by === requestData.user1_id)
    
    if (!isRecipient) {
      return createErrorResponse('이 요청에 응답할 권한이 없습니다.', 403)
    }
    
    // 이미 파트너가 있는지 확인 (수락하는 경우에만)
    if (action === 'accept' && currentUserData.partner_id) {
      return createErrorResponse('이미 커플 관계가 있습니다.', 400)
    }
    
    let result
    
    if (action === 'accept') {
      // 요청 수락 (Supabase 함수 사용)
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc('accept_couple_request', {
          p_request_id: requestId
        })
      
      if (acceptError) {
        logApiError('/api/couples/respond-request', acceptError, { userId: currentUser.id, requestId, action, ip })
        return createErrorResponse('커플 요청 수락 중 오류가 발생했습니다.', 500)
      }
      
      result = acceptResult
      
      // 성공 로그
      console.log(`[${new Date().toISOString()}] Couple request accepted:`, {
        requestId,
        acceptedBy: currentUserData.email,
        acceptedByUserId: currentUserData.id,
        ip
      })
      
    } else {
      // 요청 거절 (상태를 'inactive'로 변경)
      const { error: rejectError } = await supabase
        .from('couples')
        .update({
          relationship_status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
      
      if (rejectError) {
        logApiError('/api/couples/respond-request', rejectError, { userId: currentUser.id, requestId, action, ip })
        return createErrorResponse('커플 요청 거절 중 오류가 발생했습니다.', 500)
      }
      
      // 성공 로그
      console.log(`[${new Date().toISOString()}] Couple request rejected:`, {
        requestId,
        rejectedBy: currentUserData.email,
        rejectedByUserId: currentUserData.id,
        ip
      })
    }
    
    return createSuccessResponse({
      action,
      requestId,
      currentUser: {
        id: currentUserData.id,
        email: currentUserData.email,
        displayName: currentUserData.display_name
      },
      partner: {
        id: partnerInfo.id,
        email: partnerInfo.email,
        displayName: partnerInfo.display_name
      },
      result: action === 'accept' ? result : null
    }, action === 'accept' ? '커플 요청을 수락했습니다!' : '커플 요청을 거절했습니다.')
    
  } catch (error) {
    logApiError('/api/couples/respond-request', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// GET 메서드는 지원하지 않음
export async function GET() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 