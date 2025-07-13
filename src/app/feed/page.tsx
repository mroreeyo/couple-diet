'use client'

import React from 'react'
import { AuthGuard } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { useUser } from '@/hooks/useUser'
import { MealPostCard } from '@/components/meals'
import CalorieSummaryWidget from '@/components/CalorieSummaryWidget'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Heart, Plus, Home, PlusCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { MealAnalysisRecord } from '@/types/food-analysis'
import axios from 'axios'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'


// 무한 스크롤 컴포넌트를 동적으로 로드 (코드 분할)
const InfiniteScroll = dynamic(() => import('react-infinite-scroll-component'), {
  ssr: false,
  loading: () => (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 text-center">
      <div className="flex items-center justify-center space-x-2">
        <RefreshCw className="w-5 h-5 text-pink-500 animate-spin" />
        <span className="text-gray-600">로딩 중...</span>
      </div>
    </div>
  )
})

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
    authorName: '시은',
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
    authorName: '시은',
    authorEmail: 'jiyoung@example.com'
  }
]

// 데모 데이터 필터링 함수
const filterDemoMeals = (
  meals: (MealAnalysisRecord & { authorName?: string; authorEmail?: string })[], 
  filter: 'all' | 'mine' | 'partner',
  user: any
) => {
  switch (filter) {
    case 'mine':
      return meals.filter(meal => meal.user_id === 'current-user')
    case 'partner':
      return meals.filter(meal => meal.user_id === 'demo-user-1')
    case 'all':
    default:
      return meals
  }
}

// 메모이제이션된 필터 컴포넌트
const FilterTabs = React.memo(function FilterTabs({ 
  selectedFilter, 
  onFilterChange, 
  onRefresh, 
  loading 
}: {
  selectedFilter: 'all' | 'mine' | 'partner'
  onFilterChange: (filter: 'all' | 'mine' | 'partner') => void
  onRefresh: () => void
  loading: boolean
}) {
  const filters = useMemo(() => [
    { key: 'all' as const, label: '전체' },
    { key: 'mine' as const, label: '내 식단' },
    { key: 'partner' as const, label: '파트너' }
  ], [])

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex space-x-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => onFilterChange(filter.key)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                selectedFilter === filter.key
                  ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all duration-200 disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
})

// 메모이제이션된 식단 카드 래퍼
const MealCard = React.memo(function MealCard({ 
  meal, 
  isOwnPost, 
  onLike, 
  onComment, 
  onShare 
}: {
  meal: MealAnalysisRecord & { authorName?: string; authorEmail?: string }
  isOwnPost: boolean
  onLike: () => void
  onComment: () => void
  onShare: () => void
}) {
  return (
    <MealPostCard
      meal={meal}
      authorName={meal.authorName || '익명'}
      isOwnPost={isOwnPost}
      onLike={onLike}
      onComment={onComment}
      onShare={onShare}
    />
  )
})

function FeedContent() {
  const { user, refreshUser } = useUser()
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'partner'>('all')
  const [meals, setMeals] = useState<(MealAnalysisRecord & { authorName?: string; authorEmail?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partnerConnected, setPartnerConnected] = useState<boolean>(false)
  
  // 사용자 정보에서 파트너 연결 상태 초기화
  useEffect(() => {
    if (user) {
      const hasPartner = !!(user.partnerId || user.partner)
      console.log('👤 [FeedContent] 사용자 정보 기반 파트너 상태:', {
        userId: user.id,
        partnerId: user.partnerId,
        hasPartner: hasPartner,
        partner: user.partner
      })
      setPartnerConnected(hasPartner)
    }
  }, [user])
  
  // 무한 스크롤을 위한 페이지네이션 상태
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)

  // 메모이제이션된 칼로리 데이터
  const calorieData = useMemo(() => ({
    current: 650,
    goal: 1800,
    partner: {
      current: 1000,
      goal: 2000
    }
  }), [])

  const weeklyData = useMemo(() => ({
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    userCalories: [1200, 1400, 650, 0, 0, 0, 0],
    partnerCalories: [1800, 1600, 1000, 0, 0, 0, 0]
  }), [])

  // API에서 식단 데이터 가져오기 (무한 스크롤용) - useCallback으로 메모이제이션
  const fetchMeals = useCallback(async (
    filter: 'all' | 'mine' | 'partner' = 'all', 
    currentOffset: number = 0, 
    isAppend: boolean = false
  ) => {
    try {
      if (!isAppend) {
        setInitialLoading(true)
        setError(null)
      }
      
      // Supabase 세션에서 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError(`세션 오류: ${sessionError.message}`)
        return
      }
      
      if (!session?.access_token) {
        setError('인증이 필요합니다. 다시 로그인해주세요.')
        return
      }

      const response = await axios.get('/api/meals', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        params: {
          filter: filter,
          limit: 10, // 한 번에 10개씩 로드
          offset: currentOffset
        }
      })

      if (response.data.success) {
        const newMeals = response.data.data.meals
        const pagination = response.data.data.pagination
        
        console.log('✅ API 성공 - 필터:', filter, '데이터 개수:', newMeals.length)
        console.log('📊 로드된 식단 데이터:', newMeals.map((meal: any) => ({ 
          id: meal.id, 
          user_id: meal.user_id, 
          authorName: meal.authorName 
        })))
        console.log('🔍 디버그 정보:', response.data.data.debug_info)
        console.log('🔄 필터 적용 정보:', response.data.data.filter_applied)
        
        // 파트너 연결 상태 업데이트 - filter_applied에서 가져오기
        if (response.data.data.filter_applied?.partner_connected !== undefined) {
          const newPartnerConnected = response.data.data.filter_applied.partner_connected
          console.log('🔄 [FeedContent] 파트너 연결 상태 업데이트:', {
            기존상태: partnerConnected,
            새상태: newPartnerConnected,
            현재필터: filter,
            filter_applied: response.data.data.filter_applied
          })
          setPartnerConnected(newPartnerConnected)
        }
        
        if (isAppend) {
          // 기존 데이터에 추가
          setMeals(prevMeals => [...prevMeals, ...newMeals])
        } else {
          // 새 데이터로 교체 (필터 변경 시)
          setMeals(newMeals)
        }
        
        // 더 가져올 데이터가 있는지 확인
        setHasMore(pagination.hasMore)
        setOffset(currentOffset + newMeals.length)
        
      } else {
        // API 응답이 실패한 경우에도 데모 데이터 필터링 적용
        if (!isAppend) {
          console.log('⚠️ API 응답 실패, 데모 데이터 사용 - 필터:', filter)
          const filteredDemoMeals = filterDemoMeals(demoMeals, filter, user)
          console.log('🎭 필터링된 데모 데이터:', filteredDemoMeals.map(meal => ({ 
            id: meal.id, 
            user_id: meal.user_id, 
            authorName: meal.authorName 
          })))
          setMeals(filteredDemoMeals)
          setHasMore(false)
        }
        setError(response.data.error || '데이터를 불러올 수 없습니다.')
      }
    } catch (err) {
      console.error('식단 데이터 조회 오류:', err)
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('인증이 만료되었습니다. 다시 로그인해주세요.')
        } else {
          setError(err.response?.data?.error || '네트워크 오류가 발생했습니다.')
        }
      } else {
        setError('알 수 없는 오류가 발생했습니다.')
      }
      
      // 에러 시 데모 데이터 사용 (개발 중에만, 첫 로드에만)
      if (!isAppend) {
        console.log('❌ API 에러, 데모 데이터 사용 - 필터:', filter)
        const filteredDemoMeals = filterDemoMeals(demoMeals, filter, user)
        console.log('🎭 필터링된 데모 데이터:', filteredDemoMeals.map(meal => ({ 
          id: meal.id, 
          user_id: meal.user_id, 
          authorName: meal.authorName 
        })))
        setMeals(filteredDemoMeals)
        setHasMore(false)
      }
    } finally {
      setInitialLoading(false)
      setLoading(false)
    }
  }, [])

  // 무한 스크롤을 위한 더 많은 데이터 로드 - useCallback으로 메모이제이션
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    setLoading(true)
    fetchMeals(selectedFilter, offset, true)
  }, [loading, hasMore, selectedFilter, offset, fetchMeals])

  // 필터 변경 시 데이터 리셋 후 새로 로드 - useCallback으로 메모이제이션
  const handleFilterChange = useCallback(async (newFilter: 'all' | 'mine' | 'partner') => {
    console.log('🔄 필터 변경:', newFilter)
    setSelectedFilter(newFilter)
    setOffset(0)
    setHasMore(true)
    
    // 파트너 탭을 선택했을 때 사용자 정보 새로고침
    if (newFilter === 'partner' && refreshUser) {
      console.log('👥 [FeedContent] 파트너 탭 선택 - 사용자 정보 새로고침')
      await refreshUser()
    }
    
    fetchMeals(newFilter, 0, false)
  }, [fetchMeals, refreshUser])

  // 새로고침 - useCallback으로 메모이제이션
  const handleRefresh = useCallback(async () => {
    console.log('🔄 [FeedContent] 새로고침 시작 - 사용자 정보와 식단 데이터 업데이트')
    setOffset(0)
    setHasMore(true)
    
    // 사용자 정보 새로고침 (파트너 상태 업데이트)
    if (refreshUser) {
      await refreshUser()
    }
    
    // 식단 데이터 새로고침
    fetchMeals(selectedFilter, 0, false)
  }, [selectedFilter, fetchMeals, refreshUser])

  // 액션 핸들러들 - useCallback으로 메모이제이션
  const handleLike = useCallback((mealId: string) => {
    console.log(`좋아요: ${mealId}`)
  }, [])

  const handleComment = useCallback((mealId: string) => {
    console.log(`댓글: ${mealId}`)
  }, [])

  const handleShare = useCallback((mealId: string) => {
    console.log(`공유: ${mealId}`)
  }, [])

  useEffect(() => {
    fetchMeals(selectedFilter, 0, false)
  }, [selectedFilter, fetchMeals])

  // 상태 변화 디버깅
  useEffect(() => {
    console.log('🔍 [FeedContent] 상태 변화 감지:', {
      selectedFilter,
      partnerConnected,
      userPartnerId: user?.partnerId,
      userPartner: user?.partner,
      hasParner: !!(user?.partnerId || user?.partner),
      연결안내표시조건: selectedFilter === 'partner' && !partnerConnected
    })
  }, [selectedFilter, partnerConnected, user?.partnerId, user?.partner])

  // 사용자 정보 메모이제이션
  const userName = useMemo(() => user?.email?.split('@')[0] || "나", [user?.email])

  // 파트너 연결 안내 컴포넌트
  const PartnerNotConnectedMessage = () => (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center">
        <span className="text-4xl">💕</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        아직 파트너가 연결되지 않았어요
      </h3>
      <p className="text-gray-600 mb-6 max-w-md leading-relaxed">
        파트너와 연결하면 서로의 식단을 공유하고<br />
        함께 건강한 식습관을 만들어갈 수 있어요
      </p>
      <Link 
        href="/couples" 
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-medium rounded-full hover:from-pink-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
      >
        <span className="mr-2">💑</span>
        파트너 연결하기
      </Link>
      
      {/* 기능 미리보기 섹션 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl max-w-md">
        <p className="text-sm text-gray-500 mb-3">연결하면 이런 기능을 사용할 수 있어요:</p>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="mr-2">🍽️</span>
            파트너의 식단 기록 확인
          </div>
          <div className="flex items-center">
            <span className="mr-2">📊</span>
            함께하는 영양 분석
          </div>
          <div className="flex items-center">
            <span className="mr-2">🏆</span>
            커플 건강 챌린지
          </div>
        </div>
      </div>
    </div>
  );

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
          {/* Left Sidebar - 칼로리 요약 위젯 */}
          <div className="lg:col-span-1">
            <CalorieSummaryWidget
              dailyData={calorieData}
              weeklyData={weeklyData}
              userName={userName}
              partnerName="시은"
            />
          </div>

          {/* Main Feed Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Tabs */}
            <FilterTabs
              selectedFilter={selectedFilter}
              onFilterChange={handleFilterChange}
              onRefresh={handleRefresh}
              loading={initialLoading}
            />

            {/* Feed Posts with Infinite Scroll */}
            {initialLoading ? (
              /* 초기 로딩 상태 */
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-12 text-center">
                <div className="space-y-4">
                  <RefreshCw className="w-8 h-8 text-pink-500 mx-auto animate-spin" />
                  <p className="text-gray-600">식단 데이터를 불러오는 중...</p>
                </div>
              </div>
            ) : error ? (
              /* 에러 상태 */
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-12 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
                    <span className="text-2xl">😞</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">데이터 로드 실패</h3>
                  <p className="text-gray-600">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    다시 시도
                  </button>
                </div>
              </div>
            ) : selectedFilter === 'partner' && !partnerConnected ? (
              <PartnerNotConnectedMessage />
            ) : meals.length === 0 ? (
              /* 데이터 없음 상태 - 필터별로 다른 메시지 */
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-12 text-center">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-pink-100 rounded-full mx-auto flex items-center justify-center">
                    {selectedFilter === 'partner' ? (
                      <span className="text-2xl">👥</span>
                    ) : (
                      <span className="text-2xl">🍽️</span>
                    )}
                  </div>
                  {selectedFilter === 'partner' ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800">파트너의 식단이 없습니다</h3>
                      <p className="text-gray-600">파트너가 아직 식단을 추가하지 않았어요.<br />파트너에게 함께 기록해보자고 제안해보세요!</p>
                    </>
                  ) : selectedFilter === 'mine' ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800">내 식단이 없습니다</h3>
                      <p className="text-gray-600">첫 번째 식단을 추가해보세요!</p>
                      <Link
                        href="/meals/new"
                        className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        식단 추가하기
                      </Link>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-800">식단이 없습니다</h3>
                      <p className="text-gray-600">아직 기록된 식단이 없어요.<br />첫 번째 식단을 추가해보세요!</p>
                      <Link
                        href="/meals/new"
                        className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        식단 추가하기
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* 무한 스크롤 컨테이너 */
              <InfiniteScroll
                dataLength={meals.length}
                next={loadMore}
                hasMore={hasMore}
                loader={
                  <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-5 h-5 text-pink-500 animate-spin" />
                      <span className="text-gray-600">더 많은 식단을 불러오는 중...</span>
                    </div>
                  </div>
                }
                endMessage={
                  <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 text-center">
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-pink-100 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-xl">🎉</span>
                      </div>
                      <p className="text-gray-600 font-medium">모든 식단을 확인했습니다!</p>
                      <p className="text-sm text-gray-500">새로운 식단을 추가해보세요.</p>
                    </div>
                  </div>
                }
                refreshFunction={handleRefresh}
                pullDownToRefresh={false}
                className="space-y-6"
              >
                {meals.map((meal) => {
                  const isOwnPost = meal.user_id === user?.id
                  return (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      isOwnPost={isOwnPost}
                      onLike={() => handleLike(meal.id)}
                      onComment={() => handleComment(meal.id)}
                      onShare={() => handleShare(meal.id)}
                    />
                  )
                })}
              </InfiniteScroll>
            )}
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