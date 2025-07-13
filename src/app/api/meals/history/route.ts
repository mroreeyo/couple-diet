import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, getUserFromToken } from '@/lib/auth-utils'
import { getMealHistory } from '@/lib/meals-history'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    // URL 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const includePartner = searchParams.get('include_partner') === 'true'

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'year와 month 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 월의 시작과 끝 날짜 계산
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    console.log(`📅 식단 히스토리 조회: ${startDate} ~ ${endDate}`)

    // 식단 히스토리 조회
    const result = await getMealHistory({
      userId: user.id,
      includePartner,
      startDate,
      endDate,
      limit: 1000, // 한 달 데이터는 많아봐야 100개 정도
      sortBy: 'created_at',
      sortOrder: 'asc'
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '식단 데이터 조회 실패' },
        { status: 500 }
      )
    }

    // 날짜별로 데이터 그룹핑
    const mealsByDate: { [date: string]: any } = {}
    
    if (result.data) {
      result.data.forEach(meal => {
        // created_at이 없으면 현재 날짜 사용
        const createdAt = meal.created_at || new Date().toISOString()
        const mealDate = createdAt.split('T')[0] // YYYY-MM-DD 형식
        
        if (!mealsByDate[mealDate]) {
          mealsByDate[mealDate] = {
            date: mealDate,
            userMeals: [],
            partnerMeals: [],
            userTotalCalories: 0,
            partnerTotalCalories: 0
          }
        }

        // analysis_result에서 foods 배열 추출
        const foods = meal.analysis_result?.foods || []
        const mealName = foods.map((f: any) => f.name).join(', ') || '식사 정보 없음'

        // 사용자의 식사인지 파트너의 식사인지 구분
        if (meal.user_id === user.id) {
          mealsByDate[mealDate].userMeals.push({
            id: meal.id,
            type: meal.meal_type,
            name: mealName,
            calories: meal.total_calories,
            time: createdAt.split('T')[1].substring(0, 5), // HH:MM
            foods: foods
          })
          mealsByDate[mealDate].userTotalCalories += meal.total_calories
        } else {
          // 파트너의 식사
          mealsByDate[mealDate].partnerMeals.push({
            id: meal.id,
            type: meal.meal_type,
            name: mealName,
            calories: meal.total_calories,
            time: createdAt.split('T')[1].substring(0, 5), // HH:MM
            foods: foods
          })
          mealsByDate[mealDate].partnerTotalCalories += meal.total_calories
        }
      })
    }

    // 각 날짜별로 상태 계산
    Object.keys(mealsByDate).forEach(date => {
      const dayData = mealsByDate[date]
      const hasUserMeals = dayData.userMeals.length > 0
      const hasPartnerMeals = dayData.partnerMeals.length > 0
      
      if (hasUserMeals && hasPartnerMeals) {
        dayData.status = 'both'
      } else if (hasUserMeals) {
        dayData.status = 'completed'
      } else if (hasPartnerMeals) {
        dayData.status = 'partner-only'
      } else {
        dayData.status = 'none'
      }
    })

    return NextResponse.json({
      success: true,
      data: mealsByDate,
      message: '식단 히스토리 조회 성공'
    })

  } catch (error) {
    console.error('식단 히스토리 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '식단 히스토리 조회 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
} 