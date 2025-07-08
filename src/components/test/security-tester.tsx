'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { FormButton } from '@/components/auth/form-button';
import { Alert } from '@/components/auth/alert';

interface SecurityTestResult {
  testId: string;
  testName: string;
  description: string;
  expectedResult: string;
  actualResult: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  timestamp: string;
  responseTime: number;
}

interface SecurityTest {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'authorization' | 'fileValidation' | 'rateLimiting' | 'injection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedResult: string;
  testFunction: () => Promise<SecurityTestResult>;
}

interface Props {
  validAuthToken: string;
  testImages: File[];
}

export function SecurityTester({ validAuthToken, testImages }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [results, setResults] = useState<SecurityTestResult[]>([]);
  const [progress, setProgress] = useState(0);

  // 악성 파일 생성 (테스트용)
  const createMaliciousFile = useCallback((type: 'executable' | 'script' | 'oversized'): File => {
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (type) {
      case 'executable':
        content = 'MZ\x90\x00\x03\x00\x00\x00'; // PE header
        filename = 'malicious.exe';
        mimeType = 'application/x-msdownload';
        break;
      case 'script':
        content = '<script>alert("XSS")</script>';
        filename = 'malicious.jpg';
        mimeType = 'text/html';
        break;
      case 'oversized':
        content = 'X'.repeat(15 * 1024 * 1024); // 15MB
        filename = 'oversized.jpg';
        mimeType = 'image/jpeg';
        break;
      default:
        content = 'test';
        filename = 'test.txt';
        mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }, []);

  // 테스트 함수들
  const testNoAuth = useCallback(async (): Promise<SecurityTestResult> => {
    const startTime = performance.now();
    
    try {
      if (testImages.length === 0) {
        throw new Error('테스트 이미지가 없습니다');
      }

      const formData = new FormData();
      formData.append('image', testImages[0]);

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        body: formData
        // 인증 헤더 없음
      });

      const endTime = performance.now();
      const data = await response.json();

      return {
        testId: 'auth-001',
        testName: '인증 없는 접근 차단',
        description: '인증 토큰 없이 API 호출 시 차단되는지 확인',
        expectedResult: 'HTTP 401 Unauthorized',
        actualResult: `HTTP ${response.status}: ${data.error || data.message || 'Unknown'}`,
        status: response.status === 401 ? 'pass' : 'fail',
        details: response.status === 401 ? 
          '✅ 인증되지 않은 요청이 올바르게 차단됨' :
          '❌ 인증되지 않은 요청이 허용됨 (보안 취약점)',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId: 'auth-001',
        testName: '인증 없는 접근 차단',
        description: '인증 토큰 없이 API 호출 시 차단되는지 확인',
        expectedResult: 'HTTP 401 Unauthorized',
        actualResult: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'fail',
        details: '❌ 네트워크 오류 또는 예상치 못한 응답',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    }
  }, [testImages]);

  const testInvalidAuth = useCallback(async (): Promise<SecurityTestResult> => {
    const startTime = performance.now();
    
    try {
      if (testImages.length === 0) {
        throw new Error('테스트 이미지가 없습니다');
      }

      const formData = new FormData();
      formData.append('image', testImages[0]);

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token-12345'
        },
        body: formData
      });

      const endTime = performance.now();
      const data = await response.json();

      return {
        testId: 'auth-002',
        testName: '잘못된 토큰 차단',
        description: '유효하지 않은 JWT 토큰으로 접근 시 차단되는지 확인',
        expectedResult: 'HTTP 401 Unauthorized',
        actualResult: `HTTP ${response.status}: ${data.error || data.message || 'Unknown'}`,
        status: response.status === 401 ? 'pass' : 'fail',
        details: response.status === 401 ? 
          '✅ 유효하지 않은 토큰이 올바르게 차단됨' :
          '❌ 유효하지 않은 토큰이 허용됨 (보안 취약점)',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId: 'auth-002',
        testName: '잘못된 토큰 차단',
        description: '유효하지 않은 JWT 토큰으로 접근 시 차단되는지 확인',
        expectedResult: 'HTTP 401 Unauthorized',
        actualResult: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'fail',
        details: '❌ 네트워크 오류 또는 예상치 못한 응답',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    }
  }, [testImages]);

  const testMaliciousFile = useCallback(async (): Promise<SecurityTestResult> => {
    const startTime = performance.now();
    
    try {
      const maliciousFile = createMaliciousFile('executable');
      const formData = new FormData();
      formData.append('image', maliciousFile);

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validAuthToken}`
        },
        body: formData
      });

      const endTime = performance.now();
      const data = await response.json();

      return {
        testId: 'file-001',
        testName: '악성 파일 업로드 차단',
        description: '실행 파일(.exe) 업로드 시 차단되는지 확인',
        expectedResult: 'HTTP 400 Bad Request',
        actualResult: `HTTP ${response.status}: ${data.error || data.message || 'Unknown'}`,
        status: !response.ok ? 'pass' : 'fail',
        details: !response.ok ? 
          '✅ 악성 파일이 올바르게 차단됨' :
          '❌ 악성 파일이 허용됨 (보안 취약점)',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId: 'file-001',
        testName: '악성 파일 업로드 차단',
        description: '실행 파일(.exe) 업로드 시 차단되는지 확인',
        expectedResult: 'HTTP 400 Bad Request',
        actualResult: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'warning',
        details: '⚠️ 네트워크 오류로 테스트 불완전',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    }
  }, [validAuthToken, createMaliciousFile]);

  const testOversizedFile = useCallback(async (): Promise<SecurityTestResult> => {
    const startTime = performance.now();
    
    try {
      const oversizedFile = createMaliciousFile('oversized');
      const formData = new FormData();
      formData.append('image', oversizedFile);

      const response = await fetch('/api/meals/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validAuthToken}`
        },
        body: formData
      });

      const endTime = performance.now();
      const data = await response.json();

      return {
        testId: 'file-002',
        testName: '대용량 파일 업로드 차단',
        description: '10MB를 초과하는 파일 업로드 시 차단되는지 확인',
        expectedResult: 'HTTP 413 Payload Too Large or 400 Bad Request',
        actualResult: `HTTP ${response.status}: ${data.error || data.message || 'Unknown'}`,
        status: (!response.ok && [400, 413].includes(response.status)) ? 'pass' : 'fail',
        details: (!response.ok && [400, 413].includes(response.status)) ? 
          '✅ 대용량 파일이 올바르게 차단됨' :
          '❌ 대용량 파일이 허용됨 (보안 취약점)',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId: 'file-002',
        testName: '대용량 파일 업로드 차단',
        description: '10MB를 초과하는 파일 업로드 시 차단되는지 확인',
        expectedResult: 'HTTP 413 Payload Too Large or 400 Bad Request',
        actualResult: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'warning',
        details: '⚠️ 네트워크 오류로 테스트 불완전',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    }
  }, [validAuthToken, createMaliciousFile]);

  const testRateLimit = useCallback(async (): Promise<SecurityTestResult> => {
    const startTime = performance.now();
    
    try {
      if (testImages.length === 0) {
        throw new Error('테스트 이미지가 없습니다');
      }

      // 연속 15개 요청으로 Rate Limit 테스트
      const requests = Array.from({ length: 15 }, async () => {
        const formData = new FormData();
        formData.append('image', testImages[0]);
        formData.append('save_to_history', 'false');
        formData.append('save_images', 'false');

        return fetch('/api/meals/analyze', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validAuthToken}`
          },
          body: formData
        });
      });

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      const successCount = responses.filter(r => r.ok).length;

      return {
        testId: 'rate-001',
        testName: 'Rate Limiting 검증',
        description: '연속 15개 요청으로 Rate Limit이 적용되는지 확인',
        expectedResult: '일부 요청이 HTTP 429로 차단됨',
        actualResult: `성공: ${successCount}개, Rate Limited: ${rateLimitedCount}개`,
        status: rateLimitedCount > 0 ? 'pass' : 'warning',
        details: rateLimitedCount > 0 ? 
          `✅ Rate Limiting이 작동함 (${rateLimitedCount}개 요청 차단)` :
          '⚠️ Rate Limiting이 감지되지 않음 (설정 확인 필요)',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        testId: 'rate-001',
        testName: 'Rate Limiting 검증',
        description: '연속 15개 요청으로 Rate Limit이 적용되는지 확인',
        expectedResult: '일부 요청이 HTTP 429로 차단됨',
        actualResult: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'fail',
        details: '❌ 네트워크 오류로 테스트 실패',
        timestamp: new Date().toLocaleTimeString(),
        responseTime: Math.round(endTime - startTime)
      };
    }
  }, [validAuthToken, testImages]);

  // 보안 테스트 목록
  const securityTests: SecurityTest[] = useMemo(() => [
    {
      id: 'auth-001',
      name: '인증 없는 접근 차단',
      description: '인증 토큰 없이 API 호출 시 차단되는지 확인',
      category: 'authentication',
      severity: 'critical',
      expectedResult: 'HTTP 401 Unauthorized',
      testFunction: testNoAuth
    },
    {
      id: 'auth-002',
      name: '잘못된 토큰 차단',
      description: '유효하지 않은 JWT 토큰으로 접근 시 차단되는지 확인',
      category: 'authentication',
      severity: 'critical',
      expectedResult: 'HTTP 401 Unauthorized',
      testFunction: testInvalidAuth
    },
    {
      id: 'file-001',
      name: '악성 파일 업로드 차단',
      description: '실행 파일(.exe) 업로드 시 차단되는지 확인',
      category: 'fileValidation',
      severity: 'high',
      expectedResult: 'HTTP 400 Bad Request',
      testFunction: testMaliciousFile
    },
    {
      id: 'file-002',
      name: '대용량 파일 업로드 차단',
      description: '10MB를 초과하는 파일 업로드 시 차단되는지 확인',
      category: 'fileValidation',
      severity: 'medium',
      expectedResult: 'HTTP 413 Payload Too Large',
      testFunction: testOversizedFile
    },
    {
      id: 'rate-001',
      name: 'Rate Limiting 검증',
      description: '연속 다수 요청으로 Rate Limit이 적용되는지 확인',
      category: 'rateLimiting',
      severity: 'medium',
      expectedResult: 'HTTP 429 Too Many Requests',
      testFunction: testRateLimit
    }
  ], [testNoAuth, testInvalidAuth, testMaliciousFile, testOversizedFile, testRateLimit]);

  const runSelectedTests = useCallback(async () => {
    if (selectedTests.length === 0) {
      alert('테스트를 선택해주세요.');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const testsToRun = securityTests.filter(test => selectedTests.includes(test.id));
    
    for (let i = 0; i < testsToRun.length; i++) {
      const test = testsToRun[i];
      try {
        const result = await test.testFunction();
        setResults(prev => [...prev, result]);
      } catch (error) {
        const errorResult: SecurityTestResult = {
          testId: test.id,
          testName: test.name,
          description: test.description,
          expectedResult: test.expectedResult,
          actualResult: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'fail',
          details: '❌ 테스트 실행 중 오류 발생',
          timestamp: new Date().toLocaleTimeString(),
          responseTime: 0
        };
        setResults(prev => [...prev, errorResult]);
      }
      
      setProgress(((i + 1) / testsToRun.length) * 100);
      
      // 테스트 간 잠시 대기
      if (i < testsToRun.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsRunning(false);
  }, [selectedTests, securityTests]);

  const toggleTestSelection = useCallback((testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  }, []);

  const selectAllTests = useCallback(() => {
    setSelectedTests(securityTests.map(test => test.id));
  }, [securityTests]);

  const clearSelection = useCallback(() => {
    setSelectedTests([]);
    setResults([]);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50 border-green-200';
      case 'fail': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">🔒 보안 테스트</h2>
      
      {/* 테스트 선택 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">테스트 선택</h3>
          <div className="space-x-2">
            <FormButton
              onClick={selectAllTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
            >
              전체 선택
            </FormButton>
            <FormButton
              onClick={clearSelection}
              disabled={isRunning}
              className="bg-gray-600 hover:bg-gray-700 text-sm"
            >
              선택 해제
            </FormButton>
          </div>
        </div>
        
        <div className="space-y-3">
          {securityTests.map(test => (
            <label 
              key={test.id}
              className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedTests.includes(test.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTests.includes(test.id)}
                onChange={() => toggleTestSelection(test.id)}
                disabled={isRunning}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{test.name}</span>
                  <span className={`px-2 py-1 text-xs rounded border ${getSeverityColor(test.severity)}`}>
                    {test.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{test.description}</p>
                <p className="text-xs text-gray-500 mt-1">기대 결과: {test.expectedResult}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 진행 상태 */}
      {isRunning && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">보안 테스트 실행 중...</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 실행 버튼 */}
      <div className="mb-6">
        <FormButton
          onClick={runSelectedTests}
          disabled={selectedTests.length === 0 || isRunning}
          loading={isRunning}
          className="bg-red-600 hover:bg-red-700"
        >
          {isRunning ? '보안 테스트 실행 중...' : '🔒 보안 테스트 시작'}
        </FormButton>
      </div>

      {/* 결과 요약 */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">📊 테스트 결과 요약</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-600 font-semibold">통과</div>
              <div className="text-2xl font-bold text-green-800">{passCount}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600 font-semibold">실패</div>
              <div className="text-2xl font-bold text-red-800">{failCount}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-yellow-600 font-semibold">경고</div>
              <div className="text-2xl font-bold text-yellow-800">{warningCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 결과 */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">📋 상세 테스트 결과</h3>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{result.testName}</h4>
                    <p className="text-sm opacity-75">{result.description}</p>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 text-xs rounded border font-semibold ${getStatusColor(result.status)}`}>
                      {result.status.toUpperCase()}
                    </div>
                    <div className="text-xs mt-1">{result.responseTime}ms</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <div className="font-medium">기대 결과:</div>
                    <div className="opacity-75">{result.expectedResult}</div>
                  </div>
                  <div>
                    <div className="font-medium">실제 결과:</div>
                    <div className="opacity-75">{result.actualResult}</div>
                  </div>
                </div>
                
                <div className="text-sm">
                  <div className="font-medium">세부 내용:</div>
                  <div className="opacity-75">{result.details}</div>
                </div>
                
                <div className="text-xs opacity-50 mt-2">
                  실행 시간: {result.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 도움말 */}
      <div className="mt-8">
        <Alert
          type="warning"
          title="보안 테스트 주의사항"
          message="이 테스트들은 시스템의 보안 취약점을 확인하기 위한 것입니다. 
실제 운영 환경에서는 신중하게 실행하시고, 
Rate Limiting 테스트는 일시적으로 API 사용이 제한될 수 있습니다."
        />
      </div>
    </div>
  );
} 