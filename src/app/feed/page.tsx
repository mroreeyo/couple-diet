'use client'

import { AuthGuard } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { MealPostCard } from '@/components/meals'
import { useState, useEffect } from 'react'
import { Heart, Plus, Calendar, TrendingUp, Users, Home, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { MealAnalysisRecord } from '@/types/food-analysis'

// 데모 데이터
const demoMeals: (MealAnalysisRecord & { authorName?: string; authorEmail?: string })[] = [
  {
    id: '1',
    user_id: 'demo-user-1',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop',
    meal_type: 'breakfast',
    total_calories: 420,
    analysis_result: {
      total_calories: 420,
      meal_type: 'breakfast',
      analysis_confidence: 0.85,
      foods: [
        { name: '아보카도 토스트', calories: 320, amount: '1개', confidence: 0.9 },
        { name: '그릭 요거트', calories: 100, amount: '150g', confidence: 0.8 }
      ]
    },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30분 전
    authorName: '지영',
    authorEmail: 'jiyoung@example.com'
  },
  {
    id: '2', 
    user_id: 'current-user',
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=500&h=300&fit=crop',
    meal_type: 'lunch',
    total_calories: 650,
    analysis_result: {
      total_calories: 650,
      meal_type: 'lunch',
      analysis_confidence: 0.9,
      foods: [
        { name: '연어 샐러드', calories: 450, amount: '1그릇', confidence: 0.85 },
        { name: '현미밥', calories: 200, amount: '100g', confidence: 0.9 }
      ]
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
    authorName: '나',
    authorEmail: 'me@example.com'
  },
  {
    id: '3',
    user_id: 'demo-user-1',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=300&fit=crop',
    meal_type: 'dinner',
    total_calories: 580,
    analysis_result: {
      total_calories: 580,
      meal_type: 'dinner',
      analysis_confidence: 0.88,
      foods: [
        { name: '닭가슴살 스테이크', calories: 350, amount: '150g', confidence: 0.9 },
        { name: '구운 브로콜리', calories: 80, amount: '100g', confidence: 0.85 },
        { name: '고구마', calories: 150, amount: '1개', confidence: 0.8 }
      ]
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // 20시간 전
    authorName: '지영',
    authorEmail: 'jiyoung@example.com'
  }
]

function FeedContent() {
  const { user } = useAuth()
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'partner'>('all')
  const [meals, setMeals] = useState<typeof demoMeals>([])

  useEffect(() => {
    // 실제로는 API에서 데이터를 가져올 예정
    setMeals(demoMeals)
  }, [])

  const filteredMeals = meals.filter(meal => {
    if (selectedFilter === 'mine') return meal.user_id === 'current-user'
    if (selectedFilter === 'partner') return meal.user_id !== 'current-user' 
    return true
  })

  const handleLike = (mealId: string) => {
    console.log(`좋아요: ${mealId}`)
  }

  const handleComment = (mealId: string) => {
    console.log(`댓글: ${mealId}`)
  }

  const handleShare = (mealId: string) => {
    console.log(`공유: ${mealId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Heart className="w-6 h-6 text-pink-500" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent">
                  커플 식단 피드
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link 
                href="/dashboard"
                className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link 
                href="/meals/new"
                className="flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                식단 추가
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - 요약 위젯들 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 오늘의 칼로리 요약 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                <h3 className="font-semibold text-gray-800">오늘의 칼로리</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">내 칼로리</span>
                  <span className="font-semibold text-gray-800">650 / 1,800</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full" style={{width: '36%'}}></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">파트너 칼로리</span>
                  <span className="font-semibold text-gray-800">1,000 / 2,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-pink-400 to-pink-500 h-2 rounded-full" style={{width: '50%'}}></div>
                </div>
              </div>
            </div>

            {/* 이번 주 목표 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-4">
                <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="font-semibold text-gray-800">이번 주 목표</h3>
              </div>
              
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">3 / 7</div>
                  <div className="text-sm text-gray-600">식단 인증 완료</div>
                </div>
                
                <div className="flex justify-center space-x-1">
                  {[1,2,3,4,5,6,7].map((day) => (
                    <div 
                      key={day} 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                        ${day <= 3 
                          ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' 
                          : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 커플 연결 상태 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-pink-500 mr-2" />
                <h3 className="font-semibold text-gray-800">커플 현황</h3>
              </div>
              
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2 text-pink-600">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="font-semibold">함께 진행 중</span>
                </div>
                <div className="text-sm text-gray-600">
                  {user?.email?.split('@')[0]} & 지영
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Tabs */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4">
              <div className="flex space-x-1">
                {[
                  { key: 'all', label: '전체' },
                  { key: 'mine', label: '내 식단' },
                  { key: 'partner', label: '파트너' }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSelectedFilter(filter.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedFilter === filter.key
                        ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-md'
                        : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed Posts */}
            <div className="space-y-6">
              {filteredMeals.length > 0 ? (
                filteredMeals.map((meal) => (
                  <MealPostCard
                    key={meal.id}
                    meal={meal}
                    isOwnPost={meal.user_id === 'current-user'}
                    authorName={meal.authorName}
                    authorEmail={meal.authorEmail}
                    onLike={() => handleLike(meal.id)}
                    onComment={() => handleComment(meal.id)}
                    onShare={() => handleShare(meal.id)}
                    likesCount={Math.floor(Math.random() * 10)}
                    commentsCount={Math.floor(Math.random() * 5)}
                    isLiked={Math.random() > 0.5}
                  />
                ))
              ) : (
                /* 빈 상태 */
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-12 text-center">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full mx-auto flex items-center justify-center">
                      <Plus className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {selectedFilter === 'mine' ? '첫 번째 식단을 추가해보세요!' : 
                         selectedFilter === 'partner' ? '파트너의 식단을 기다리고 있어요!' :
                         '식단 피드가 비어있어요!'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {selectedFilter === 'mine' ? '함께하는 건강한 식습관의 시작' :
                         selectedFilter === 'partner' ? '파트너가 식단을 업로드하면 여기에 표시됩니다' :
                         '나와 파트너의 식단을 함께 확인해보세요'}
                      </p>
                      {selectedFilter !== 'partner' && (
                        <Link 
                          href="/meals/new"
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          <PlusCircle className="w-4 h-4 mr-2" />
                          식단 추가하기
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedContent />
    </AuthGuard>
  )
} 