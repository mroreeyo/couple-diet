'use client';

import { useState } from 'react';
import { MealType } from '@/types/database';
import { 
  validateMealTime, 
  getAllowedMealTypes, 
  getCurrentMealType,
  getTimeSlotInfo,
  getNextAllowedTime,
  DEFAULT_TIME_SLOTS
} from '@/lib/meal-validation';

export default function TestMealValidationPage() {
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [testTime, setTestTime] = useState('');
  const [validationResults, setValidationResults] = useState<any[]>([]);

  // 현재 시간에 대한 정보
  const currentDate = new Date();
  const currentAllowedTypes = getAllowedMealTypes(currentDate);
  const currentMealType = getCurrentMealType(currentDate);
  const timeSlotInfo = getTimeSlotInfo();

  // 테스트 실행
  const runValidationTest = () => {
    let testDate = new Date();
    
    if (testTime) {
      const [hours, minutes] = testTime.split(':').map(Number);
      testDate.setHours(hours, minutes, 0, 0);
    }

    const result = validateMealTime(selectedMealType, testDate);
    const nextAllowedTime = getNextAllowedTime(selectedMealType, testDate);
    
    const testResult = {
      timestamp: new Date().toLocaleString(),
      testTime: testDate.toLocaleTimeString(),
      mealType: selectedMealType,
      result,
      nextAllowedTime: nextAllowedTime?.toLocaleString() || 'N/A'
    };

    setValidationResults([testResult, ...validationResults]);
  };

  // 다양한 시간대 자동 테스트
  const runComprehensiveTest = () => {
    const testTimes = [
      { hour: 6, minute: 0, desc: '아침 6시' },
      { hour: 9, minute: 30, desc: '아침 9시 30분' },
      { hour: 11, minute: 0, desc: '점심 시작 11시' },
      { hour: 14, minute: 30, desc: '점심 2시 30분' },
      { hour: 17, minute: 0, desc: '저녁 시작 5시' },
      { hour: 20, minute: 30, desc: '저녁 8시 30분' },
      { hour: 23, minute: 30, desc: '늦은 밤 11시 30분' },
      { hour: 2, minute: 0, desc: '새벽 2시' }
    ];

    const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const newResults: any[] = [];

    testTimes.forEach(time => {
      mealTypes.forEach(mealType => {
        const testDate = new Date();
        testDate.setHours(time.hour, time.minute, 0, 0);
        
        const result = validateMealTime(mealType, testDate);
        
        newResults.push({
          timestamp: new Date().toLocaleString(),
          testTime: `${time.desc} (${testDate.toLocaleTimeString()})`,
          mealType,
          result,
          nextAllowedTime: getNextAllowedTime(mealType, testDate)?.toLocaleString() || 'N/A'
        });
      });
    });

    setValidationResults([...newResults, ...validationResults]);
  };

  const clearResults = () => {
    setValidationResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🕐 식사 시간대 검증 테스트
        </h1>

        {/* 현재 상태 정보 */}
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">현재 상태</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>현재 시간:</strong> {currentDate.toLocaleString()}</p>
              <p><strong>현재 식사 타입:</strong> {currentMealType || '정규 식사 시간 아님'}</p>
              <p><strong>허용된 식사:</strong> {currentAllowedTypes.join(', ')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-blue-700 mb-2">시간대별 제한:</h3>
              <ul className="space-y-1">
                <li>🌅 아침: {timeSlotInfo.breakfast}</li>
                <li>🌞 점심: {timeSlotInfo.lunch}</li>
                <li>🌙 저녁: {timeSlotInfo.dinner}</li>
                <li>🍪 스낵: {timeSlotInfo.snack}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 개별 테스트 */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">개별 테스트</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                식사 타입:
              </label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value as MealType)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="breakfast">아침</option>
                <option value="lunch">점심</option>
                <option value="dinner">저녁</option>
                <option value="snack">스낵</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                테스트 시간 (선택사항):
              </label>
              <input
                type="time"
                value={testTime}
                onChange={(e) => setTestTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="현재 시간 사용"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={runValidationTest}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                테스트 실행
              </button>
            </div>
          </div>
        </div>

        {/* 종합 테스트 */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={runComprehensiveTest}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition duration-200"
          >
            🧪 종합 테스트 실행
          </button>
          
          <button
            onClick={clearResults}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-md transition duration-200"
          >
            🗑️ 결과 지우기
          </button>
        </div>

        {/* 테스트 결과 */}
        {validationResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              테스트 결과 ({validationResults.length}개)
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.result.isValid
                      ? 'bg-green-50 border-green-400'
                      : 'bg-red-50 border-red-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">
                      {result.mealType} @ {result.testTime}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        result.result.isValid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {result.result.isValid ? '✅ 허용' : '❌ 거부'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>메시지:</strong> {result.result.message}
                  </p>
                  
                  {result.result.restrictionReason && (
                    <p className="text-sm text-red-600 mb-1">
                      <strong>제한 사유:</strong> {result.result.restrictionReason}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>허용된 식사:</strong> {result.result.allowedMealTypes.join(', ')}
                  </p>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>현재 식사 타입:</strong> {result.result.currentMealType || '없음'}
                  </p>
                  
                  <p className="text-xs text-gray-500">
                    테스트 시간: {result.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 사용법 안내 */}
        <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">💡 사용법</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>개별 테스트:</strong> 특정 식사 타입과 시간을 선택하여 테스트</li>
            <li>• <strong>종합 테스트:</strong> 모든 시간대와 식사 타입 조합을 자동으로 테스트</li>
            <li>• <strong>시간대 규칙:</strong> 아침(5-11시), 점심(11-17시), 저녁(17-23시), 스낵(24시간)</li>
            <li>• <strong>색상 코드:</strong> 초록색(허용), 빨간색(거부)</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 