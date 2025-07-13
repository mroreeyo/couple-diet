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
    console.log('🔗 커플 요청 응답 API 시작')
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth Header:', authHeader ? 'Present' : 'Missing')
    
    const token = extractBearerToken(authHeader || null)
    console.log('🎫 Token extracted:', token ? 'Success' : 'Failed')
    
    if (!token) {
      console.log('❌ No token provided')
      return createErrorResponse('인증 토큰이 필요합니다.', 401)
    }
    
    // 요청 본문 파싱
    const body = await request.json()
    console.log('📋 Request body:', body)
    const { action, coupleId, requestId } = body
    
    // coupleId와 requestId 둘 다 지원
    const targetId = coupleId || requestId
    
    // 입력 검증
    console.log('🔍 Validating inputs - action:', action, 'coupleId:', coupleId, 'requestId:', requestId, 'targetId:', targetId)
    
    if (!action || !['accept', 'reject'].includes(action)) {
      console.log('❌ Invalid action:', action)
      return createErrorResponse('action은 "accept" 또는 "reject"이어야 합니다.', 400)
    }
    
    if (!targetId) {
      console.log('❌ Missing coupleId or requestId')
      return createErrorResponse('커플 ID 또는 요청 ID가 필요합니다.', 400)
    }
    
    console.log('✅ Input validation passed')
    
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
      .eq('id', targetId)
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
      console.log('💕 커플 요청 수락 처리 중...')
      
      // 요청을 활성화로 변경
      const { error: updateError } = await supabase
        .from('couples')
        .update({
          relationship_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId)
      
      if (updateError) {
        console.log('❌ Update couples error:', updateError)
        logApiError('/api/couples/respond-request', updateError, { userId: currentUser.id, requestId, action, ip })
        return createErrorResponse('커플 요청 수락 중 오류가 발생했습니다.', 500)
      }
      
      console.log('✅ Couples table updated to active')
      
      // 양쪽 사용자의 partner_id 업데이트
      const { error: user1Error } = await supabase
        .from('users')
        .update({ partner_id: partnerInfo.id })
        .eq('id', currentUserData.id)
      
      if (user1Error) {
        console.log('❌ Update current user partner_id error:', user1Error)
        logApiError('/api/couples/respond-request', user1Error, { userId: currentUser.id, requestId, action, ip })
        return createErrorResponse('사용자 정보 업데이트 중 오류가 발생했습니다.', 500)
      }
      
      const { error: user2Error } = await supabase
        .from('users')
        .update({ partner_id: currentUserData.id })
        .eq('id', partnerInfo.id)
      
      if (user2Error) {
        console.log('❌ Update partner user partner_id error:', user2Error)
        logApiError('/api/couples/respond-request', user2Error, { userId: currentUser.id, requestId, action, ip })
        return createErrorResponse('파트너 정보 업데이트 중 오류가 발생했습니다.', 500)
      }
      
      console.log('✅ Both users partner_id updated')
      result = { success: true }
      
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
        .eq('id', targetId)
      
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