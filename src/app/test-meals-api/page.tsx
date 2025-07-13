'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';

export default function TestMealsAPI() {
  const { user, loading: authLoading, refreshSession, signOut } = useAuth();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    // 인증 상태가 로드된 후에 환경 정보 수집
    if (!authLoading) {
      checkEnvironment();
    }
  }, [authLoading, user]);

  const checkEnvironment = async () => {
    try {
      // Supabase 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      const info = {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not found',
        authToken: typeof window !== 'undefined' ? localStorage.getItem('authToken') : 'Window not available',
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'Window not available',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Window not available'
      };
      
      const sessionData = {
        hasSession: !!session,
        user: session?.user?.email || user?.email || 'No user',
        accessToken: session?.access_token ? '있음' : '없음',
        sessionError: sessionError?.message || 'No error',
        contextUser: user?.email || 'No context user',
        authLoading: authLoading
      };
      
      setEnvInfo(info);
      setSessionInfo(sessionData);
    } catch (error: any) {
      console.error('Environment check error:', error);
      setSessionInfo({
        hasSession: false,
        user: 'Error checking session',
        accessToken: '없음',
        sessionError: error.message || 'Unknown error',
        contextUser: user?.email || 'No context user',
        authLoading: authLoading
      });
    }
  };

  const handleSessionRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await refreshSession();
      
      if (result.success) {
        setError(null);
        await checkEnvironment();
        alert('세션이 성공적으로 갱신되었습니다!');
      } else {
        setError(`세션 갱신 실패: ${result.error}`);
        alert('세션 갱신에 실패했습니다. 다시 로그인해주세요.');
      }
    } catch (error: any) {
      setError(`세션 갱신 중 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      await signOut();
      setResults(null);
      setError(null);
      await checkEnvironment();
      alert('로그아웃되었습니다.');
    }
  };

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // 세션 상태 재확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        // refresh token 오류인 경우 특별 처리
        if (sessionError.message.includes('refresh_token_not_found') || 
            sessionError.message.includes('Invalid Refresh Token') ||
            sessionError.message.includes('JWT expired')) {
          
          setError('세션이 만료되었습니다. 세션을 갱신하거나 다시 로그인해주세요.');
          setResults({
            error: true,
            type: 'session_expired',
            message: '세션 만료',
            suggestion: '세션 갱신 또는 재로그인 필요'
          });
          return;
        }
        throw new Error(`세션 오류: ${sessionError.message}`);
      }
      
      if (!session || !session.access_token) {
        throw new Error('인증 세션이 없습니다. 먼저 로그인해주세요.');
      }

      console.log('Supabase 세션:', session.user?.email);
      console.log('Access Token 있음:', !!session.access_token);

      // API 호출
      const response = await axios.get('/api/meals', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        params: {
          limit: 10,
          offset: 0,
          filter: 'all'
        }
      });

      console.log('API 응답:', response.data);
      setResults(response.data);

    } catch (err: any) {
      console.error('API 테스트 오류:', err);
      
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message = err.response?.data?.error || err.message;
        setError(`HTTP ${status}: ${message}`);
        
        // 응답 데이터도 보여주기
        if (err.response?.data) {
          setResults({
            error: true,
            status: status,
            data: err.response.data
          });
        }
      } else {
        setError(err.message || '알 수 없는 오류');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshEnvironment = async () => {
    await checkEnvironment();
    console.log('환경 변수 정보:', envInfo);
    console.log('Supabase 세션 정보:', sessionInfo);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Meals API 테스트
        </h1>

        <div className="space-y-4 mb-8">
          <button
            onClick={refreshEnvironment}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mr-2"
          >
            환경 변수 새로고침
          </button>

          <button
            onClick={testAPI}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors mr-2"
          >
            {loading ? '테스트 중...' : 'API 테스트 실행'}
          </button>

          {user && (
            <>
              <button
                onClick={handleSessionRefresh}
                disabled={loading}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors mr-2"
              >
                세션 갱신
              </button>

              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                로그아웃
              </button>
            </>
          )}

          {!user && (
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              로그인하러 가기
            </a>
          )}
        </div>

        {/* 환경 정보 표시 */}
        {envInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">환경 정보:</h3>
            <div className="space-y-1 text-sm text-blue-700">
              <div><strong>Supabase URL:</strong> {envInfo.supabaseUrl}</div>
              <div><strong>Old Auth Token:</strong> {envInfo.authToken ? '있음' : '없음'}</div>
              <div><strong>Current URL:</strong> {envInfo.currentUrl}</div>
            </div>
          </div>
        )}

        {/* Supabase 세션 정보 표시 */}
        {sessionInfo && (
          <div className={`border rounded-lg p-4 mb-4 ${
            sessionInfo.hasSession ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              sessionInfo.hasSession ? 'text-green-800' : 'text-red-800'
            }`}>
              Supabase 세션 정보:
            </h3>
            <div className={`space-y-1 text-sm ${
              sessionInfo.hasSession ? 'text-green-700' : 'text-red-700'
            }`}>
              <div><strong>세션 있음:</strong> {sessionInfo.hasSession ? '✅ 예' : '❌ 아니오'}</div>
              <div><strong>사용자:</strong> {sessionInfo.user}</div>
              <div><strong>Context User:</strong> {sessionInfo.contextUser}</div>
              <div><strong>Access Token:</strong> {sessionInfo.accessToken}</div>
              <div><strong>Auth Loading:</strong> {sessionInfo.authLoading ? '로딩 중' : '완료'}</div>
              {sessionInfo.sessionError !== 'No error' && (
                <div className="text-red-600"><strong>오류:</strong> {sessionInfo.sessionError}</div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>오류:</strong> {error}
            
            {error.includes('세션이 만료') && (
              <div className="mt-2">
                <button
                  onClick={handleSessionRefresh}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm mr-2"
                >
                  세션 갱신 시도
                </button>
                <a
                  href="/login"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm inline-block"
                >
                  다시 로그인
                </a>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">API 응답 결과:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">테스트 가이드:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>"환경 변수 새로고침" 버튼을 클릭하여 현재 환경 설정을 확인하세요.</li>
            <li><strong>Supabase 세션 정보</strong>에서 "세션 있음"이 ✅ 예로 표시되어야 합니다.</li>
            <li>만약 세션이 없거나 오류가 있다면:</li>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>"세션 갱신" 버튼을 먼저 시도해보세요.</li>
              <li>그래도 안 되면 "로그아웃" 후 <a href="/login" className="text-blue-600 underline">로그인 페이지</a>로 이동하여 다시 로그인하세요.</li>
            </ul>
            <li>"API 테스트 실행" 버튼을 클릭하여 API를 호출하세요.</li>
            <li>결과를 확인하고 오류가 있다면 콘솔 로그도 함께 확인하세요.</li>
          </ol>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">문제 해결:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• <strong>세션 만료 오류:</strong> "세션 갱신" 버튼을 클릭하거나 다시 로그인하세요.</li>
              <li>• <strong>토큰 오류:</strong> 로그아웃 후 다시 로그인해보세요.</li>
              <li>• <strong>API 호출 실패:</strong> 네트워크 연결과 서버 상태를 확인하세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 