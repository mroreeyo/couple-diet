'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { 
  getAllowedMealTypes, 
  getCurrentMealType, 
  getDailyMealSummary,
  getTimeSlotInfo,
  MealValidationResult,
  validateMealTime
} from '@/lib/meal-validation'
import { MealType } from '@/types/database'

interface MealValidationStatusProps {
  onValidationChange?: (isValid: boolean, restrictions: string[]) => void
  className?: string
}

interface DailySummary {
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  snackCount: number
  totalMeals: number
  meals: Array<{
    id: string
    meal_type: MealType
    meal_name: string
    created_at: string
  }>
}

export function MealValidationStatus({ 
  onValidationChange, 
  className = '' 
}: MealValidationStatusProps) {
  const { user } = useUser()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [allowedMealTypes, setAllowedMealTypes] = useState<MealType[]>([])
  const [currentMealType, setCurrentMealType] = useState<MealType | null>(null)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // 실시간 시간 업데이트
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date())
    }

    // 1분마다 시간 업데이트
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // 현재 시간에 따른 허용 식사 타입 계산
  useEffect(() => {
    const allowed = getAllowedMealTypes(currentTime)
    const current = getCurrentMealType(currentTime)
    
    setAllowedMealTypes(allowed)
    setCurrentMealType(current)
  }, [currentTime])

  // 일일 식사 요약 로드
  useEffect(() => {
    if (!user?.id) return

    const loadDailySummary = async () => {
      try {
        setLoading(true)
        const today = currentTime.toISOString().split('T')[0]
        const summary = await getDailyMealSummary(user.id, today)
        setDailySummary(summary)
      } catch (error) {
        console.error('Failed to load daily meal summary:', error)
        setDailySummary(null)
      } finally {
        setLoading(false)
      }
    }

    loadDailySummary()
  }, [user?.id, currentTime])

  // 제한사항 계산 및 부모 컴포넌트에 알림
  useEffect(() => {
    if (!dailySummary) return

    const newRestrictions: string[] = []

    // 각 식사 타입별 중복 체크
    const mealTypeRestrictions = {
      breakfast: dailySummary.breakfast,
      lunch: dailySummary.lunch,
      dinner: dailySummary.dinner
    }

    Object.entries(mealTypeRestrictions).forEach(([type, hasUploaded]) => {
      const mealType = type as MealType
      if (hasUploaded && allowedMealTypes.includes(mealType)) {
        newRestrictions.push(`${getMealTypeKorean(mealType)}은 이미 업로드했습니다`)
      }
    })

    // 시간 제한 체크
    if (allowedMealTypes.length === 1 && allowedMealTypes[0] === 'snack') {
      newRestrictions.push('현재 정규 식사 시간이 아닙니다 (간식만 업로드 가능)')
    }

    setRestrictions(newRestrictions)

    // 부모 컴포넌트에 검증 상태 알림
    const hasRestrictions = newRestrictions.length > 0
    onValidationChange?.(
      allowedMealTypes.length > 0 && !hasRestrictions, 
      newRestrictions
    )
  }, [allowedMealTypes, dailySummary, onValidationChange])

  const getMealTypeKorean = (type: MealType): string => {
    const typeMap = {
      breakfast: '아침식사',
      lunch: '점심식사', 
      dinner: '저녁식사',
      snack: '간식'
    }
    return typeMap[type]
  }

  const formatTime = (time: Date): string => {
    return time.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const timeSlotInfo = getTimeSlotInfo()

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border rounded-lg p-4 space-y-4 ${className}`}>
      {/* 현재 시간 및 상태 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">🕐 실시간 업로드 상태</h3>
        <span className="text-sm text-gray-500">
          현재 시간: {formatTime(currentTime)}
        </span>
      </div>

      {/* 현재 식사 시간대 */}
      <div className="space-y-2">
        {currentMealType ? (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {getMealTypeKorean(currentMealType)} 시간
            </span>
            <span className="text-sm text-gray-600">
              ({timeSlotInfo[currentMealType]})
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              정규 식사 시간 외
            </span>
            <span className="text-sm text-gray-600">
              (간식만 업로드 가능)
            </span>
          </div>
        )}
      </div>

      {/* 허용된 식사 타입 */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">현재 업로드 가능한 식사:</p>
        <div className="flex flex-wrap gap-2">
          {allowedMealTypes.map(type => (
            <span
              key={type}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {getMealTypeKorean(type)}
            </span>
          ))}
        </div>
      </div>

      {/* 오늘의 식사 현황 */}
      {dailySummary && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">오늘의 식사 현황:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`flex items-center space-x-1 ${dailySummary.breakfast ? 'text-green-600' : 'text-gray-400'}`}>
              <span>{dailySummary.breakfast ? '✅' : '⭕'}</span>
              <span>아침식사</span>
            </div>
            <div className={`flex items-center space-x-1 ${dailySummary.lunch ? 'text-green-600' : 'text-gray-400'}`}>
              <span>{dailySummary.lunch ? '✅' : '⭕'}</span>
              <span>점심식사</span>
            </div>
            <div className={`flex items-center space-x-1 ${dailySummary.dinner ? 'text-green-600' : 'text-gray-400'}`}>
              <span>{dailySummary.dinner ? '✅' : '⭕'}</span>
              <span>저녁식사</span>
            </div>
            <div className="flex items-center space-x-1 text-blue-600">
              <span>🍎</span>
              <span>간식 {dailySummary.snackCount}개</span>
            </div>
          </div>
        </div>
      )}

      {/* 제한사항 경고 */}
      {restrictions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 mb-1">업로드 제한사항</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                {restrictions.map((restriction, index) => (
                  <li key={index}>• {restriction}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 시간대 정보 */}
      <div className="text-xs text-gray-500 border-t pt-3">
        <p className="font-medium mb-1">식사 시간대:</p>
        <div className="space-y-0.5">
          <p>🌅 아침: {timeSlotInfo.breakfast}</p>
          <p>🌞 점심: {timeSlotInfo.lunch}</p>
          <p>🌙 저녁: {timeSlotInfo.dinner}</p>
          <p>🍎 간식: {timeSlotInfo.snack}</p>
        </div>
      </div>
    </div>
  )
} 