'use client'

import { useState } from 'react'
import { MealValidationStatus } from '@/components/meals/MealValidationStatus'

export default function TestRealtimeValidationPage() {
  const [validationState, setValidationState] = useState({
    isValid: true,
    restrictions: [] as string[]
  })

  const handleValidationChange = (isValid: boolean, restrictions: string[]) => {
    setValidationState({ isValid, restrictions })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">실시간 검증 시스템 테스트</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 실시간 검증 상태 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">실시간 검증 상태</h2>
          <MealValidationStatus 
            onValidationChange={handleValidationChange}
          />
        </div>

        {/* 검증 결과 표시 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">검증 결과</h2>
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="font-medium">검증 상태:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                validationState.isValid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {validationState.isValid ? '✅ 업로드 가능' : '❌ 업로드 제한'}
              </span>
            </div>

            {validationState.restrictions.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-2">제한사항:</p>
                <ul className="space-y-1">
                  {validationState.restrictions.map((restriction, index) => (
                    <li 
                      key={index}
                      className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded"
                    >
                      • {restriction}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationState.isValid && (
              <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                ✅ 현재 식사를 업로드할 수 있습니다!
              </div>
            )}
          </div>

          {/* 테스트 설명 */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">테스트 방법</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 현재 시간에 따라 허용된 식사 타입이 실시간으로 표시됩니다</li>
              <li>• 이미 업로드한 식사가 있으면 중복 제한이 표시됩니다</li>
              <li>• 정규 식사 시간이 아니면 간식만 업로드 가능합니다</li>
              <li>• 1분마다 시간이 업데이트되어 상태가 변경될 수 있습니다</li>
              <li>• 식사를 업로드하면 실시간으로 상태가 반영됩니다</li>
            </ul>
          </div>

          {/* 현재 시간 정보 */}
          <div className="mt-4 bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">현재 시간 정보</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>현재 시간: {new Date().toLocaleString('ko-KR')}</p>
              <p>시간대별 식사 제한:</p>
              <div className="ml-4 space-y-0.5">
                <p>🌅 아침: 5:00 - 11:00</p>
                <p>🌞 점심: 11:00 - 17:00</p>
                <p>🌙 저녁: 17:00 - 23:00</p>
                <p>🍎 간식: 24시간 가능</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="mt-8 flex space-x-4">
        <a
          href="/meals/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          실제 식사 업로드 페이지로 이동
        </a>
        <a
          href="/test-meal-notifications"
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          알림 시스템 테스트
        </a>
      </div>
    </div>
  )
} 