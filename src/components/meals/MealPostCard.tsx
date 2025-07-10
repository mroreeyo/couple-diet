'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, Share, Clock, Utensils, Flame, User } from 'lucide-react'
import { useState } from 'react'
import { MealAnalysisRecord } from '@/types/food-analysis'

interface MealPostCardProps {
  meal: MealAnalysisRecord
  isOwnPost?: boolean
  authorName?: string
  authorEmail?: string
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
  likesCount?: number
  commentsCount?: number
  isLiked?: boolean
}

export function MealPostCard({ 
  meal, 
  isOwnPost = false,
  authorName,
  authorEmail,
  onLike,
  onComment,
  onShare,
  likesCount = 0,
  commentsCount = 0,
  isLiked = false
}: MealPostCardProps) {
  const [imageLoading, setImageLoading] = useState(true)
  
  const date = new Date(meal.created_at || new Date().toISOString())
  const formattedDate = new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  const timeAgo = getTimeAgo(date)
  
  const displayName = authorName || authorEmail?.split('@')[0] || '사용자'
  const mealTypeEmoji = {
    breakfast: '🌅',
    lunch: '☀️', 
    dinner: '🌙',
    snack: '🍪'
  }[meal.meal_type] || '🍽️'

  const foods = meal.analysis_result?.foods || []
  const totalCalories = Math.round(meal.total_calories || 0)

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      {/* Header - 사용자 정보 */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
            isOwnPost 
              ? 'bg-gradient-to-r from-pink-500 to-orange-500' 
              : 'bg-gradient-to-r from-purple-500 to-blue-500'
          }`}>
            {isOwnPost ? (
              <User className="w-5 h-5" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-800">
                {isOwnPost ? '나' : displayName}
              </span>
              <span className="text-lg">{mealTypeEmoji}</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium px-2 py-1 bg-gradient-to-r from-pink-100 to-orange-100 text-pink-700 rounded-full capitalize">
            {meal.meal_type}
          </span>
        </div>
      </div>

      {/* 이미지 */}
      {meal.image_url && (
        <Link href={`/meals/${meal.id}`} className="block relative">
          <div className="relative h-64 w-full overflow-hidden group cursor-pointer">
            {imageLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
            )}
            <Image
              src={meal.image_url}
              alt={foods.length > 0 ? foods.map(f => f.name).join(', ') : '식사 이미지'}
              fill
              className={`object-cover transition-all duration-300 group-hover:scale-105 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoadingComplete={() => setImageLoading(false)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </Link>
      )}

      {/* 내용 */}
      <div className="p-4">
        {/* 음식 정보 */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Utensils className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">메뉴</span>
          </div>
          {foods.length > 0 ? (
            <p className="text-gray-800 leading-relaxed">
              {foods.map(f => f?.name || '알 수 없는 음식').join(', ')}
            </p>
          ) : (
            <p className="text-gray-500 italic">음식 정보가 없습니다</p>
          )}
        </div>

        {/* 칼로리 정보 */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">총 칼로리</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {totalCalories} kcal
            </span>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              onClick={onLike}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                isLiked 
                  ? 'bg-pink-100 text-pink-600' 
                  : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>
            
            <button
              onClick={onComment}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{commentsCount}</span>
            </button>
          </div>
          
          <button
            onClick={onShare}
            className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Share className="w-4 h-4" />
            <span className="text-sm font-medium">공유</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// 시간 차이 계산 함수
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return '방금 전'
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`
  if (diffInHours < 24) return `${diffInHours}시간 전`
  if (diffInDays < 7) return `${diffInDays}일 전`
  
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
} 