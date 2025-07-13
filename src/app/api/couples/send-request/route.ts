import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  console.log('🔗 API 호출됨!')
  
  try {
    console.log('✅ Try 블록 시작')
    
    const body = await request.json()
    console.log('📋 Request body:', body)
    
    const { partnerEmail } = body
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.json({
        success: false,
        error: '인증 토큰이 필요합니다.'
      }, { status: 401 })
    }
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin()
    console.log('🗄️ Supabase admin client created')
    
    // 토큰으로 현재 사용자 정보 조회
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !userData.user) {
      console.log('❌ Invalid token:', userError)
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      }, { status: 401 })
    }
    
    const currentUserId = userData.user.id
    console.log('👤 Current user ID:', currentUserId)
    
    // 파트너 사용자 조회
    const { data: partnerData, error: partnerError } = await supabase
      .from('users')
      .select('id')
      .eq('email', partnerEmail)
      .single()
    
    if (partnerError || !partnerData) {
      console.log('❌ Partner not found:', partnerError)
      return NextResponse.json({
        success: false,
        error: '해당 이메일의 사용자를 찾을 수 없습니다.'
      }, { status: 404 })
    }
    
    const partnerUserId = partnerData.id
    console.log('👥 Partner user ID:', partnerUserId)
    
    // 자기 자신에게 요청 방지
    if (currentUserId === partnerUserId) {
      console.log('❌ Self request attempted')
      return NextResponse.json({
        success: false,
        error: '자기 자신에게는 커플 요청을 보낼 수 없습니다.'
      }, { status: 400 })
    }
    
    console.log('🔍 기존 couples 데이터 확인 중...')
    
    // 기존 관계 확인 (모든 상태 포함)
    const { data: existingCouples, error: checkError } = await supabase
      .from('couples')
      .select('*')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${partnerUserId}),and(user1_id.eq.${partnerUserId},user2_id.eq.${currentUserId})`)
    
    if (checkError) {
      console.log('❌ 기존 관계 확인 오류:', checkError)
      return NextResponse.json({
        success: false,
        error: '기존 관계 확인 중 오류 발생'
      }, { status: 500 })
    }
    
    console.log('🔍 기존 관계 데이터:', existingCouples)
    
    if (existingCouples && existingCouples.length > 0) {
      console.log('⚠️ 기존 관계가 존재합니다:', existingCouples[0])
      
      const existing = existingCouples[0]
      
      if (existing.relationship_status === 'active') {
        return NextResponse.json({
          success: false,
          error: '이미 활성화된 커플 관계가 존재합니다.'
        }, { status: 400 })
      } else if (existing.relationship_status === 'pending') {
        return NextResponse.json({
          success: false,
          error: '이미 대기 중인 커플 요청이 존재합니다.'
        }, { status: 400 })
      } else {
        // 다른 상태 (cancelled, rejected 등)인 경우 기존 데이터 삭제 후 새로 생성
        console.log('🗑️ 기존 관계 삭제 중...')
        const { error: deleteError } = await supabase
          .from('couples')
          .delete()
          .eq('id', existing.id)
        
        if (deleteError) {
          console.log('❌ 기존 관계 삭제 오류:', deleteError)
          return NextResponse.json({
            success: false,
            error: '기존 관계 정리 중 오류 발생'
          }, { status: 500 })
        }
        console.log('✅ 기존 관계 삭제 완료')
      }
    }
    
    console.log('💕 새로운 커플 요청 생성 중...')
    
    // 새로운 커플 요청 생성
    const { data: newCouple, error: insertError } = await supabase
      .from('couples')
      .insert({
        user1_id: currentUserId,
        user2_id: partnerUserId,
        requested_by: currentUserId,
        relationship_status: 'pending'
      })
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ 삽입 오류:', insertError)
      return NextResponse.json({
        success: false,
        error: '커플 요청 생성 중 오류 발생'
      }, { status: 500 })
    }
    
    console.log('✅ 커플 요청 생성 성공:', newCouple)
    
    return NextResponse.json({
      success: true,
      message: '커플 요청이 성공적으로 전송되었습니다.',
      data: newCouple
    })
    
  } catch (error) {
    console.log('💥 에러 발생:', error)
    return NextResponse.json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: '지원하지 않는 메서드입니다.'
  }, { status: 405 })
} 