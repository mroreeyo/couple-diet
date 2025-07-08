'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FormButton } from '@/components/auth/form-button';

interface BenchmarkResult {
  testName: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalTime: number;
  requestsPerSecond: number;
  memoryUsage?: {
    initial: number;
    peak: number;
    final: number;
  };
}

interface BenchmarkTest {
  id: string;
  name: string;
  description: string;
  concurrent: number;
  totalRequests: number;
  testType: 'load' | 'stress' | 'concurrent';
}

const BENCHMARK_TESTS: BenchmarkTest[] = [
  {
    id: 'load-test-1',
    name: '기본 로드 테스트',
    description: '5개의 동시 요청으로 기본 성능 측정',
    concurrent: 5,
    totalRequests: 20,
    testType: 'load'
  },
  {
    id: 'stress-test-1',
    name: '스트레스 테스트',
    description: '10개의 동시 요청으로 고부하 상황 테스트',
    concurrent: 10,
    totalRequests: 50,
    testType: 'stress'
  },
  {
    id: 'concurrent-test-1',
    name: '동시성 테스트',
    description: '15개의 동시 요청으로 최대 동시 처리 능력 테스트',
    concurrent: 15,
    totalRequests: 75,
    testType: 'concurrent'
  }
];

interface Props {
  authToken: string;
  testImages: File[];
}

export function PerformanceBenchmark({ authToken, testImages }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<BenchmarkTest | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const measureMemory = useCallback(async (): Promise<number> => {
    if ('memory' in performance) {
      // Chrome's memory API
      const perfWithMemory = performance as typeof performance & {
        memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      };
      return perfWithMemory.memory.usedJSHeapSize;
    }
    return 0;
  }, []);

  const runSingleRequest = useCallback(async (
    image: File,
    authToken: string,
    signal: AbortSignal
  ): Promise<{ success: boolean; responseTime: number; error?: string }> => {
    const startTime = performance.now();
    
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('save_to_history', 'false');
      formData.append('save_images', 'false');

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
        signal
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          responseTime,
          error: errorData.error || `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      return {
        success: data.success,
        responseTime,
        error: data.success ? undefined : data.error
      };

    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          responseTime,
          error: 'Request aborted'
        };
      }
      
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  const runBenchmark = useCallback(async (test: BenchmarkTest) => {
    if (testImages.length === 0) {
      addLog('❌ 테스트 이미지가 없습니다');
      return;
    }

    setIsRunning(true);
    setCurrentTest(test);
    setProgress(0);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const initialMemory = await measureMemory();
    const startTime = performance.now();
    
    addLog(`🚀 ${test.name} 시작`);
    addLog(`📊 설정: ${test.concurrent}개 동시 요청, 총 ${test.totalRequests}개 요청`);
    addLog(`💾 초기 메모리: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

    const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];
    let completedRequests = 0;
    let peakMemory = initialMemory;

    try {
      // 배치 단위로 동시 요청 실행
      const batchSize = test.concurrent;
      const totalBatches = Math.ceil(test.totalRequests / batchSize);

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchRequests = Math.min(batchSize, test.totalRequests - completedRequests);
        
        addLog(`📦 배치 ${batch + 1}/${totalBatches} 실행 중... (${batchRequests}개 요청)`);

        const batchPromises = Array.from({ length: batchRequests }, (_, i) => {
          const imageIndex = (completedRequests + i) % testImages.length;
          return runSingleRequest(testImages[imageIndex], authToken, signal);
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              responseTime: 0,
              error: result.reason?.message || 'Promise rejected'
            });
          }
          
          completedRequests++;
          setProgress((completedRequests / test.totalRequests) * 100);
        });

        // 메모리 사용량 모니터링
        const currentMemory = await measureMemory();
        if (currentMemory > peakMemory) {
          peakMemory = currentMemory;
        }

        // 배치 간 짧은 대기 (시스템 부하 조절)
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const finalMemory = await measureMemory();

      // 결과 분석
      const successResults = results.filter(r => r.success);
      const errorResults = results.filter(r => !r.success);
      const responseTimes = successResults.map(r => r.responseTime);
      
      const benchmarkResult: BenchmarkResult = {
        testName: test.name,
        totalRequests: test.totalRequests,
        successCount: successResults.length,
        errorCount: errorResults.length,
        avgResponseTime: responseTimes.length > 0 ? 
          Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length) : 0,
        minResponseTime: responseTimes.length > 0 ? Math.round(Math.min(...responseTimes)) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.round(Math.max(...responseTimes)) : 0,
        totalTime: Math.round(totalTime),
        requestsPerSecond: test.totalRequests / (totalTime / 1000),
        memoryUsage: {
          initial: Math.round(initialMemory / 1024 / 1024 * 100) / 100,
          peak: Math.round(peakMemory / 1024 / 1024 * 100) / 100,
          final: Math.round(finalMemory / 1024 / 1024 * 100) / 100
        }
      };

      setResults(prev => [...prev, benchmarkResult]);
      
      addLog(`✅ ${test.name} 완료!`);
      addLog(`📈 결과: 성공 ${successResults.length}/${test.totalRequests} (${Math.round(successResults.length / test.totalRequests * 100)}%)`);
      addLog(`⏱️ 평균 응답시간: ${benchmarkResult.avgResponseTime}ms`);
      addLog(`🔥 RPS: ${benchmarkResult.requestsPerSecond.toFixed(2)}`);
      if (benchmarkResult.memoryUsage) {
        addLog(`💾 메모리 사용량: ${benchmarkResult.memoryUsage.initial}MB → ${benchmarkResult.memoryUsage.peak}MB → ${benchmarkResult.memoryUsage.final}MB`);
      }

    } catch (error) {
      addLog(`❌ 테스트 중 오류 발생: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
      setProgress(0);
    }
  }, [testImages, authToken, addLog, measureMemory, runSingleRequest]);

  const stopBenchmark = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('🛑 벤치마크 테스트가 중단되었습니다');
    }
  }, [addLog]);

  const clearResults = useCallback(() => {
    setResults([]);
    setLogs([]);
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">⚡ 성능 벤치마크</h2>
      
      {/* 테스트 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          벤치마크 테스트 선택
        </label>
        <select
          value={selectedTest}
          onChange={(e) => setSelectedTest(e.target.value)}
          disabled={isRunning}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">테스트를 선택하세요</option>
          {BENCHMARK_TESTS.map(test => (
            <option key={test.id} value={test.id}>
              {test.name} - {test.description}
            </option>
          ))}
        </select>
      </div>

      {/* 테스트 정보 */}
      {selectedTest && (
        <div className="mb-6">
          {(() => {
            const test = BENCHMARK_TESTS.find(t => t.id === selectedTest);
            if (!test) return null;
            
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">{test.name}</h3>
                <p className="text-sm text-blue-700 mb-2">{test.description}</p>
                <div className="text-sm text-blue-600">
                  <span className="mr-4">동시 요청: {test.concurrent}개</span>
                  <span className="mr-4">총 요청: {test.totalRequests}개</span>
                  <span>테스트 타입: {test.testType}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 진행 상태 */}
      {isRunning && currentTest && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {currentTest.name} 실행 중...
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      <div className="flex space-x-4 mb-6">
        <FormButton
          onClick={() => {
            const test = BENCHMARK_TESTS.find(t => t.id === selectedTest);
            if (test) runBenchmark(test);
          }}
          disabled={!selectedTest || isRunning || testImages.length === 0}
          loading={isRunning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isRunning ? '테스트 실행 중...' : '🚀 벤치마크 시작'}
        </FormButton>
        
        {isRunning && (
          <FormButton
            onClick={stopBenchmark}
            className="bg-red-600 hover:bg-red-700"
          >
            🛑 중단
          </FormButton>
        )}
        
        <FormButton
          onClick={clearResults}
          disabled={isRunning}
          className="bg-gray-600 hover:bg-gray-700"
        >
          📝 결과 초기화
        </FormButton>
      </div>

      {/* 결과 표시 */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">📊 벤치마크 결과</h3>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-800">{result.testName}</h4>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">성공률</div>
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(result.successCount / result.totalRequests * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">총 요청</div>
                    <div className="font-semibold">{formatNumber(result.totalRequests)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">성공/실패</div>
                    <div className="font-semibold">
                      <span className="text-green-600">{formatNumber(result.successCount)}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-red-600">{formatNumber(result.errorCount)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">평균 응답시간</div>
                    <div className="font-semibold">{formatNumber(result.avgResponseTime)}ms</div>
                  </div>
                  <div>
                    <div className="text-gray-500">RPS</div>
                    <div className="font-semibold">{result.requestsPerSecond.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">응답시간 범위</div>
                      <div className="font-semibold">
                        {formatNumber(result.minResponseTime)}ms - {formatNumber(result.maxResponseTime)}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">총 소요시간</div>
                      <div className="font-semibold">{formatNumber(result.totalTime)}ms</div>
                    </div>
                    {result.memoryUsage && (
                      <div>
                        <div className="text-gray-500">메모리 사용량</div>
                        <div className="font-semibold">
                          {result.memoryUsage.initial}MB → {result.memoryUsage.peak}MB
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 로그 */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">📝 테스트 로그</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 