'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/ui/loading'
import { FormButton } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { MealAnalysisRecord } from '@/types/food-analysis'
import { deleteMeal } from '@/lib/meals-history'
import Image from 'next/image'

function MealDetailContent() {
  const router = useRouter()
  const { id } = useParams()
  const { user } = useUser()
  const [meal, setMeal] = useState<MealAnalysisRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!user?.id || !id) return

    const fetchMeal = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        if (!data) {
          setError('식사 기록을 찾을 수 없습니다.')
          return
        }

        setMeal(data)
      } catch (error) {
        console.error('Error fetching meal:', error)
        setError('식사 기록을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchMeal()
  }, [user?.id, id])

  const handleDelete = async () => {
    if (!meal?.id || isDeleting) return

    if (!confirm('정말로 이 식사 기록을 삭제하시겠습니까?')) {
      return
    }

    setIsDeleting(true)
    setError(null)

    const result = await deleteMeal(meal.id)

    if (result.success) {
      router.push('/meals')
    } else {
      setError(result.error || '식사 기록 삭제에 실패했습니다.')
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
            <span className="ml-2">식사 기록을 불러오는 중...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
            식사 기록을 찾을 수 없습니다.
          </div>
        </div>
      </div>
    )
  }

  const date = new Date(meal.created_at || new Date().toISOString())
  const formattedDate = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            식사 상세 정보
          </h1>
          <div className="flex space-x-4">
            <FormButton
              onClick={() => router.push('/meals')}
              className="bg-gray-500 hover:bg-gray-600"
            >
              목록으로
            </FormButton>
            <FormButton
              onClick={handleDelete}
              loading={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </FormButton>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {meal.image_url && (
            <div className="relative h-96 w-full">
              <Image
                src={meal.image_url}
                alt="식사 이미지"
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <p className="text-gray-500 mb-4">{formattedDate}</p>

            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">분석 결과</h2>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-900">
                    총 칼로리: <span className="font-semibold">{Math.round(meal.total_calories || 0)} kcal</span>
                  </p>
                </div>
              </div>

              {meal.analysis_result.foods && meal.analysis_result.foods.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">인식된 음식</h2>
                  <div className="space-y-3">
                    {meal.analysis_result.foods.map((food, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{food.name}</span>
                          <span className="text-sm text-gray-500">
                            신뢰도: {Math.round(food.confidence * 100)}%
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span>{food.amount}</span>
                          {food.calories && (
                            <span className="ml-4 font-medium">
                              {Math.round(food.calories)} kcal
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meal.analysis_result.nutritional_info && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">영양 정보</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(meal.analysis_result.nutritional_info).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}: </span>
                          <span>{typeof value === 'number' ? Math.round(value) : value}</span>
                        </div>
                      ))}
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

export default function MealDetailPage() {
  return (
    <AuthGuard>
      <MealDetailContent />
    </AuthGuard>
  )
} 