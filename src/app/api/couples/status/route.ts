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

export async function GET(request: NextRequest) {
  const { userAgent, ip } = getRequestInfo(request)
  logApiRequest('GET', '/api/couples/status', userAgent, ip)
  
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader || null)
    
    if (!token) {
      return createErrorResponse('인증 토큰이 필요합니다.', 401)
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    
    // 토큰으로 현재 사용자 정보 조회
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      return createErrorResponse('유효하지 않은 토큰입니다.', 401)
    }
    
    const currentUser = userData.user
    
    // 현재 사용자 정보 조회 (파트너 정보 포함)
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('id, email, display_name, partner_id')
      .eq('id', currentUser.id)
      .single()
    
    if (currentUserError || !currentUserData) {
      return createErrorResponse('현재 사용자 정보를 찾을 수 없습니다.', 404)
    }
    
    let coupleStatus = 'none' // none, pending_sent, pending_received, active
    let partnerInfo = null
    let requestInfo = null
    
    // 활성 커플 관계가 있는 경우
    if (currentUserData.partner_id) {
      // 파트너 정보 조회
      const { data: partner, error: partnerError } = await supabase
        .from('users')
        .select('id, email, display_name')
        .eq('id', currentUserData.partner_id)
        .single()
      
      if (!partnerError && partner) {
        coupleStatus = 'active'
        partnerInfo = {
          id: partner.id,
          email: partner.email,
          displayName: partner.display_name
        }
        
        // 활성 커플 관계 정보 조회
        const { data: activeCouple, error: activeCoupleError } = await supabase
          .from('couples')
          .select('id, requested_at, accepted_at, created_at')
          .or(`and(user1_id.eq.${currentUserData.id},user2_id.eq.${currentUserData.partner_id}),and(user1_id.eq.${currentUserData.partner_id},user2_id.eq.${currentUserData.id})`)
          .eq('relationship_status', 'active')
          .single()
        
        if (!activeCoupleError && activeCouple) {
          requestInfo = {
            id: activeCouple.id,
            requestedAt: activeCouple.requested_at,
            acceptedAt: activeCouple.accepted_at,
            createdAt: activeCouple.created_at
          }
        }
      }
    } else {
      // 대기 중인 요청이 있는지 확인
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id, relationship_status, requested_by, requested_at')
        .or(`user1_id.eq.${currentUserData.id},user2_id.eq.${currentUserData.id}`)
        .eq('relationship_status', 'pending')
      
      if (!pendingError && pendingRequests && pendingRequests.length > 0) {
        const pendingRequest = pendingRequests[0]
        
        // 내가 보낸 요청인지 받은 요청인지 확인
        if (pendingRequest.requested_by === currentUserData.id) {
          coupleStatus = 'pending_sent'
          
          // 요청 받은 사람 정보 조회
          const receiverId = pendingRequest.user1_id === currentUserData.id ? pendingRequest.user2_id : pendingRequest.user1_id
          const { data: receiver, error: receiverError } = await supabase
            .from('users')
            .select('id, email, display_name')
            .eq('id', receiverId)
            .single()
          
          if (!receiverError && receiver) {
            partnerInfo = {
              id: receiver.id,
              email: receiver.email,
              displayName: receiver.display_name
            }
          }
        } else {
          coupleStatus = 'pending_received'
          
          // 요청 보낸 사람 정보 조회
          const senderId = pendingRequest.requested_by
          const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id, email, display_name')
            .eq('id', senderId)
            .single()
          
          if (!senderError && sender) {
            partnerInfo = {
              id: sender.id,
              email: sender.email,
              displayName: sender.display_name
            }
          }
        }
        
        requestInfo = {
          id: pendingRequest.id,
          requestedAt: pendingRequest.requested_at,
          requestedBy: pendingRequest.requested_by
        }
      }
    }
    
    return createSuccessResponse({
      currentUser: {
        id: currentUserData.id,
        email: currentUserData.email,
        displayName: currentUserData.display_name,
        partnerId: currentUserData.partner_id
      },
      coupleStatus,
      partnerInfo,
      requestInfo
    }, '커플 상태 조회가 완료되었습니다.')
    
  } catch (error) {
    logApiError('/api/couples/status', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// POST 메서드는 지원하지 않음
export async function POST() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 