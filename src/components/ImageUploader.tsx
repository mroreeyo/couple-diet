'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'

interface ImageUploaderProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onDragOver: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void
  disabled?: boolean
}

export function ImageUploader({
  onFileSelect,
  selectedFile,
  onDragOver,
  onDrop,
  disabled = false
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

    // 이미지 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setError(null)
    onFileSelect(file)
  }, [onFileSelect])

  const handleReset = useCallback(() => {
    setImagePreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all duration-200 relative overflow-hidden touch-manipulation
          ${disabled
            ? 'border-gray-300/50 bg-gray-50/50 cursor-not-allowed opacity-50'
            : imagePreview
              ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-50/80 to-green-50/80 shadow-lg'
              : 'border-purple-300/60 bg-gradient-to-br from-purple-50/50 to-pink-50/50 active:border-purple-400/80 active:bg-gradient-to-br active:from-purple-100/60 active:to-pink-100/60 active:shadow-lg cursor-pointer'
          }`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {/* 모바일용 간단한 배경 데코레이션 */}
        {!imagePreview && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-sm"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 bg-gradient-to-br from-pink-200 to-orange-200 rounded-full blur-sm"></div>
          </div>
        )}
        {imagePreview ? (
          <div className="space-y-4 relative z-10">
            <div className="relative h-48 w-full bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-white/20">
              <Image
                src={imagePreview}
                alt="선택된 이미지"
                fill
                className="object-contain p-2"
              />
              {/* 성공 체크마크 */}
              <div className="absolute top-2 right-2 w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-sm">✓</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-xs">📷</span>
              </div>
              <p className="text-emerald-700 font-medium text-sm">선택 완료!</p>
            </div>

            <button
              onClick={handleReset}
              disabled={disabled}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 min-h-[48px] ${disabled
                  ? 'bg-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-red-500 to-pink-600 active:from-red-600 active:to-pink-700 text-white shadow-md active:shadow-sm active:scale-95'
                }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span>🗑️</span>
                <span>이미지 삭제</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="relative z-10">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              ref={fileInputRef}
              disabled={disabled}
            />
            
            {/* 메인 아이콘 */}
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                <span className="text-2xl">📷</span>
              </div>
              <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mx-auto"></div>
            </div>

            {/* 터치 버튼 영역 */}
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className={`w-full py-4 px-4 rounded-xl font-medium transition-all duration-200 min-h-[48px] ${disabled
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'bg-gradient-to-r from-purple-500 to-pink-600 active:from-purple-600 active:to-pink-700 text-white shadow-md active:shadow-sm active:scale-95'
                  }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-lg font-semibold">📱 터치해서 사진 선택</span>
                  <span className="text-sm opacity-90">갤러리 또는 카메라</span>
                </div>
              </button>
              
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  <span>JPG, PNG</span>
                  <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                  <span>최대 10MB</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-gradient-to-br from-red-50/80 to-pink-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">⚠️</span>
            </div>
            <div className="flex-1">
              <p className="text-red-700 font-medium text-sm">{error}</p>
              <p className="text-red-600 text-xs mt-0.5 opacity-80">다시 시도해주세요</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 