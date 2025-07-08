'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/ui/loading'
import { FormButton } from '@/components/ui/button'
import { FoodAnalysisResult } from '@/types/food-analysis'
import Image from 'next/image'

function NewMealContent() {
  const router = useRouter()
  const { user } = useUser()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    setSelectedFile(file)
    setError(null)

    // 이미지 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleAnalyze = async () => {
    if (!selectedFile || !user?.id) return

    setIsAnalyzing(true)
    setError(null)

    const formData = new FormData()
    formData.append('image', selectedFile)
    formData.append('userId', user.id)
    formData.append('saveToHistory', 'true')

    try {
      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
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

    const file = event.dataTransfer.files?.[0]
    if (!file) return

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }

    // 이미지 파일 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    setSelectedFile(file)
    setError(null)

    // 이미지 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            새로운 식사 기록
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative h-64 w-full">
                  <Image
                    src={imagePreview}
                    alt="선택된 이미지"
                    fill
                    className="object-contain"
                  />
                </div>
                <FormButton
                  onClick={() => {
                    setSelectedFile(null)
                    setImagePreview(null)
                    setAnalysisResult(null)
                    setError(null)
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  이미지 삭제
                </FormButton>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  ref={fileInputRef}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700"
                >
                  이미지를 선택하거나 드래그하여 업로드하세요
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  JPG, PNG 파일 (최대 10MB)
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-4">
            <FormButton
              onClick={() => router.push('/meals')}
              className="bg-gray-500 hover:bg-gray-600"
            >
              취소
            </FormButton>
            <FormButton
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              loading={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              분석 시작
            </FormButton>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewMealPage() {
  return (
    <AuthGuard>
      <NewMealContent />
    </AuthGuard>
  )
} 