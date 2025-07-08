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

export default function TestApiEndpoints() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('Test123!@#')
  const [displayName, setDisplayName] = useState('테스트 사용자')
  const [accessToken, setAccessToken] = useState('')
  const [results, setResults] = useState<{ [key: string]: ApiResult }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})

  const apiCall = async (endpoint: string, method: string, body?: unknown, token?: string) => {
    setLoading(prev => ({ ...prev, [endpoint]: true }))
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      })
      
      const data: ApiResponse = await response.json()
      
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          statusText: response.statusText,
          data
        }
      }))
      
      // 로그인 성공 시 토큰 저장
      if (endpoint === '/api/auth/login' && data.success && data.data) {
        console.log('로그인 응답 데이터:', data.data) // 디버깅용 로그
        
        const userData = data.data as any
        if (userData.session?.access_token) {
          console.log('=== 토큰 상세 정보 ===')
          console.log('토큰 전체 길이:', userData.session.access_token.length)
          console.log('토큰 세그먼트 수:', userData.session.access_token.split('.').length)
          console.log('토큰 처음 50자:', userData.session.access_token.substring(0, 50))
          console.log('토큰 마지막 50자:', userData.session.access_token.substring(userData.session.access_token.length - 50))
          console.log('=====================')
          setAccessToken(userData.session.access_token)
        } else {
          console.log('토큰을 찾을 수 없습니다. 세션 데이터:', userData.session) // 디버깅용 로그
        }
      }
      
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [endpoint]: false }))
    }
  }

  const testSignup = () => {
    apiCall('/api/auth/signup', 'POST', { email, password, displayName })
  }

  const testLogin = () => {
    apiCall('/api/auth/login', 'POST', { email, password })
  }

  const testMe = () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }
    apiCall('/api/auth/me', 'GET', undefined, accessToken)
  }

  const testLogout = async () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }
    
    // API 호출
    await apiCall('/api/auth/logout', 'POST', undefined, accessToken)
    
    // 로그아웃 성공 시 토큰 제거
    setAccessToken('')
    
    // 클라이언트 측 세션도 무효화
    if (typeof window !== 'undefined') {
      // 로컬 스토리지나 쿠키에 저장된 세션 정보 제거
      localStorage.removeItem('supabase.auth.token')
      // 페이지 새로고침으로 모든 상태 초기화
      window.location.reload()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-black mb-2">API 엔드포인트 테스트</h1>
        <p className="text-gray-800 text-lg">Next.js API Routes 인증 시스템 테스트</p>
      </div>

      {/* 테스트 입력 */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-black mb-4">테스트 데이터</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-2">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">표시 이름</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-medium"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-sm font-bold text-black mb-2">액세스 토큰 상태</label>
          {accessToken ? (
            <div className="space-y-2">
              <div className="text-sm text-green-700 bg-green-100 border-2 border-green-300 p-2 rounded-md font-bold">
                ✅ 토큰이 로드되었습니다
              </div>
              <div className="text-xs text-black bg-yellow-100 border-2 border-yellow-300 p-3 rounded-md break-all font-mono">
                {accessToken.substring(0, 50)}...
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-700 bg-red-100 border-2 border-red-300 p-2 rounded-md font-bold">
              ❌ 토큰 없음 - 로그인이 필요합니다
            </div>
          )}
        </div>
      </div>

      {/* API 테스트 버튼들 */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-black mb-4">API 테스트</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={testSignup}
            disabled={loading['/api/auth/signup']}
            className="px-4 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading['/api/auth/signup'] ? '처리 중...' : '회원가입'}
          </button>
          
          <button
            onClick={testLogin}
            disabled={loading['/api/auth/login']}
            className="px-4 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading['/api/auth/login'] ? '처리 중...' : '로그인'}
          </button>
          
          <button
            onClick={testMe}
            disabled={loading['/api/auth/me']}
            className="px-4 py-3 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading['/api/auth/me'] ? '처리 중...' : '내 정보'}
          </button>
          
          <button
            onClick={testLogout}
            disabled={loading['/api/auth/logout']}
            className="px-4 py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading['/api/auth/logout'] ? '처리 중...' : '로그아웃'}
          </button>
        </div>
      </div>

      {/* 결과 표시 */}
      <div className="space-y-4">
        {Object.entries(results).map(([endpoint, result]) => (
          <div key={endpoint} className="border rounded p-4 mb-4">
            <h3 className="font-semibold mb-2">{endpoint}</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            
            {/* 결과 분석 */}
            {result && typeof result === 'object' && 'status' in result && (
              <div className="mt-2 text-sm">
                <span className={`inline-block px-2 py-1 rounded text-white ${
                  typeof result.status === 'number' && result.status >= 200 && result.status < 300 
                    ? 'bg-green-500' 
                    : 'bg-red-500'
                }`}>
                  {String(result.status)} {result && typeof result === 'object' && 'statusText' in result ? String(result.statusText) : ''}
                </span>
              </div>
            )}
            
            {/* 로그인 성공 시 토큰 정보 특별 표시 */}
            {endpoint === '/api/auth/login' && result && typeof result === 'object' && 'data' in result && 
             result.data && typeof result.data === 'object' && 'success' in result.data && result.data.success && 
             'data' in result.data && result.data.data && typeof result.data.data === 'object' && 
             'session' in result.data.data && (result.data.data as any).session && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="text-sm font-bold text-green-800 mb-2">🔑 토큰 정보</h4>
                <div className="text-xs text-green-700 space-y-1">
                  <div>
                    <strong>Access Token:</strong> 
                    <span className="ml-1 font-mono bg-yellow-100 px-1 rounded">
                      {((result.data.data as any).session.access_token || '없음').toString().substring(0, 30)}...
                    </span>
                  </div>
                  <div>
                    <strong>Token Type:</strong> Bearer
                  </div>
                  <div>
                    <strong>Expires At:</strong> {((result.data.data as any).session.expires_at || '정보 없음').toString()}
                  </div>
                </div>
              </div>
            )}
            
            {/* 에러 표시 */}
            {result && typeof result === 'object' && 'error' in result && result.error && (
              <div className="mt-2 text-red-600 text-sm">
                오류: {String(result.error)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 사용 가이드 */}
      <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-black mb-4">📋 사용 가이드</h2>
        <div className="space-y-3 text-base text-black">
          <p><strong className="text-blue-800">1. 회원가입:</strong> 먼저 이메일과 비밀번호로 회원가입을 진행하세요.</p>
          <p><strong className="text-blue-800">2. 로그인:</strong> 회원가입 후 같은 정보로 로그인하면 액세스 토큰을 받습니다.</p>
          <p><strong className="text-blue-800">3. 내 정보:</strong> 로그인 후 토큰을 사용해 사용자 정보를 조회할 수 있습니다.</p>
          <p><strong className="text-blue-800">4. 로그아웃:</strong> 토큰을 사용해 세션을 무효화합니다.</p>
        </div>
      </div>
    </div>
  )
} 