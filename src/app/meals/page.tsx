'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth'
import { useUser } from '@/hooks/useUser'
import { getMealHistory } from '@/lib/meals-history'
import { MealAnalysisRecord } from '@/types/food-analysis'
import { LoadingSpinner } from '@/components/ui/loading'
import { FormButton } from '@/components/ui/button'
import { MealCard } from '@/components/meals/MealCard'
import Link from 'next/link'

function MealHistoryContent() {
  const { user } = useUser()
  const [meals, setMeals] = useState<MealAnalysisRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const fetchMeals = async () => {
      setLoading(true)
      setError(null)

      const result = await getMealHistory({
        userId: user.id,
        includePartner: true,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })

      if (result.success && result.data) {
        setMeals(result.data)
      } else {
        setError(result.error || '식사 기록을 불러오는데 실패했습니다.')
      }

      setLoading(false)
    }

    fetchMeals()
  }, [user?.id])

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            식사 기록
          </h1>
          <Link href="/meals/new">
            <FormButton className="bg-blue-600 hover:bg-blue-700">
              새 식사 기록
            </FormButton>
          </Link>
        </div>

        {meals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">아직 기록된 식사가 없습니다.</p>
            <p className="text-gray-500 mt-2">
              새로운 식사를 기록하고 AI의 분석 결과를 확인해보세요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MealHistoryPage() {
  return (
    <AuthGuard>
      <MealHistoryContent />
    </AuthGuard>
  )
} 