'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Meal {
  id: string
  couple_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_date: string
  logged_by: string
  description?: string
  notes?: string
  created_at: string
}

interface TestResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export default function TestMealsSchema() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  
  // 테스트용 입력값들
  const [newCoupleId, setNewCoupleId] = useState('')
  const [newMealType, setNewMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [newDescription, setNewDescription] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newLoggedBy, setNewLoggedBy] = useState('')
  const [newMealDate, setNewMealDate] = useState('')

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result])
  }

  const fetchMeals = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('meal_date', { ascending: false })

      if (error) {
        addTestResult({
          success: false,
          message: `식사 목록 조회 실패: ${error.message}`
        })
      } else {
        setMeals(data || [])
        addTestResult({
          success: true,
          message: `식사 목록 조회 성공: ${data?.length || 0}개`
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `식사 목록 조회 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const createMeal = async () => {
    if (!newCoupleId || !newLoggedBy || !newMealDate) {
      addTestResult({
        success: false,
        message: '커플 ID, 기록자 ID, 식사 날짜를 모두 입력해주세요'
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('meals')
        .insert([{
          couple_id: newCoupleId,
          meal_type: newMealType,
          meal_date: newMealDate,
          logged_by: newLoggedBy,
          description: newDescription || null,
          notes: newNotes || null
        }])
        .select()
        .single()

      if (error) {
        addTestResult({
          success: false,
          message: `식사 기록 생성 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: '식사 기록 생성 성공',
          data: { meal: data }
        })
        fetchMeals()
        // 입력값 초기화
        setNewCoupleId('')
        setNewMealType('breakfast')
        setNewDescription('')
        setNewNotes('')
        setNewLoggedBy('')
        setNewMealDate('')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `식사 기록 생성 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const updateMeal = async (mealId: string, description: string, notes: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('meals')
        .update({ 
          description: description || null,
          notes: notes || null
        })
        .eq('id', mealId)
        .select()
        .single()

      if (error) {
        addTestResult({
          success: false,
          message: `식사 기록 업데이트 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: '식사 기록 업데이트 성공',
          data: { meal: data }
        })
        fetchMeals()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `식사 기록 업데이트 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteMeal = async (mealId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)

      if (error) {
        addTestResult({
          success: false,
          message: `식사 기록 삭제 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: '식사 기록 삭제 성공'
        })
        fetchMeals()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `식사 기록 삭제 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  useEffect(() => {
    fetchMeals()
    // 기본값으로 오늘 날짜 설정
    const today = new Date().toISOString().split('T')[0]
    setNewMealDate(today)
  }, [fetchMeals])

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-800'
      case 'lunch': return 'bg-green-100 text-green-800'
      case 'dinner': return 'bg-blue-100 text-blue-800'
      case 'snack': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">식사 스키마 테스트</h1>
      
      {/* 새 식사 기록 생성 */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-3">새 식사 기록 생성</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">커플 ID</label>
            <input
              type="text"
              value={newCoupleId}
              onChange={(e) => setNewCoupleId(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Couple UUID"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">기록자 ID</label>
            <input
              type="text"
              value={newLoggedBy}
              onChange={(e) => setNewLoggedBy(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="User UUID"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">식사 유형</label>
            <select
              value={newMealType}
              onChange={(e) => setNewMealType(e.target.value as 'breakfast' | 'lunch' | 'dinner' | 'snack')}
              className="w-full px-3 py-2 border rounded"
              disabled={loading}
            >
              <option value="breakfast">아침</option>
              <option value="lunch">점심</option>
              <option value="dinner">저녁</option>
              <option value="snack">간식</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">식사 날짜</label>
            <input
              type="date"
              value={newMealDate}
              onChange={(e) => setNewMealDate(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">식사 설명</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="예: 삼겹살 구이"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">메모</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="추가 메모"
              disabled={loading}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={createMeal}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            {loading ? '생성 중...' : '식사 기록 생성'}
          </button>
        </div>
      </div>

      {/* 식사 목록 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">식사 기록 목록</h2>
          <button
            onClick={fetchMeals}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
        
        {meals.length === 0 ? (
          <p className="text-gray-500">등록된 식사 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <div key={meal.id} className="border rounded p-4 bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>ID:</strong> {meal.id}</p>
                    <p><strong>커플 ID:</strong> {meal.couple_id}</p>
                    <p><strong>기록자:</strong> {meal.logged_by}</p>
                    <p><strong>식사 유형:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-sm ${getMealTypeColor(meal.meal_type)}`}>
                        {meal.meal_type}
                      </span>
                    </p>
                    <p><strong>식사 날짜:</strong> {meal.meal_date}</p>
                    <p><strong>생성 시간:</strong> {new Date(meal.created_at).toLocaleString()}</p>
                    {meal.description && (
                      <p><strong>설명:</strong> {meal.description}</p>
                    )}
                    {meal.notes && (
                      <p><strong>메모:</strong> {meal.notes}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const newDesc = prompt('새 설명을 입력하세요:', meal.description || '')
                        const newNotes = prompt('새 메모를 입력하세요:', meal.notes || '')
                        if (newDesc !== null && newNotes !== null) {
                          updateMeal(meal.id, newDesc, newNotes)
                        }
                      }}
                      disabled={loading}
                      className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:bg-gray-400"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteMeal(meal.id)}
                      disabled={loading}
                      className="w-full px-3 py-1 bg-red-500 text-white rounded text-sm disabled:bg-gray-400"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 테스트 결과 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">테스트 결과</h2>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm"
          >
            결과 지우기
          </button>
        </div>
        
        {testResults.length === 0 ? (
          <p className="text-gray-500">아직 테스트 결과가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                <p>{result.message}</p>
                {result.data && (
                  <pre className="mt-2 text-sm overflow-auto bg-gray-100 p-2 rounded">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium text-gray-800 mb-2">테스트 가이드:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 커플 ID는 실제 couples 테이블의 UUID여야 합니다</li>
          <li>• 기록자 ID는 실제 users 테이블의 UUID여야 합니다</li>
          <li>• 식사 날짜는 YYYY-MM-DD 형식으로 입력됩니다</li>
          <li>• 설명과 메모는 선택사항입니다</li>
          <li>• 각 커플의 구성원만 해당 커플의 식사 기록을 볼 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
} 