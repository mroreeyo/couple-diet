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
  logApiRequest('POST', '/api/couples/disconnect', userAgent, ip)
  
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader || undefined)
    
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
    
    // 활성 커플 관계가 있는지 확인
    if (!currentUserData.partner_id) {
      return createErrorResponse('현재 커플 관계가 없습니다.', 400)
    }
    
    // 파트너 정보 조회
    const { data: partnerData, error: partnerError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', currentUserData.partner_id)
      .single()
    
    if (partnerError || !partnerData) {
      return createErrorResponse('파트너 정보를 찾을 수 없습니다.', 404)
    }
    
    // 활성 커플 관계 조회
    const { data: activeCouple, error: activeCoupleError } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id, relationship_status')
      .or(`and(user1_id.eq.${currentUserData.id},user2_id.eq.${currentUserData.partner_id}),and(user1_id.eq.${currentUserData.partner_id},user2_id.eq.${currentUserData.id})`)
      .eq('relationship_status', 'active')
      .single()
    
    if (activeCoupleError || !activeCouple) {
      return createErrorResponse('활성 커플 관계를 찾을 수 없습니다.', 404)
    }
    
    // 트랜잭션으로 커플 관계 해제
    // 1. couples 테이블의 상태를 'inactive'로 변경
    const { error: updateCouplesError } = await supabase
      .from('couples')
      .update({
        relationship_status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', activeCouple.id)
    
    if (updateCouplesError) {
      logApiError('/api/couples/disconnect', updateCouplesError, { userId: currentUser.id, partnerId: currentUserData.partner_id, ip })
      return createErrorResponse('커플 관계 해제 중 오류가 발생했습니다.', 500)
    }
    
    // 2. 현재 사용자의 partner_id 제거
    const { error: updateCurrentUserError } = await supabase
      .from('users')
      .update({
        partner_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUserData.id)
    
    if (updateCurrentUserError) {
      logApiError('/api/couples/disconnect', updateCurrentUserError, { userId: currentUser.id, partnerId: currentUserData.partner_id, ip })
      return createErrorResponse('사용자 정보 업데이트 중 오류가 발생했습니다.', 500)
    }
    
    // 3. 파트너의 partner_id 제거
    const { error: updatePartnerError } = await supabase
      .from('users')
      .update({
        partner_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUserData.partner_id)
    
    if (updatePartnerError) {
      logApiError('/api/couples/disconnect', updatePartnerError, { userId: currentUser.id, partnerId: currentUserData.partner_id, ip })
      return createErrorResponse('파트너 정보 업데이트 중 오류가 발생했습니다.', 500)
    }
    
    // 성공 로그
    console.log(`[${new Date().toISOString()}] Couple relationship disconnected:`, {
      coupleId: activeCouple.id,
      disconnectedBy: currentUserData.email,
      disconnectedByUserId: currentUserData.id,
      partner: partnerData.email,
      partnerId: partnerData.id,
      ip
    })
    
    return createSuccessResponse({
      disconnectedCouple: {
        id: activeCouple.id,
        user: {
          id: currentUserData.id,
          email: currentUserData.email,
          displayName: currentUserData.display_name
        },
        partner: {
          id: partnerData.id,
          email: partnerData.email,
          displayName: partnerData.display_name
        }
      },
      disconnectedAt: new Date().toISOString()
    }, '커플 관계가 성공적으로 해제되었습니다.')
    
  } catch (error) {
    logApiError('/api/couples/disconnect', error, { ip })
    return createErrorResponse('서버 오류가 발생했습니다.', 500)
  }
}

// GET 메서드는 지원하지 않음
export async function GET() {
  return createErrorResponse('지원하지 않는 메서드입니다.', 405)
} 