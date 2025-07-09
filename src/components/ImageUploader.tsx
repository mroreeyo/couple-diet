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
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${disabled
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : imagePreview
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        onDragOver={onDragOver}
        onDrop={onDrop}
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
            <button
              onClick={handleReset}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg text-white transition-colors
                ${disabled
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
                }`}
            >
              이미지 삭제
            </button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              ref={fileInputRef}
              disabled={disabled}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={`text-lg transition-colors
                ${disabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-700'
                }`}
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
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
} 