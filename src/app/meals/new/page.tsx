'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FoodAnalysisResult } from '@/types/food-analysis'
import { ImageUploader } from '@/components/ImageUploader'
import { useMealValidationNotifier } from '@/components/meals/MealValidationNotifier'
import { MealValidationStatus } from '@/components/meals/MealValidationStatus'

function NewMealContent() {
  const router = useRouter()
  const { user } = useUser()
  const supabase = createClientComponentClient()
  
  const { notifyFromAPIResponse } = useMealValidationNotifier({
    onViewExistingMeal: (mealId) => {
      router.push(`/meals/${mealId}`)
    }
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null)
  const [realTimeValidation, setRealTimeValidation] = useState({
    isValid: true,
    restrictions: [] as string[]
  })

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setError(null)
    setAnalysisResult(null)
  }, [])

  const handleValidationChange = useCallback((isValid: boolean, restrictions: string[]) => {
    setRealTimeValidation({ isValid, restrictions })
  }, [])

  const handleAnalyze = async () => {
    if (!selectedFile || !user?.id) return

    // 실시간 검증에서 제한사항이 있다면 경고
    if (!realTimeValidation.isValid && realTimeValidation.restrictions.length > 0) {
      setError(`업로드가 제한됩니다: ${realTimeValidation.restrictions.join(', ')}`)
      return
    }

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

      // 알림 시스템을 통해 API 응답 처리
      notifyFromAPIResponse(result)

      if (result.success && result.data) {
        setAnalysisResult(result.data)
        // 성공적으로 저장된 경우에만 목록 페이지로 이동
        setTimeout(() => {
          router.push('/meals')
        }, 2000) // 성공 알림을 보여준 후 이동
      } else if (result.success === false && !result.validation) {
        // 검증 관련이 아닌 일반 에러만 여기서 처리
        setError(result.error || '음식 분석에 실패했습니다.')
      } else if (result.analysis) {
        // 분석은 성공했지만 저장은 실패한 경우 분석 결과는 표시
        setAnalysisResult(result.analysis)
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

  // 업로드 버튼 비활성화 조건
  const isUploadDisabled = !selectedFile || isAnalyzing || (!realTimeValidation.isValid && realTimeValidation.restrictions.length > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-orange-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-200/30 to-yellow-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-gradient-to-br from-pink-100/20 to-orange-100/20 rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* 네비게이션 헤더 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-6 mb-8 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-white/70 hover:bg-white hover:scale-105 active:scale-95 text-gray-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">뒤로가기</span>
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 px-4 py-2 bg-white/70 hover:bg-white hover:scale-105 active:scale-95 text-gray-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">홈으로</span>
            </button>
            
            <button
              onClick={() => router.push('/meals')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 hover:scale-105 active:scale-95 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="font-medium">식사 목록</span>
            </button>
          </div>
        </div>

        {/* 헤더 타이틀 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg hover:scale-110 transition-transform duration-300">
            <span className="text-2xl">🍽️</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent mb-2">
            새로운 식사 기록
          </h1>
          <p className="text-gray-600">AI가 분석해주는 스마트한 식단 관리</p>
        </div>

              <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 실시간 검증 상태 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sticky top-4 transition-all duration-300 hover:shadow-3xl hover:scale-[1.02]">
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                  <span className="text-xl">✅</span>
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  실시간 검증
                </h3>
                <p className="text-sm text-gray-600 mt-1">업로드 전 미리 확인</p>
              </div>
              <MealValidationStatus 
                onValidationChange={handleValidationChange}
                className=""
              />
            </div>
          </div>

          {/* 메인 업로드 폼 */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-300 hover:shadow-3xl hover:scale-[1.01]">
                          {/* 이미지 업로드 섹션 */}
              <div className="p-8 border-b border-gray-100/50">
                <div className="text-center mb-6">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-xl">📸</span>
                  </div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    음식 사진 업로드
                  </h2>
                  <p className="text-sm text-gray-600">사진을 업로드하면 AI가 자동으로 분석해드려요</p>
                </div>
                <ImageUploader
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  disabled={isAnalyzing}
                />
              </div>

              {/* 분석 버튼 및 상태 */}
              <div className="p-8 bg-gradient-to-br from-gray-50/50 to-gray-100/30">
                              <button
                  onClick={handleAnalyze}
                  disabled={isUploadDisabled}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-white transition-all duration-300 transform ${isUploadDisabled
                      ? 'bg-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
                    }`}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner className="w-6 h-6" />
                      <span className="ml-3 text-lg">AI 분석 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-xl">🤖</span>
                      <span className="text-lg">AI 음식 분석하기</span>
                    </div>
                  )}
                </button>

                              {/* 실시간 검증 경고 */}
                {!realTimeValidation.isValid && realTimeValidation.restrictions.length > 0 && (
                  <div className="mt-6 p-6 bg-gradient-to-br from-yellow-50/80 to-orange-50/80 backdrop-blur-sm border border-yellow-200/50 rounded-2xl shadow-lg">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm">⚠️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-yellow-800 mb-2">업로드 제한</p>
                        <ul className="text-sm text-yellow-700 space-y-1.5">
                          {realTimeValidation.restrictions.map((restriction, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                              <span>{restriction}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm text-yellow-600 mt-3 font-medium">
                          위 제한사항이 해결되면 업로드가 가능합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 에러 메시지 */}
                {error && (
                  <div className="mt-6 p-6 bg-gradient-to-br from-red-50/80 to-pink-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl shadow-lg">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm">❌</span>
                      </div>
                      <p className="text-red-700 font-medium flex-1">{error}</p>
                    </div>
                  </div>
                )}

                              {/* 분석 결과 */}
                {analysisResult && (
                  <div className="mt-8 space-y-6">
                    <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-xl">🍽️</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            분석 완료!
                          </h3>
                          <p className="text-sm text-green-700">AI가 음식을 성공적으로 분석했습니다</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white/50 rounded-xl">
                          <p className="text-2xl font-bold text-green-800">{analysisResult.total_calories}</p>
                          <p className="text-xs text-green-600 font-medium">칼로리 (kcal)</p>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-xl">
                          <p className="text-lg font-bold text-green-800">{analysisResult.meal_type || '미분류'}</p>
                          <p className="text-xs text-green-600 font-medium">식사 타입</p>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-xl">
                          <p className="text-2xl font-bold text-green-800">{Math.round(analysisResult.analysis_confidence * 100)}%</p>
                          <p className="text-xs text-green-600 font-medium">분석 신뢰도</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                          인식된 음식
                        </h3>
                        <p className="text-sm text-gray-600">총 {analysisResult.foods.length}개의 음식을 발견했어요</p>
                      </div>
                      {analysisResult.foods.map((food, index) => (
                        <div key={index} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                                <span className="text-lg">🥘</span>
                              </div>
                              <div>
                                <span className="text-lg font-bold text-gray-800">{food.name}</span>
                                <p className="text-sm text-gray-600">{food.amount}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-orange-600">{Math.round(food.calories)} kcal</p>
                              <p className="text-xs text-gray-500">신뢰도: {Math.round(food.confidence * 100)}%</p>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${food.confidence * 100}%` }}
                            ></div>
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
      </div>
    </div>
  )
}

export default function NewMealPage() {
  return <NewMealContent />
} 