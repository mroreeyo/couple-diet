import { NextRequest, NextResponse } from 'next/server'
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
  logApiRequest('POST', '/api/couples/cancel-request', userAgent, ip)
  
  try {
    console.log('🔗 커플 요청 취소 API 시작')
    
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
    const { coupleId, requestId } = body
    
    // coupleId와 requestId 둘 다 지원
    const targetId = coupleId || requestId
    
    // 입력 검증
    console.log('🔍 Validating inputs - coupleId:', coupleId, 'requestId:', requestId, 'targetId:', targetId)
    
    if (!targetId) {
      console.log('❌ Missing coupleId or requestId')
      return createErrorResponse('커플 ID 또는 요청 ID가 필요합니다.', 400)
    }
    
    console.log('✅ Input validation passed')
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    console.log('🗄️ Supabase admin client created')
    
    // 토큰으로 현재 사용자 정보 조회
    console.log('👤 Getting user from token...')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      console.log('❌ Invalid token')
      return createErrorResponse('유효하지 않은 토큰입니다.', 401)
    }
    
    const currentUser = userData.user
    console.log('✅ Current user:', { id: currentUser.id, email: currentUser.email })
    
    // 현재 사용자 정보 조회
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('id, email, display_name, partner_id')
      .eq('id', currentUser.id)
      .single()
    
    if (currentUserError || !currentUserData) {
      console.log('❌ Current user data not found')
      return createErrorResponse('현재 사용자 정보를 찾을 수 없습니다.', 404)
    }
    
    console.log('✅ Current user data:', currentUserData)
    
    // 커플 요청 조회
    console.log('🔍 Looking for couple request...')
    const { data: requestData, error: requestError } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id, relationship_status, requested_by')
      .eq('id', targetId)
      .eq('relationship_status', 'pending')
      .single()
    
    if (requestError || !requestData) {
      console.log('❌ Couple request not found or not pending')
      return createErrorResponse('취소할 수 있는 커플 요청을 찾을 수 없습니다.', 404)
    }
    
    console.log('✅ Couple request found:', requestData)
    
    // 현재 사용자가 요청을 보낸 사람인지 확인
    const isRequester = requestData.requested_by === currentUserData.id
    
    if (!isRequester) {
      console.log('❌ Not the requester')
      return createErrorResponse('본인이 보낸 요청만 취소할 수 있습니다.', 403)
    }
    
    console.log('✅ User is the requester, proceeding with cancellation')
    
    // 요청 취소 (상태를 'cancelled'로 변경)
    console.log('🗑️ Cancelling couple request...')
    const { error: cancelError } = await supabase
      .from('couples')
      .update({
        relationship_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId)
    
    if (cancelError) {
      console.log('❌ Cancel error:', cancelError)
      logApiError('/api/couples/cancel-request', cancelError, { userId: currentUser.id, coupleId: targetId, ip })
      return createErrorResponse('커플 요청 취소 중 오류가 발생했습니다.', 500)
    }
    
    console.log('✅ Couple request cancelled successfully')
    
    // 상대방 사용자 정보 조회
    const partnerId = requestData.user1_id === currentUserData.id ? requestData.user2_id : requestData.user1_id
    const { data: partnerInfo, error: partnerError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', partnerId)
      .single()
    
    if (partnerError || !partnerInfo) {
      console.log('⚠️ Partner info not found, but cancellation was successful')
    }
    
    // 성공 로그
    console.log(`✅ Couple request cancelled:`, {
      requestId: targetId,
      cancelledBy: currentUserData.email,
      cancelledByUserId: currentUserData.id,
      ip
    })
    
    return createSuccessResponse({
      requestId: targetId,
      currentUser: {
        id: currentUserData.id,
        email: currentUserData.email,
        displayName: currentUserData.display_name
      },
      partner: partnerInfo ? {
        id: partnerInfo.id,
        email: partnerInfo.email,
        displayName: partnerInfo.display_name
      } : null
    }, '커플 요청이 취소되었습니다.')
    
  } catch (error) {
    console.log('💥 Unexpected error:', error)
    logApiError('/api/couples/cancel-request', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// GET 메서드는 지원하지 않음
export async function GET() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 