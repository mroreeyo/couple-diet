'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { AuthGuard } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  CheckCircle,
  Circle,
  Heart,
  Target,
  Home,
  Info,
  TrendingUp,
  Settings,
  X,
  Clock,
  Camera,
  Utensils,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

// 식단 확인 상태 타입
type MealStatus = 'completed' | 'incomplete' | 'partner-only' | 'both' | 'none'

// 개별 식사 정보 타입
interface MealInfo {
  id: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  calories: number
  time: string
  photo?: string
  notes?: string
  ingredients?: string[]
}

// 날짜별 상세 식단 데이터 타입
interface DetailedDayMealData {
  date: string
  userMeals: MealInfo[]
  partnerMeals: MealInfo[]
  userTotalCalories: number
  partnerTotalCalories: number
  status: MealStatus
  mood?: 'great' | 'good' | 'okay' | 'bad'
  waterIntake?: number // 물 섭취량 (잔)
  exercise?: string
}

// 기존 DayMealData 타입 (요약용)
interface DayMealData {
  date: string
  userMeals: number // 사용자 식사 횟수
  partnerMeals: number // 파트너 식사 횟수
  userCalories: number
  partnerCalories: number
  status: MealStatus
}

// 월간 목표 타입
interface MonthlyGoal {
  targetDays: number
  targetCalories: number
  partnerTargetCalories: number
}

// 상세 데모 데이터 생성 함수
const generateDetailedDemoData = (year: number, month: number): { [key: string]: DetailedDayMealData } => {
  const daysInMonth = new Date(year, month, 0).getDate()
  const data: { [key: string]: DetailedDayMealData } = {}
  
  const mealNames = {
    breakfast: ['김치찌개', '토스트', '샐러드', '요거트', '시리얼', '계란후라이'],
    lunch: ['불고기', '파스타', '카레', '비빔밥', '라면', '샌드위치', '초밥'],
    dinner: ['삼겹살', '치킨', '피자', '찜닭', '갈비', '회', '스테이크'],
    snack: ['과일', '견과류', '요거트', '쿠키', '아이스크림']
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const random = Math.random()
    
    if (day <= new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear()) {
      const userMeals: MealInfo[] = []
      const partnerMeals: MealInfo[] = []
      
      // 사용자 식사 생성
      if (random > 0.3) {
        userMeals.push({
          id: `user-breakfast-${day}`,
          type: 'breakfast',
          name: mealNames.breakfast[Math.floor(Math.random() * mealNames.breakfast.length)],
          calories: 300 + Math.floor(Math.random() * 200),
          time: '08:30',
          photo: '/api/placeholder/300/200',
          notes: '맛있었음',
          ingredients: ['밥', '김치', '계란']
        })
      }
      
      if (random > 0.2) {
        userMeals.push({
          id: `user-lunch-${day}`,
          type: 'lunch',
          name: mealNames.lunch[Math.floor(Math.random() * mealNames.lunch.length)],
          calories: 600 + Math.floor(Math.random() * 300),
          time: '12:30',
          photo: '/api/placeholder/300/200',
          ingredients: ['고기', '야채', '밥']
        })
      }
      
      if (random > 0.4) {
        userMeals.push({
          id: `user-dinner-${day}`,
          type: 'dinner',
          name: mealNames.dinner[Math.floor(Math.random() * mealNames.dinner.length)],
          calories: 700 + Math.floor(Math.random() * 400),
          time: '19:00',
          photo: '/api/placeholder/300/200'
        })
      }
      
      // 파트너 식사 생성 (50% 확률)
      if (random > 0.5) {
        partnerMeals.push({
          id: `partner-breakfast-${day}`,
          type: 'breakfast',
          name: mealNames.breakfast[Math.floor(Math.random() * mealNames.breakfast.length)],
          calories: 280 + Math.floor(Math.random() * 180),
          time: '09:00'
        })
        
        partnerMeals.push({
          id: `partner-lunch-${day}`,
          type: 'lunch',
          name: mealNames.lunch[Math.floor(Math.random() * mealNames.lunch.length)],
          calories: 550 + Math.floor(Math.random() * 250),
          time: '13:00'
        })
        
        partnerMeals.push({
          id: `partner-dinner-${day}`,
          type: 'dinner',
          name: mealNames.dinner[Math.floor(Math.random() * mealNames.dinner.length)],
          calories: 650 + Math.floor(Math.random() * 350),
          time: '19:30'
        })
      }
      
      const userTotalCalories = userMeals.reduce((sum, meal) => sum + meal.calories, 0)
      const partnerTotalCalories = partnerMeals.reduce((sum, meal) => sum + meal.calories, 0)
      
      let status: MealStatus = 'none'
      if (userMeals.length > 0 && partnerMeals.length > 0) {
        status = 'both'
      } else if (userMeals.length > 0) {
        status = 'completed'
      } else if (partnerMeals.length > 0) {
        status = 'partner-only'
      }
      
      data[date] = {
        date,
        userMeals,
        partnerMeals,
        userTotalCalories,
        partnerTotalCalories,
        status,
        mood: ['great', 'good', 'okay'][Math.floor(Math.random() * 3)] as 'great' | 'good' | 'okay',
        waterIntake: 6 + Math.floor(Math.random() * 4),
        exercise: random > 0.7 ? '헬스장 1시간' : undefined
      }
    }
  }
  
  return data
}

// 데모 데이터 생성 함수 (기존 - 요약용)
const generateDemoData = (year: number, month: number): DayMealData[] => {
  const daysInMonth = new Date(year, month, 0).getDate()
  const data: DayMealData[] = []
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const random = Math.random()
    
    let status: MealStatus
    let userMeals = 0
    let partnerMeals = 0
    let userCalories = 0
    let partnerCalories = 0
    
    if (day <= new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear()) {
      // 현재 날짜까지만 데이터 생성
      if (random > 0.8) {
        status = 'both'
        userMeals = 3
        partnerMeals = 3
        userCalories = 1800 + Math.floor(Math.random() * 400)
        partnerCalories = 2000 + Math.floor(Math.random() * 400)
      } else if (random > 0.6) {
        status = 'completed'
        userMeals = 2 + Math.floor(Math.random() * 2)
        partnerMeals = 0
        userCalories = 1200 + Math.floor(Math.random() * 800)
      } else if (random > 0.4) {
        status = 'partner-only'
        userMeals = 0
        partnerMeals = 2 + Math.floor(Math.random() * 2)
        partnerCalories = 1500 + Math.floor(Math.random() * 700)
      } else if (random > 0.2) {
        status = 'incomplete'
        userMeals = 1
        partnerMeals = 1
        userCalories = 600 + Math.floor(Math.random() * 400)
        partnerCalories = 800 + Math.floor(Math.random() * 400)
      } else {
        status = 'none'
      }
    } else {
      status = 'none'
    }
    
    data.push({
      date,
      userMeals,
      partnerMeals,
      userCalories,
      partnerCalories,
      status
    })
  }
  
  return data
}

// 날짜 셀 컴포넌트
const DateCell = React.memo(function DateCell({ 
  day, 
  data, 
  isToday, 
  isCurrentMonth, 
  isSelected,
  onClick 
}: {
  day: number
  data?: DayMealData
  isToday: boolean
  isCurrentMonth: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const getStatusStyle = (status: MealStatus) => {
    switch (status) {
      case 'both':
        return 'bg-gradient-to-br from-pink-500 to-orange-500 text-white shadow-lg'
      case 'completed':
        return 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md'
      case 'partner-only':
        return 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white shadow-md'
      case 'incomplete':
        return 'bg-gradient-to-br from-yellow-300 to-orange-300 text-gray-800 shadow-sm'
      default:
        return 'bg-white/60 text-gray-600 hover:bg-white/80'
    }
  }

  const getStatusIcon = (status: MealStatus) => {
    switch (status) {
      case 'both':
        return <Heart className="w-3 h-3 fill-current" />
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      case 'partner-only':
        return <Heart className="w-3 h-3" />
      case 'incomplete':
        return <Circle className="w-3 h-3" />
      default:
        return null
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={!isCurrentMonth}
      className={`
        relative w-full aspect-square rounded-lg transition-all duration-300 
        hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
        flex flex-col items-center justify-center p-1 text-sm font-medium
        focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2
        ${isToday ? 'ring-2 ring-pink-500 ring-offset-2 animate-pulse' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${data ? getStatusStyle(data.status) : 'bg-gray-100 text-gray-400'}
        ${isCurrentMonth ? 'hover:shadow-md transform-gpu' : ''}
      `}
      aria-label={`${day}일 ${data ? `식단 상태: ${data.status}` : '기록 없음'}`}
      role="gridcell"
      tabIndex={isCurrentMonth ? 0 : -1}
    >
      <span className={`${data?.status === 'incomplete' ? 'text-gray-800' : ''}`}>
        {day}
      </span>
      
      {data && data.status !== 'none' && (
        <div className="absolute top-1 right-1 opacity-80">
          {getStatusIcon(data.status)}
        </div>
      )}
      
      {data && (data.userMeals > 0 || data.partnerMeals > 0) && (
        <div className="absolute bottom-1 left-1 flex space-x-0.5">
          {data.userMeals > 0 && (
            <div className="w-1.5 h-1.5 bg-current rounded-full opacity-70 animate-pulse" />
          )}
          {data.partnerMeals > 0 && (
            <div className="w-1.5 h-1.5 bg-current rounded-full opacity-50 animate-pulse" />
          )}
        </div>
      )}
    </button>
  )
})

// 상태 범례 컴포넌트
const StatusLegend = React.memo(function StatusLegend() {
  const legendItems = [
    { status: 'both', label: '둘 다 완료', color: 'from-pink-500 to-orange-500', icon: Heart },
    { status: 'completed', label: '내가 완료', color: 'from-green-400 to-emerald-500', icon: CheckCircle },
    { status: 'partner-only', label: '파트너만', color: 'from-purple-400 to-indigo-500', icon: Heart },
    { status: 'incomplete', label: '부분 완료', color: 'from-yellow-300 to-orange-300', icon: Circle },
    { status: 'none', label: '기록 없음', color: 'from-gray-200 to-gray-300', icon: Circle }
  ]

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4 transition-all duration-300 hover:shadow-xl">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
        <Info className="w-4 h-4 mr-2" />
        상태 표시
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
        {legendItems.map(({ status, label, color, icon: Icon }) => (
          <div key={status} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded transition-colors">
            <div className={`w-4 h-4 rounded bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
              <Icon className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs text-gray-600 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

// 월간 목표 컴포넌트
const MonthlyGoals = React.memo(function MonthlyGoals({ 
  goal, 
  currentStats, 
  onUpdateGoal 
}: {
  goal: MonthlyGoal
  currentStats: any
  onUpdateGoal: (newGoal: MonthlyGoal) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editGoal, setEditGoal] = useState(goal)

  const handleSave = () => {
    onUpdateGoal(editGoal)
    setIsEditing(false)
  }

  const progress = currentStats.totalDays > 0 ? (currentStats.completedDays / goal.targetDays) * 100 : 0

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4 transition-all duration-300 hover:shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center">
          <Target className="w-4 h-4 mr-2" />
          월간 목표
        </h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 text-gray-500 hover:text-pink-600 rounded transition-colors"
          aria-label="목표 편집"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600">목표 일수</label>
            <input
              type="number"
              value={editGoal.targetDays}
              onChange={(e) => setEditGoal({ ...editGoal, targetDays: parseInt(e.target.value) || 0 })}
              className="w-full text-sm border rounded px-2 py-1 mt-1"
              min="1"
              max="31"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-pink-500 text-white text-xs py-1 px-2 rounded hover:bg-pink-600 transition-colors"
            >
              저장
            </button>
            <button
              onClick={() => {
                setEditGoal(goal)
                setIsEditing(false)
              }}
              className="flex-1 bg-gray-200 text-gray-700 text-xs py-1 px-2 rounded hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>진행률</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-pink-500 to-orange-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">목표 일수:</span>
              <span className="font-medium">{goal.targetDays}일</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">달성 일수:</span>
              <span className="font-medium text-green-600">{currentStats.completedDays}일</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">남은 일수:</span>
              <span className="font-medium text-orange-600">{Math.max(0, goal.targetDays - currentStats.completedDays)}일</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

// 식단 상세보기 모달 컴포넌트
const MealDetailModal = React.memo(function MealDetailModal({
  date,
  detailedData,
  isOpen,
  onClose
}: {
  date: string
  detailedData?: DetailedDayMealData
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  // detailedData가 없으면 기본값 사용
  const safeDetailedData: DetailedDayMealData = detailedData || {
    date,
    userMeals: [],
    partnerMeals: [],
    userTotalCalories: 0,
    partnerTotalCalories: 0,
    status: 'none',
    mood: 'good',
    waterIntake: 8,
  }

  const getMealTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return '아침'
      case 'lunch': return '점심'
      case 'dinner': return '저녁'
      case 'snack': return '간식'
      default: return type
    }
  }

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'great': return '😄'
      case 'good': return '😊'
      case 'okay': return '😐'
      case 'bad': return '😔'
      default: return '😊'
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="bg-gradient-to-r from-pink-500 to-orange-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{safeDetailedData.date} 식단 상세</h2>
              <p className="text-pink-100 mt-1">
                오늘의 기분: {getMoodEmoji(safeDetailedData.mood)}
                {safeDetailedData.waterIntake && ` | 물 ${safeDetailedData.waterIntake}잔`}
                {safeDetailedData.exercise && ` | ${safeDetailedData.exercise}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="모달 닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 모달 내용 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 내 식단 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  나
                </div>
                <h3 className="text-xl font-semibold text-gray-800">내 식단</h3>
                <span className="text-blue-600 font-medium">
                  총 {safeDetailedData.userTotalCalories} kcal
                </span>
              </div>
              
              {safeDetailedData.userMeals.length > 0 ? (
                <div className="space-y-3">
                  {safeDetailedData.userMeals.map((meal) => (
                    <div key={meal.id} className="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm bg-blue-200 text-blue-800 px-2 py-1 rounded">
                              {getMealTypeLabel(meal.type)}
                            </span>
                            <span className="text-sm text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {meal.time}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-800 mb-1">{meal.name}</h4>
                          <p className="text-blue-600 font-medium mb-2">{meal.calories} kcal</p>
                          
                          {meal.ingredients && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {meal.ingredients.map((ingredient, idx) => (
                                <span key={idx} className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                  {ingredient}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {meal.notes && (
                            <p className="text-sm text-gray-600 italic">"{meal.notes}"</p>
                          )}
                        </div>
                        
                        {meal.photo && (
                          <div className="ml-4 flex-shrink-0">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Camera className="w-6 h-6 text-gray-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>기록된 식사가 없습니다</p>
                </div>
              )}
            </div>

            {/* 파트너 식단 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-8 h-8 text-purple-500" />
                <h3 className="text-xl font-semibold text-gray-800">파트너 식단</h3>
                <span className="text-purple-600 font-medium">
                  총 {safeDetailedData.partnerTotalCalories} kcal
                </span>
              </div>
              
              {safeDetailedData.partnerMeals.length > 0 ? (
                <div className="space-y-3">
                  {safeDetailedData.partnerMeals.map((meal) => (
                    <div key={meal.id} className="bg-purple-50 rounded-lg p-4 hover:bg-purple-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm bg-purple-200 text-purple-800 px-2 py-1 rounded">
                              {getMealTypeLabel(meal.type)}
                            </span>
                            <span className="text-sm text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {meal.time}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-800 mb-1">{meal.name}</h4>
                          <p className="text-purple-600 font-medium mb-2">{meal.calories} kcal</p>
                          
                          {meal.ingredients && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {meal.ingredients.map((ingredient, idx) => (
                                <span key={idx} className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                                  {ingredient}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {meal.notes && (
                            <p className="text-sm text-gray-600 italic">"{meal.notes}"</p>
                          )}
                        </div>
                        
                        {meal.photo && (
                          <div className="ml-4 flex-shrink-0">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Camera className="w-6 h-6 text-gray-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>파트너 기록이 없습니다</p>
                </div>
              )}
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              닫기
            </button>
            <Link
              href="/meals/new"
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
            >
              식사 추가하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
})

function CalendarContent() {
  const { user, loading: authLoading } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<DayMealData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal>({
    targetDays: 20,
    targetCalories: 1800,
    partnerTargetCalories: 2000
  })
  
  // API 관련 상태
  const [monthData, setMonthData] = useState<DayMealData[]>([])
  const [detailedMonthData, setDetailedMonthData] = useState<{ [key: string]: DetailedDayMealData }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // API에서 월간 데이터 가져오기
  useEffect(() => {
    // 사용자 로딩 중이면 대기
    if (authLoading) {
      console.log('⏳ 사용자 정보 로딩 중...')
      return
    }
    
    // 사용자 정보가 없으면 로딩 해제
    if (!user?.id) {
      console.log('🔍 사용자 정보 없음, 로딩 해제')
      setLoading(false)
      setError('로그인이 필요합니다.')
      return
    }
    
    // 추가적인 안전 체크: 사용자 객체가 완전히 로드되었는지 확인
    if (!user.email) {
      console.log('🔍 사용자 정보 불완전, 잠시 대기...')
      return
    }
    
    const fetchMonthData = async () => {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      
      console.log(`📅 캘린더 데이터 요청 시작: ${year}년 ${month}월`)
      setLoading(true)
      setError(null)
      
      try {
        // 잠시 대기하여 인증 상태가 안정되도록 함
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Supabase 세션에서 토큰 가져오기 (재시도 로직 추가)
        let session = null
        let retries = 3
        
        while (!session?.access_token && retries > 0) {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          session = currentSession
          
          if (!session?.access_token) {
            console.log(`🔄 토큰 재시도 중... (${4 - retries}/3)`)
            await new Promise(resolve => setTimeout(resolve, 200))
            retries--
          }
        }
        
        if (!session?.access_token) {
          throw new Error('인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.')
        }
        
        console.log(`🔑 토큰 확보 완료, API 호출 중...`)
        
        const response = await fetch(`/api/meals/history?year=${year}&month=${month}&include_partner=true`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log(`📊 API 응답 상태: ${response.status}`)
        
        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('📋 API 응답 데이터:', result)
        
        if (!result.success) {
          throw new Error(result.error || '식단 데이터 조회 실패')
        }
        
        // API 응답 데이터를 컴포넌트 형식으로 변환
        const apiData = result.data || {}
        console.log(`🔄 변환할 원본 데이터:`, Object.keys(apiData).length, '개 날짜')
        
        const transformedData = transformApiDataToCalendarFormat(apiData, year, month)
        const transformedDetailedData = transformApiDataToDetailedFormat(apiData, year, month)
        
        console.log(`✅ 변환 완료: ${transformedData.length}개 날짜 데이터`)
        
        setMonthData(transformedData)
        setDetailedMonthData(transformedDetailedData)
        
      } catch (err) {
        console.error('❌ 월간 식단 데이터 조회 오류:', err)
        const errorMessage = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.'
        
        // 인증 관련 오류인 경우 더 명확한 메시지 제공
        if (errorMessage.includes('토큰') || errorMessage.includes('인증')) {
          setError('인증에 문제가 있습니다. 페이지를 새로고침하거나 다시 로그인해주세요.')
        } else {
          setError(errorMessage)
        }
        
        // 에러 시 빈 데이터로 설정
        setMonthData([])
        setDetailedMonthData({})
      } finally {
        console.log('🏁 API 호출 완료 (로딩 해제)')
        setLoading(false)
      }
    }
    
    fetchMonthData()
  }, [currentDate, user?.id, authLoading])

  // API 데이터를 캘린더 형식으로 변환하는 함수
  const transformApiDataToCalendarFormat = (apiData: any, year: number, month: number): DayMealData[] => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const data: DayMealData[] = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = apiData[date]
      
      if (dayData) {
        data.push({
          date,
          userMeals: dayData.userMeals?.length || 0,
          partnerMeals: dayData.partnerMeals?.length || 0,
          userCalories: dayData.userTotalCalories || 0,
          partnerCalories: dayData.partnerTotalCalories || 0,
          status: dayData.status || 'none'
        })
      } else {
        data.push({
          date,
          userMeals: 0,
          partnerMeals: 0,
          userCalories: 0,
          partnerCalories: 0,
          status: 'none'
        })
      }
    }
    
    return data
  }

  // API 데이터를 상세 형식으로 변환하는 함수
  const transformApiDataToDetailedFormat = (apiData: any, year: number, month: number): { [key: string]: DetailedDayMealData } => {
    const detailedData: { [key: string]: DetailedDayMealData } = {}
    const daysInMonth = new Date(year, month, 0).getDate()
    
    // 모든 날짜에 대해 데이터 생성 (빈 날짜도 포함)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = apiData[date]
      
      if (dayData) {
        // API 데이터가 있는 경우
        const userMeals: MealInfo[] = (dayData.userMeals || []).map((meal: any) => ({
          id: meal.id,
          type: meal.type || 'lunch',
          name: meal.name || '식사',
          calories: meal.calories || 0,
          time: meal.time || '12:00',
          ingredients: meal.foods?.map((f: any) => f.name) || []
        }))
        
        const partnerMeals: MealInfo[] = (dayData.partnerMeals || []).map((meal: any) => ({
          id: meal.id,
          type: meal.type || 'lunch', 
          name: meal.name || '식사',
          calories: meal.calories || 0,
          time: meal.time || '12:00',
          ingredients: meal.foods?.map((f: any) => f.name) || []
        }))
        
        detailedData[date] = {
          date,
          userMeals,
          partnerMeals,
          userTotalCalories: dayData.userTotalCalories || 0,
          partnerTotalCalories: dayData.partnerTotalCalories || 0,
          status: dayData.status || 'none',
          mood: 'good',
          waterIntake: 8,
        }
      } else {
        // API 데이터가 없는 경우 빈 데이터 생성
        detailedData[date] = {
          date,
          userMeals: [],
          partnerMeals: [],
          userTotalCalories: 0,
          partnerTotalCalories: 0,
          status: 'none',
          mood: 'good',
          waterIntake: 8,
        }
      }
    }
    
    return detailedData
  }

  // 월 통계 계산
  const monthStats = useMemo(() => {
    const completedDays = monthData.filter(d => d.status === 'both' || d.status === 'completed').length
    const totalDays = monthData.filter(d => d.status !== 'none').length
    const totalUserCalories = monthData.reduce((sum, d) => sum + d.userCalories, 0)
    const totalPartnerCalories = monthData.reduce((sum, d) => sum + d.partnerCalories, 0)
    
    return {
      completedDays,
      totalDays,
      completionRate: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
      avgUserCalories: totalDays > 0 ? Math.round(totalUserCalories / totalDays) : 0,
      avgPartnerCalories: totalDays > 0 ? Math.round(totalPartnerCalories / totalDays) : 0
    }
  }, [monthData])

  // 캘린더 그리드 생성
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // 해당 월의 첫째 날과 마지막 날
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 캘린더 시작 날짜 (이전 월의 마지막 주 포함)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())
    
    // 캘린더 종료 날짜 (다음 월의 첫 주 포함)
    const endDate = new Date(lastDay)
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
    
    const days = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const day = current.getDate()
      const isCurrentMonth = current.getMonth() === month
      const isToday = current.toDateString() === new Date().toDateString()
      const dateString = current.toISOString().split('T')[0]
      const data = monthData.find(d => d.date === dateString)
      
      days.push({
        day,
        date: new Date(current),
        isCurrentMonth,
        isToday,
        data
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [currentDate, monthData])

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          changeMonth('prev')
          break
        case 'ArrowRight':
          e.preventDefault()
          changeMonth('next')
          break
        case 'Home':
          e.preventDefault()
          setCurrentDate(new Date())
          break
        case 'Escape':
          e.preventDefault()
          setIsModalOpen(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 월 변경 핸들러
  const changeMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
    setSelectedDate(null) // 선택된 날짜 초기화
    setIsModalOpen(false) // 모달 닫기
  }, [])

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback((data?: DayMealData) => {
    if (data) {
      // 같은 날짜를 다시 클릭하면 선택 해제
      if (selectedDate?.date === data.date) {
        setSelectedDate(null)
        setIsModalOpen(false)
      } else {
        // 새로운 날짜 클릭 시 선택하고 바로 모달 열기
        setSelectedDate(data)
        setIsModalOpen(true)
      }
    }
  }, [selectedDate])

  // 상세보기 버튼 클릭 핸들러
  const handleDetailClick = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  // 모달 닫기 핸들러
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // 목표 업데이트 핸들러
  const handleUpdateGoal = useCallback((newGoal: MonthlyGoal) => {
    setMonthlyGoal(newGoal)
    // 실제 앱에서는 여기서 서버에 저장
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                aria-label="대시보드로 돌아가기"
              >
                <Home className="w-5 h-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <CalendarIcon className="w-8 h-8 text-pink-500" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent">
                    식단 캘린더
                  </h1>
                  <p className="text-sm text-gray-600">월간 식단 기록 현황</p>
                </div>
              </div>
            </div>

            {/* 월 네비게이션 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                aria-label="이전 달"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-semibold text-gray-800 min-w-[120px] text-center">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </h2>
              
              <button
                onClick={() => changeMonth('next')}
                className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                aria-label="다음 달"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* 로딩 상태 */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mr-3"></div>
              <span className="text-gray-600">식단 데이터를 불러오는 중...</span>
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <h3 className="text-red-800 font-semibold">
                    {error === '로그인이 필요합니다.' ? '로그인 필요' : '데이터 로딩 오류'}
                  </h3>
                  <p className="text-red-600 mt-1">{error}</p>
                  {error === '로그인이 필요합니다.' ? (
                    <Link
                      href="/login"
                      className="mt-3 inline-block px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
                    >
                      로그인하기
                    </Link>
                  ) : (
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    >
                      새로고침
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 정상 데이터 렌더링 */}
          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 캘린더 메인 영역 */}
              <div className="lg:col-span-3">
                {/* 월 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4 transition-all duration-300 hover:shadow-xl hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">완료율</p>
                      <p className="text-2xl font-bold text-pink-600">{monthStats.completionRate}%</p>
                    </div>
                    <Target className="w-8 h-8 text-pink-500" />
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4 transition-all duration-300 hover:shadow-xl hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">기록 일수</p>
                      <p className="text-2xl font-bold text-green-600">{monthStats.completedDays}/{monthStats.totalDays}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4 transition-all duration-300 hover:shadow-xl hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">평균 칼로리 (나)</p>
                      <p className="text-2xl font-bold text-blue-600">{monthStats.avgUserCalories}</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      나
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4 transition-all duration-300 hover:shadow-xl hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">평균 칼로리 (파트너)</p>
                      <p className="text-2xl font-bold text-purple-600">{monthStats.avgPartnerCalories}</p>
                    </div>
                    <Heart className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* 캘린더 그리드 */}
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 transition-all duration-300 hover:shadow-xl">
                {/* 요일 헤더 */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                    <div
                      key={day}
                      className={`text-center text-sm font-semibold py-2 ${
                        index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 gap-2" role="grid" aria-label="캘린더">
                  {calendarGrid.map((item, index) => (
                    <DateCell
                      key={index}
                      day={item.day}
                      data={item.data}
                      isToday={item.isToday}
                      isCurrentMonth={item.isCurrentMonth}
                      isSelected={selectedDate?.date === item.date.toISOString().split('T')[0]}
                      onClick={() => handleDateClick(item.data)}
                    />
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-500 text-center">
                  💡 키보드 단축키: ← → (월 이동), Home (오늘로)
                </div>
              </div>
            </div>

            {/* 사이드바 */}
            <div className="space-y-6">
              {/* 월간 목표 */}
              <MonthlyGoals
                goal={monthlyGoal}
                currentStats={monthStats}
                onUpdateGoal={handleUpdateGoal}
              />

              {/* 상태 범례 */}
              <StatusLegend />

              {/* 선택된 날짜 상세 정보 */}
              {selectedDate && (
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 transition-all duration-300 hover:shadow-xl animate-in slide-in-from-right">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    {selectedDate.date} 상세
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">내 기록</p>
                      <p className="text-lg font-medium text-blue-600">
                        {selectedDate.userMeals}회 식사
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedDate.userCalories} kcal
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600 mb-1">파트너 기록</p>
                      <p className="text-lg font-medium text-purple-600">
                        {selectedDate.partnerMeals}회 식사
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedDate.partnerCalories} kcal
                      </p>
                    </div>
                    
                    <button 
                      onClick={handleDetailClick}
                      className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>
              )}

              {/* 상세 식단 모달 */}
              <MealDetailModal
                date={selectedDate?.date || ''}
                detailedData={selectedDate ? detailedMonthData[selectedDate.date] : undefined}
                isOpen={isModalOpen}
                onClose={handleModalClose}
              />

              {/* 빠른 액션 */}
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 transition-all duration-300 hover:shadow-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">빠른 액션</h3>
                <div className="space-y-3">
                  <Link
                    href="/feed"
                    className="block w-full text-center bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                  >
                    피드 보기
                  </Link>
                  <Link
                    href="/meals/new"
                    className="block w-full text-center bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    식사 추가하기
                  </Link>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <AuthGuard requireAuth={true}>
      <CalendarContent />
    </AuthGuard>
  )
} 