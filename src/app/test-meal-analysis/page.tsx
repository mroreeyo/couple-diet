'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Alert } from '@/components/auth/alert';
import { LoadingSpinner } from '@/components/auth/loading-spinner';
import { FormButton } from '@/components/auth/form-button';
import { PerformanceBenchmark } from '@/components/test/performance-benchmark';
import { SecurityTester } from '@/components/test/security-tester';

interface FoodItem {
  name: string;
  calories: number;
  amount: string;
  confidence: number;
}

interface AnalysisResult {
  foods: FoodItem[];
  total_calories: number;
  meal_type?: string;
  analysis_confidence: number;
  analyzed_at: string;
}

interface TestLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  fileName: string;
  fileSize: string;
  processingTime?: number;
  result?: AnalysisResult;
  error?: string;
  performanceMetrics?: {
    responseTime: number;
    memoryUsage?: string;
    compressionRatio?: string;
  };
}

export default function TestMealAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [saveImages, setSaveImages] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const [testStats, setTestStats] = useState({
    totalTests: 0,
    successCount: 0,
    errorCount: 0,
    avgResponseTime: 0
  });
  const [activeTab, setActiveTab] = useState<'basic' | 'performance' | 'security'>('basic');
  const [testImages, setTestImages] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기가 10MB를 초과합니다.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP 파일을 사용해주세요.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleMultiFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}: 파일 크기가 10MB를 초과합니다.`);
        return false;
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(`${file.name}: 지원하지 않는 이미지 형식입니다.`);
        return false;
      }

      return true;
    });

    setTestImages(validFiles);
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!selectedFile || !authToken.trim()) {
      alert('이미지와 인증 토큰을 모두 입력해주세요.');
      return;
    }

    setIsAnalyzing(true);
    const startTime = performance.now();

    const testLog: TestLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      status: 'pending',
      fileName: selectedFile.name,
      fileSize: formatFileSize(selectedFile.size)
    };

    setTestLogs(prev => [testLog, ...prev]);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('save_to_history', saveToHistory.toString());
      formData.append('save_images', saveImages.toString());

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);

      const data = await response.json();

      if (response.ok && data.success) {
        const result: AnalysisResult = data.data;
        setAnalysisResult(result);

        const updatedLog: TestLog = {
          ...testLog,
          status: 'success',
          processingTime,
          result,
          performanceMetrics: {
            responseTime: processingTime
          }
        };

        setTestLogs(prev => [updatedLog, ...prev.slice(1)]);
        setTestStats(prev => ({
          totalTests: prev.totalTests + 1,
          successCount: prev.successCount + 1,
          errorCount: prev.errorCount,
          avgResponseTime: Math.round((prev.avgResponseTime * prev.totalTests + processingTime) / (prev.totalTests + 1))
        }));

      } else {
        const errorMessage = data.error || `HTTP ${response.status}`;
        const updatedLog: TestLog = {
          ...testLog,
          status: 'error',
          processingTime,
          error: errorMessage
        };

        setTestLogs(prev => [updatedLog, ...prev.slice(1)]);
        setTestStats(prev => ({
          totalTests: prev.totalTests + 1,
          successCount: prev.successCount,
          errorCount: prev.errorCount + 1,
          avgResponseTime: Math.round((prev.avgResponseTime * prev.totalTests + processingTime) / (prev.totalTests + 1))
        }));
      }

    } catch (error) {
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const updatedLog: TestLog = {
        ...testLog,
        status: 'error',
        processingTime,
        error: errorMessage
      };

      setTestLogs(prev => [updatedLog, ...prev.slice(1)]);
      setTestStats(prev => ({
        totalTests: prev.totalTests + 1,
        successCount: prev.successCount,
        errorCount: prev.errorCount + 1,
        avgResponseTime: Math.round((prev.avgResponseTime * prev.totalTests + processingTime) / (prev.totalTests + 1))
      }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile, authToken, saveToHistory, saveImages]);

  const clearLogs = useCallback(() => {
    setTestLogs([]);
    setTestStats({
      totalTests: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 AI 음식 분석 시스템 종합 테스트
        </h1>

        {/* 공통 설정 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">🔑 공통 설정</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                인증 토큰 (Bearer Token)
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="JWT 토큰을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                테스트 이미지들 (성능/보안 테스트용)
              </label>
              <input
                ref={multiFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleMultiFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {testImages.length > 0 ? `${testImages.length}개 파일 선택됨` : '여러 이미지 선택 가능'}
              </p>
            </div>
          </div>
        </div>

        {/* 탭 인터페이스 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔍 기본 테스트
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'performance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚡ 성능 벤치마크
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔒 보안 테스트
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'basic' && (
              <div>
                {/* 기본 테스트 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-700">총 테스트</h3>
                    <p className="text-2xl font-bold text-blue-800">{testStats.totalTests}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-700">성공</h3>
                    <p className="text-2xl font-bold text-green-800">{testStats.successCount}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="text-sm font-medium text-red-700">실패</h3>
                    <p className="text-2xl font-bold text-red-800">{testStats.errorCount}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="text-sm font-medium text-purple-700">평균 응답시간</h3>
                    <p className="text-2xl font-bold text-purple-800">{testStats.avgResponseTime}ms</p>
                  </div>
                </div>

                {/* 기본 테스트 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 테스트 설정 */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-6">🔧 테스트 설정</h3>
                    
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">테스트 옵션</h4>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={saveToHistory}
                            onChange={(e) => setSaveToHistory(e.target.checked)}
                            className="mr-2"
                          />
                          분석 결과를 히스토리에 저장
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={saveImages}
                            onChange={(e) => setSaveImages(e.target.checked)}
                            className="mr-2"
                          />
                          이미지를 Storage에 저장
                        </label>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        테스트 이미지 선택
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        JPEG, PNG, WebP (최대 10MB)
                      </p>
                    </div>

                    {imagePreview && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">미리보기</h4>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-w-xs h-auto rounded-lg border"
                        />
                      </div>
                    )}

                    <FormButton
                      onClick={analyzeImage}
                      loading={isAnalyzing}
                      disabled={!selectedFile || !authToken.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isAnalyzing ? '분석 중...' : '🔍 AI 분석 시작'}
                    </FormButton>
                  </div>

                  {/* 분석 결과 */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-6">📊 분석 결과</h3>
                    
                    {isAnalyzing && (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner />
                        <span className="ml-2">AI가 음식을 분석하고 있습니다...</span>
                      </div>
                    )}

                    {analysisResult && (
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-2">
                            🍽️ 분석 완료!
                          </h4>
                          <div className="text-sm text-green-700">
                            <p><strong>총 칼로리:</strong> {analysisResult.total_calories} kcal</p>
                            <p><strong>식사 타입:</strong> {analysisResult.meal_type || '미분류'}</p>
                            <p><strong>분석 신뢰도:</strong> {Math.round(analysisResult.analysis_confidence * 100)}%</p>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium mb-3">인식된 음식들</h5>
                          <div className="space-y-2">
                            {analysisResult.foods.map((food, index) => (
                              <div key={index} className="bg-white border rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{food.name}</span>
                                  <span className="text-sm text-gray-500">
                                    신뢰도: {Math.round(food.confidence * 100)}%
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  <span>{food.amount}</span>
                                  <span className="ml-4 font-medium">{food.calories} kcal</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {!isAnalyzing && !analysisResult && (
                      <div className="text-center py-8 text-gray-500">
                        분석할 이미지를 선택하고 &apos;분석 시작&apos; 버튼을 클릭하세요
                      </div>
                    )}
                  </div>
                </div>

                {/* 테스트 로그 */}
                <div className="mt-8 bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">📝 테스트 로그</h3>
                    <FormButton
                      onClick={clearLogs}
                      className="bg-gray-600 hover:bg-gray-700 text-sm"
                    >
                      로그 초기화
                    </FormButton>
                  </div>

                  {testLogs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      아직 테스트 로그가 없습니다. 위에서 이미지 분석을 실행해보세요.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {testLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`border rounded-lg p-4 ${
                            log.status === 'success' ? 'border-green-200 bg-green-50' :
                            log.status === 'error' ? 'border-red-200 bg-red-50' :
                            'border-yellow-200 bg-yellow-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                log.status === 'success' ? 'bg-green-500' :
                                log.status === 'error' ? 'bg-red-500' :
                                'bg-yellow-500'
                              }`}></span>
                              <span className="font-medium">{log.fileName}</span>
                              <span className="text-sm text-gray-500">({log.fileSize})</span>
                            </div>
                            <div className="text-right text-sm">
                              <div className="text-gray-500">{log.timestamp}</div>
                              {log.processingTime && (
                                <div className="font-medium">{log.processingTime}ms</div>
                              )}
                            </div>
                          </div>

                          {log.status === 'success' && log.result && (
                            <div className="text-sm text-gray-700">
                              <p><strong>총 칼로리:</strong> {log.result.total_calories} kcal</p>
                              <p><strong>음식 수:</strong> {log.result.foods.length}개</p>
                              <p><strong>신뢰도:</strong> {Math.round(log.result.analysis_confidence * 100)}%</p>
                            </div>
                          )}

                          {log.status === 'error' && log.error && (
                            <div className="text-sm text-red-600">
                              <p><strong>오류:</strong> {log.error}</p>
                            </div>
                          )}

                          {log.performanceMetrics && (
                            <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                              <span>응답시간: {log.performanceMetrics.responseTime}ms</span>
                              {log.performanceMetrics.memoryUsage && (
                                <span className="ml-4">메모리: {log.performanceMetrics.memoryUsage}</span>
                              )}
                              {log.performanceMetrics.compressionRatio && (
                                <span className="ml-4">압축률: {log.performanceMetrics.compressionRatio}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <PerformanceBenchmark
                authToken={authToken}
                testImages={testImages}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTester
                validAuthToken={authToken}
                testImages={testImages}
              />
            )}
          </div>
        </div>

        {/* 도움말 */}
        <div className="mt-8">
          <Alert
            type="info"
            title="테스트 가이드"
            message="1. 먼저 JWT 토큰을 입력하세요 (로그인 후 개발자 도구에서 확인 가능)
2. 기본 테스트: 단일 이미지로 AI 분석 기능 테스트
3. 성능 벤치마크: 여러 이미지로 동시 처리 성능 측정
4. 보안 테스트: 인증, 파일 검증, Rate limiting 등 보안 기능 검증
5. 각 탭에서 테스트를 실행하고 결과를 확인하세요"
          />
        </div>
      </div>
    </div>
  );
} 