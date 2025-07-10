'use client'

import { useState } from 'react'

interface ApiResponse {
  success: boolean
  data?: unknown
  message?: string
  error?: string
}

interface ApiResult {
  status?: number
  statusText?: string
  data?: ApiResponse
  error?: string
}

export default function TestAPIEndpointsPage() {
  const [authToken, setAuthToken] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [testImage, setTestImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 기존 API 테스트 함수들...
  const testAuthAPI = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      setTestResults([{
        endpoint: '/api/auth/me',
        status: response.status,
        data,
        timestamp: new Date().toLocaleString()
      }, ...testResults]);
    } catch (error) {
      console.error('Auth API test failed:', error);
    }
  };

  // **ADD MEAL VALIDATION API TEST**
  const testMealValidationAPI = async () => {
    if (!testImage || !authToken) {
      alert('인증 토큰과 테스트 이미지를 모두 제공해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', testImage);
      formData.append('save_to_history', 'true'); // 검증 로직이 실행되도록 설정
      formData.append('save_images', 'false');

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      
      const testResult = {
        endpoint: '/api/meals/analyze (with validation)',
        status: response.status,
        data,
        validationResult: data.validation || null,
        timestamp: new Date().toLocaleString(),
        testType: 'meal-validation'
      };

      setTestResults([testResult, ...testResults]);
    } catch (error) {
      console.error('Meal validation API test failed:', error);
             setTestResults([{
         endpoint: '/api/meals/analyze (with validation)',
         status: 'ERROR',
         data: { error: error instanceof Error ? error.message : 'Unknown error' },
         timestamp: new Date().toLocaleString(),
         testType: 'meal-validation'
       }, ...testResults]);
    } finally {
      setIsLoading(false);
    }
  };

  // 분석만 수행 (저장하지 않음)
  const testMealAnalysisOnly = async () => {
    if (!testImage || !authToken) {
      alert('인증 토큰과 테스트 이미지를 모두 제공해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', testImage);
      formData.append('save_to_history', 'false'); // 검증 로직 우회
      formData.append('save_images', 'false');

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      
      const testResult = {
        endpoint: '/api/meals/analyze (analysis only)',
        status: response.status,
        data,
        timestamp: new Date().toLocaleString(),
        testType: 'analysis-only'
      };

      setTestResults([testResult, ...testResults]);
    } catch (error) {
      console.error('Meal analysis API test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTestImage(file);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🔧 API 엔드포인트 테스트
        </h1>

        {/* 인증 토큰 설정 */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">인증 설정</h2>
          <div className="flex gap-4">
            <input
              type="password"
              placeholder="Bearer 토큰을 입력하세요"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={testAuthAPI}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              인증 테스트
            </button>
          </div>
        </div>

        {/* **ADD MEAL VALIDATION TEST SECTION** */}
        <div className="mb-8 p-4 bg-yellow-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🍽️ 식사 검증 API 테스트</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                테스트 이미지:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {testImage && (
                <p className="text-sm text-gray-600 mt-1">
                  선택된 파일: {testImage.name} ({(testImage.size / 1024).toFixed(1)}KB)
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예상 식사 타입:
              </label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="breakfast">아침</option>
                <option value="lunch">점심</option>
                <option value="dinner">저녁</option>
                <option value="snack">스낵</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={testMealValidationAPI}
              disabled={isLoading || !testImage || !authToken}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
            >
              {isLoading ? '검증 중...' : '검증 + 저장 테스트'}
            </button>
            
            <button
              onClick={testMealAnalysisOnly}
              disabled={isLoading || !testImage || !authToken}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            >
              {isLoading ? '분석 중...' : '분석만 테스트'}
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              결과 지우기
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">테스트 안내:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>검증 + 저장 테스트</strong>: 시간대 및 중복 검증 후 저장 (Task 6.3 기능)</li>
              <li>• <strong>분석만 테스트</strong>: 검증 없이 이미지 분석만 수행</li>
              <li>• 시간대 제한: 아침(5-11시), 점심(11-17시), 저녁(17-23시), 스낵(24시간)</li>
              <li>• 같은 날짜에 동일한 식사 타입 중복 업로드 방지</li>
            </ul>
          </div>
        </div>

        {/* 테스트 결과 */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">테스트 결과</h2>
          
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              아직 테스트를 실행하지 않았습니다.
            </p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    result.status === 200 ? 'bg-green-50 border-green-200' :
                    result.status === 422 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-800">
                      {result.endpoint}
                    </h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        result.status === 200 ? 'bg-green-100 text-green-800' :
                        result.status === 422 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {result.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* 검증 결과 특별 표시 */}
                  {result.validationResult && (
                    <div className="mb-3 p-3 bg-white rounded border">
                      <h4 className="font-semibold text-gray-700 mb-2">🛡️ 검증 결과:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <strong>시간대 검증:</strong>
                          <div className={`ml-2 ${result.validationResult.timeValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {result.validationResult.timeValidation.isValid ? '✅ 통과' : '❌ 실패'}
                            <div className="text-gray-600 mt-1">
                              {result.validationResult.timeValidation.message}
                            </div>
                          </div>
                        </div>
                        <div>
                          <strong>중복 검증:</strong>
                          <div className={`ml-2 ${!result.validationResult.duplicateValidation.isDuplicate ? 'text-green-600' : 'text-red-600'}`}>
                            {!result.validationResult.duplicateValidation.isDuplicate ? '✅ 통과' : '❌ 중복'}
                            <div className="text-gray-600 mt-1">
                              {result.validationResult.duplicateValidation.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 