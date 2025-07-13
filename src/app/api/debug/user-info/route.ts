import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { extractBearerToken } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 사용자 정보 디버깅 API 시작')
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader || null)
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: '인증 토큰이 필요합니다.'
      }, { status: 401 })
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    
    // 토큰으로 현재 사용자 정보 조회
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      }, { status: 401 })
    }
    
    const currentUser = userData.user
    
    // 현재 사용자 정보 조회
    const { data: userInfo, error: userInfoError } = await supabase
      .from('users')
      .select('id, email, display_name, partner_id')
      .eq('id', currentUser.id)
      .single()
    
    if (userInfoError) {
      console.log('❌ User info error:', userInfoError)
      return NextResponse.json({
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.'
      }, { status: 404 })
    }
    
    console.log('👤 Current user info:', userInfo)
    
    // 파트너 정보 조회 (있는 경우)
    let partnerInfo = null
    if (userInfo.partner_id) {
      console.log('🔍 Looking for partner info...')
      const { data: partner, error: partnerError } = await supabase
        .from('users')
        .select('id, email, display_name, partner_id')
        .eq('id', userInfo.partner_id)
        .single()
      
      if (partnerError) {
        console.log('❌ Partner info error:', partnerError)
      } else {
        partnerInfo = partner
        console.log('👫 Partner info:', partnerInfo)
      }
    }
    
    // 커플 관계 정보 조회
    const { data: coupleRelation, error: coupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${userInfo.id},user2_id.eq.${userInfo.id}`)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (coupleError) {
      console.log('❌ Couple relation error:', coupleError)
    } else {
      console.log('💕 Couple relations:', coupleRelation)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        currentUser: userInfo,
        partner: partnerInfo,
        coupleRelations: coupleRelation || [],
        partner_connected: !!userInfo.partner_id,
        debug_info: {
          auth_user_id: currentUser.id,
          db_user_id: userInfo.id,
          partner_id: userInfo.partner_id,
          has_partner: !!userInfo.partner_id,
          couple_relations_count: coupleRelation?.length || 0
        }
      }
    })
    
  } catch (error) {
    console.log('💥 Debug API error:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
} 