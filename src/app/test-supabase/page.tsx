'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface TestResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export default function TestSupabase() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result])
  }

  const testConnection = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.getSession()
      if (error) {
        addResult({
          success: false,
          message: `연결 실패: ${error.message}`
        })
        setConnected(false)
      } else {
        addResult({
          success: true,
          message: 'Supabase 연결 성공!'
        })
        setConnected(true)
      }
    } catch (error) {
      addResult({
        success: false,
        message: `연결 중 오류: ${error instanceof Error ? error.message : String(error)}`
      })
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const testDatabaseRead = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) {
        addResult({
          success: false,
          message: `데이터베이스 읽기 실패: ${error.message}`
        })
      } else {
        addResult({
          success: true,
          message: 'users 테이블 접근 성공',
          data: { count: data?.length || 0 }
        })
      }
    } catch (error) {
      addResult({
        success: false,
        message: `데이터베이스 읽기 중 오류: ${error instanceof Error ? error.message : String(error)}`
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  useEffect(() => {
    testConnection()
  }, [testConnection])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase 연결 테스트</h1>
      
      {/* 연결 상태 */}
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-2">연결 상태</h2>
        <p className={`font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
          {connected ? '✅ 연결됨' : '❌ 연결되지 않음'}
        </p>
      </div>

      {/* 테스트 버튼들 */}
      <div className="mb-4 space-x-2">
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? '테스트 중...' : '연결 테스트'}
        </button>
        <button
          onClick={testDatabaseRead}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
        >
          {loading ? '테스트 중...' : '데이터베이스 읽기 테스트'}
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
                  <pre className="mt-2 text-sm overflow-auto bg-gray-100 p-2 rounded">
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