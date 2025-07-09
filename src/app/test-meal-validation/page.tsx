'use client';

import { useState } from 'react';
import { MealType } from '@/types/database';
import { 
  validateMealTime, 
  getAllowedMealTypes, 
  getCurrentMealType,
  getTimeSlotInfo,
  getNextAllowedTime,
  DEFAULT_TIME_SLOTS,
  validateMealUpload,
  checkDuplicateMeal,
  getDailyMealSummary
} from '@/lib/meal-validation';

export default function TestMealValidationPage() {
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [testTime, setTestTime] = useState('');
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [testUserId, setTestUserId] = useState('test-user-123');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [comprehensiveResults, setComprehensiveResults] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any>(null);

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
    setComprehensiveResults([]);
  };

  // 포괄적인 검증 테스트 (시간대 + 중복)
  const runComprehensiveValidationTest = async () => {
    let testDate = new Date();
    
    if (testTime) {
      const [hours, minutes] = testTime.split(':').map(Number);
      testDate.setHours(hours, minutes, 0, 0);
    }

    try {
      const result = await validateMealUpload(testUserId, selectedMealType, testDate);
      
      const testResult = {
        timestamp: new Date().toLocaleString(),
        testTime: testDate.toLocaleTimeString(),
        mealType: selectedMealType,
        userId: testUserId,
        result,
        type: 'comprehensive'
      };

      setComprehensiveResults([testResult, ...comprehensiveResults]);
    } catch (error) {
      console.error('포괄적인 검증 테스트 오류:', error);
      alert('테스트 중 오류가 발생했습니다: ' + error);
    }
  };

  // 중복 검증만 테스트
  const runDuplicateOnlyTest = async () => {
    try {
      const result = await checkDuplicateMeal(testUserId, selectedMealType, testDate);
      
      const testResult = {
        timestamp: new Date().toLocaleString(),
        testDate,
        mealType: selectedMealType,
        userId: testUserId,
        result,
        type: 'duplicate-only'
      };

      setComprehensiveResults([testResult, ...comprehensiveResults]);
    } catch (error) {
      console.error('중복 검증 테스트 오류:', error);
      alert('테스트 중 오류가 발생했습니다: ' + error);
    }
  };

  // 일일 요약 조회
  const getDailySummaryTest = async () => {
    try {
      const summary = await getDailyMealSummary(testUserId, testDate);
      setDailySummary({
        ...summary,
        requestTime: new Date().toLocaleString(),
        testDate,
        userId: testUserId
      });
    } catch (error) {
      console.error('일일 요약 조회 오류:', error);
      alert('일일 요약 조회 중 오류가 발생했습니다: ' + error);
    }
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

        {/* 데이터베이스 검증 테스트 */}
        <div className="mb-8 p-4 bg-purple-50 rounded-lg">
          <h2 className="text-xl font-semibold text-purple-800 mb-4">🗄️ 데이터베이스 검증 테스트</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                테스트 사용자 ID:
              </label>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="test-user-123"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                테스트 날짜:
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={getDailySummaryTest}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                📊 일일 요약 조회
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={runComprehensiveValidationTest}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition duration-200"
            >
              🔍 포괄적 검증 (시간+중복)
            </button>
            
            <button
              onClick={runDuplicateOnlyTest}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-md transition duration-200"
            >
              🔄 중복 검증만
            </button>
          </div>
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

        {/* 일일 요약 결과 */}
        {dailySummary && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📊 일일 식사 요약 ({dailySummary.testDate})
            </h2>
            
            <div className="p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">아침</p>
                  <p className={`text-2xl font-bold ${dailySummary.breakfast ? 'text-green-600' : 'text-gray-400'}`}>
                    {dailySummary.breakfast ? '✅' : '⭕'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">점심</p>
                  <p className={`text-2xl font-bold ${dailySummary.lunch ? 'text-green-600' : 'text-gray-400'}`}>
                    {dailySummary.lunch ? '✅' : '⭕'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">저녁</p>
                  <p className={`text-2xl font-bold ${dailySummary.dinner ? 'text-green-600' : 'text-gray-400'}`}>
                    {dailySummary.dinner ? '✅' : '⭕'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">스낵</p>
                  <p className="text-2xl font-bold text-blue-600">{dailySummary.snackCount}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <p><strong>총 식사 수:</strong> {dailySummary.totalMeals}개</p>
                <p><strong>사용자 ID:</strong> {dailySummary.userId}</p>
                <p><strong>조회 시간:</strong> {dailySummary.requestTime}</p>
              </div>

              {dailySummary.meals.length > 0 && (
                <div>
                  <h4 className="font-semibold text-indigo-800 mb-2">식사 기록:</h4>
                  <ul className="space-y-1">
                    {dailySummary.meals.map((meal: any, index: number) => (
                      <li key={index} className="text-sm bg-white p-2 rounded">
                        <span className="font-medium">{meal.meal_name}</span>
                        <span className="text-gray-500 ml-2">({meal.meal_type})</span>
                        <span className="text-gray-400 ml-2 text-xs">
                          {new Date(meal.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 포괄적인 검증 결과 */}
        {comprehensiveResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🔍 데이터베이스 검증 결과 ({comprehensiveResults.length}개)
            </h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {comprehensiveResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.type === 'comprehensive' 
                      ? (result.result.canProceed ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400')
                      : (result.result.isDuplicate ? 'bg-orange-50 border-orange-400' : 'bg-green-50 border-green-400')
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">
                      {result.type === 'comprehensive' ? '🔍 포괄적 검증' : '🔄 중복 검증'} - 
                      {result.mealType} @ {result.testTime || result.testDate}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        result.type === 'comprehensive'
                          ? (result.result.canProceed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
                          : (result.result.isDuplicate ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800')
                      }`}
                    >
                      {result.type === 'comprehensive' 
                        ? (result.result.canProceed ? '✅ 업로드 가능' : '❌ 업로드 불가')
                        : (result.result.isDuplicate ? '⚠️ 중복됨' : '✅ 중복 없음')
                      }
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>결과 메시지:</strong> {result.result.message}
                  </p>
                  
                  {result.type === 'comprehensive' && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>시간대 검증:</strong> {result.result.timeValidation.isValid ? '✅ 통과' : '❌ 실패'}</p>
                      <p><strong>중복 검증:</strong> {result.result.duplicateValidation.isDuplicate ? '❌ 중복됨' : '✅ 중복 없음'}</p>
                      {result.result.timeValidation.restrictionReason && (
                        <p className="text-red-600"><strong>시간 제한:</strong> {result.result.timeValidation.restrictionReason}</p>
                      )}
                    </div>
                  )}

                  {result.result.existingMeal && (
                    <div className="mt-2 p-2 bg-yellow-100 rounded text-sm">
                      <p><strong>기존 식사:</strong> {result.result.existingMeal.meal_name}</p>
                      <p><strong>업로드 시간:</strong> {new Date(result.result.existingMeal.created_at).toLocaleString()}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    테스트 시간: {result.timestamp} | 사용자: {result.userId}
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
            <li>• <strong>포괄적 검증:</strong> 시간대 + 데이터베이스 중복 검증을 모두 수행</li>
            <li>• <strong>중복 검증:</strong> 데이터베이스에서 중복 업로드 여부만 확인</li>
            <li>• <strong>일일 요약:</strong> 특정 날짜의 사용자 식사 기록 요약 조회</li>
            <li>• <strong>시간대 규칙:</strong> 아침(5-11시), 점심(11-17시), 저녁(17-23시), 스낵(24시간)</li>
            <li>• <strong>색상 코드:</strong> 초록색(허용), 빨간색(거부), 주황색(중복)</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 