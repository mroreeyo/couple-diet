'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FoodAnalysisResult } from '@/types/food-analysis'
import { ImageUploader } from '@/components/ImageUploader'

function NewMealContent() {
  const router = useRouter()
  const { user } = useUser()
  const supabase = createClientComponentClient()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null)

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setError(null)
    setAnalysisResult(null)
  }, [])

  const handleAnalyze = async () => {
    if (!selectedFile || !user?.id) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        setError('인증 세션을 가져올 수 없습니다. 다시 로그인해주세요.')
        return
      }

      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('save_to_history', 'true')
      formData.append('save_images', 'true')

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const result = await response.json()

      if (result.success && result.data) {
        setAnalysisResult(result.data)
        // 분석이 완료되면 목록 페이지로 이동
        router.push('/meals')
      } else {
        setError(result.error || '음식 분석에 실패했습니다.')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      setError('음식 분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">새로운 식사 기록</h1>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 이미지 업로드 섹션 */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-4">📸 음식 사진 업로드</h2>
            <ImageUploader
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              disabled={isAnalyzing}
            />
          </div>

          {/* 분석 버튼 및 상태 */}
          <div className="p-6 bg-gray-50">
            <button
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors
                ${!selectedFile || isAnalyzing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner className="w-5 h-5" />
                  <span className="ml-2">분석 중...</span>
                </div>
              ) : (
                '음식 분석하기'
              )}
            </button>

            {/* 에러 메시지 */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* 분석 결과 */}
            {analysisResult && (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    🍽️ 분석 완료!
                  </h3>
                  <div className="text-sm text-green-700">
                    <p><strong>총 칼로리:</strong> {analysisResult.total_calories} kcal</p>
                    <p><strong>식사 타입:</strong> {analysisResult.meal_type || '미분류'}</p>
                    <p><strong>분석 신뢰도:</strong> {Math.round(analysisResult.analysis_confidence * 100)}%</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">인식된 음식</h3>
                  {analysisResult.foods.map((food, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{food.name}</span>
                        <span className="text-sm text-gray-500">
                          신뢰도: {Math.round(food.confidence * 100)}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <span>{food.amount}</span>
                        <span className="ml-4 font-medium">
                          {Math.round(food.calories)} kcal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewMealPage() {
  return <NewMealContent />
} 