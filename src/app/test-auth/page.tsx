'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface TestResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export default function TestAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('Test123!@#')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  useEffect(() => {
    // 현재 사용자 확인
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getCurrentUser()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result])
  }

  const testSignUp = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        addResult({
          success: false,
          message: `회원가입 실패: ${error.message}`
        })
      } else {
        addResult({
          success: true,
          message: '회원가입 성공! 이메일 확인을 해주세요.'
        })
      }
    } catch (error) {
      addResult({
        success: false,
        message: `회원가입 중 오류: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setLoading(false)
    }
  }

  const testSignIn = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        addResult({
          success: false,
          message: `로그인 실패: ${error.message}`
        })
      } else {
        addResult({
          success: true,
          message: '로그인 성공!'
        })
      }
    } catch (error) {
      addResult({
        success: false,
        message: `로그인 중 오류: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setLoading(false)
    }
  }

  const testSignOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        addResult({
          success: false,
          message: `로그아웃 실패: ${error.message}`
        })
      } else {
        addResult({
          success: true,
          message: '로그아웃 성공!'
        })
      }
    } catch (error) {
      addResult({
        success: false,
        message: `로그아웃 중 오류: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">인증 테스트</h1>
      
      {/* 현재 사용자 상태 */}
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-2">현재 사용자 상태</h2>
        {user ? (
          <div>
            <p><strong>이메일:</strong> {user.email}</p>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>이메일 확인:</strong> {user.email_confirmed_at ? '확인됨' : '미확인'}</p>
          </div>
        ) : (
          <p>로그인되지 않음</p>
        )}
      </div>

      {/* 테스트 입력 */}
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <h2 className="text-lg font-semibold mb-2">테스트 입력</h2>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* 테스트 버튼들 */}
      <div className="mb-4 space-x-2">
        <button
          onClick={testSignUp}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? '처리 중...' : '회원가입 테스트'}
        </button>
        <button
          onClick={testSignIn}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? '처리 중...' : '로그인 테스트'}
        </button>
        <button
          onClick={testSignOut}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? '처리 중...' : '로그아웃 테스트'}
        </button>
        <button
          onClick={clearResults}
          disabled={loading}
          className="px-4 py-2 bg-gray-500 text-white rounded disabled:bg-gray-400"
        >
          결과 지우기
        </button>
      </div>

      {/* 테스트 결과 */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">테스트 결과</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">아직 테스트 결과가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                <p>{result.message}</p>
                {result.data && (
                  <pre className="mt-2 text-sm overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 