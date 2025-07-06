'use client'

import { useState } from 'react'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export default function TestApiEndpoints() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('Test123!@#')
  const [displayName, setDisplayName] = useState('테스트 사용자')
  const [accessToken, setAccessToken] = useState('')
  const [results, setResults] = useState<{ [key: string]: any }>({})
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})

  const apiCall = async (endpoint: string, method: string, body?: any, token?: string) => {
    setLoading(prev => ({ ...prev, [endpoint]: true }))
    
    try {
      const headers: any = {
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
      
      const data = await response.json()
      
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          statusText: response.statusText,
          data
        }
      }))
      
      // 로그인 성공 시 토큰 저장
      if (endpoint === '/api/auth/login' && data.success && data.data?.session?.access_token) {
        setAccessToken(data.data.session.access_token)
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

  const testLogout = () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }
    apiCall('/api/auth/logout', 'POST', undefined, accessToken)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API 엔드포인트 테스트</h1>
        <p className="text-gray-600">Next.js API Routes 인증 시스템 테스트</p>
      </div>

      {/* 테스트 입력 */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">테스트 데이터</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">표시 이름</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {accessToken && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">현재 액세스 토큰</label>
            <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded break-all">
              {accessToken.substring(0, 50)}...
            </div>
          </div>
        )}
      </div>

      {/* API 테스트 버튼들 */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">API 테스트</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={testSignup}
            disabled={loading['/api/auth/signup']}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading['/api/auth/signup'] ? '처리 중...' : '회원가입'}
          </button>
          
          <button
            onClick={testLogin}
            disabled={loading['/api/auth/login']}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading['/api/auth/login'] ? '처리 중...' : '로그인'}
          </button>
          
          <button
            onClick={testMe}
            disabled={loading['/api/auth/me']}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading['/api/auth/me'] ? '처리 중...' : '내 정보'}
          </button>
          
          <button
            onClick={testLogout}
            disabled={loading['/api/auth/logout']}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading['/api/auth/logout'] ? '처리 중...' : '로그아웃'}
          </button>
        </div>
      </div>

      {/* 결과 표시 */}
      <div className="space-y-4">
        {Object.entries(results).map(([endpoint, result]) => (
          <div key={endpoint} className="bg-white border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              {endpoint}
            </h3>
            
            {result.error ? (
              <div className="text-red-600 bg-red-50 p-3 rounded">
                <strong>오류:</strong> {result.error}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">상태:</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    result.status >= 200 && result.status < 300
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.status} {result.statusText}
                  </span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">응답 데이터:</h4>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 사용 가이드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">사용 가이드</h2>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1. 회원가입:</strong> 먼저 이메일과 비밀번호로 회원가입을 진행하세요.</p>
          <p><strong>2. 로그인:</strong> 회원가입 후 같은 정보로 로그인하면 액세스 토큰을 받습니다.</p>
          <p><strong>3. 내 정보:</strong> 로그인 후 토큰을 사용해 사용자 정보를 조회할 수 있습니다.</p>
          <p><strong>4. 로그아웃:</strong> 토큰을 사용해 세션을 무효화합니다.</p>
        </div>
      </div>
    </div>
  )
} 