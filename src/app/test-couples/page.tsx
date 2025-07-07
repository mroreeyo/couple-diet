'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Couple {
  id: string
  partner1_id: string
  partner2_id: string
  status: 'pending' | 'accepted' | 'active'
  created_at: string
  updated_at: string
}

interface TestResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export default function TestCouples() {
  const [couples, setCouples] = useState<Couple[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [newPartner1Id, setNewPartner1Id] = useState('')
  const [newPartner2Id, setNewPartner2Id] = useState('')

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result])
  }

  const fetchCouples = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        addTestResult({
          success: false,
          message: `커플 목록 조회 실패: ${error.message}`
        })
      } else {
        setCouples(data || [])
        addTestResult({
          success: true,
          message: `커플 목록 조회 성공: ${data?.length || 0}개`
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `커플 목록 조회 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const checkCoupleStatus = useCallback(async (coupleId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .eq('id', coupleId)
        .single()

      if (error) {
        addTestResult({
          success: false,
          message: `커플 상태 확인 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: `커플 상태 확인 성공`,
          data: { couple: data }
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `커플 상태 확인 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const createCouple = async () => {
    if (!newPartner1Id || !newPartner2Id) {
      addTestResult({
        success: false,
        message: '파트너 ID를 모두 입력해주세요'
      })
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('couples')
        .insert([{
          partner1_id: newPartner1Id,
          partner2_id: newPartner2Id,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) {
        addTestResult({
          success: false,
          message: `커플 생성 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: '커플 생성 성공',
          data: { couple: data }
        })
        fetchCouples()
        setNewPartner1Id('')
        setNewPartner2Id('')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `커플 생성 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCoupleStatus = async (coupleId: string, status: 'pending' | 'accepted' | 'active') => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('couples')
        .update({ status })
        .eq('id', coupleId)
        .select()
        .single()

      if (error) {
        addTestResult({
          success: false,
          message: `커플 상태 업데이트 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: `커플 상태 업데이트 성공: ${status}`,
          data: { couple: data }
        })
        fetchCouples()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `커플 상태 업데이트 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteCouple = async (coupleId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('couples')
        .delete()
        .eq('id', coupleId)

      if (error) {
        addTestResult({
          success: false,
          message: `커플 삭제 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: '커플 삭제 성공'
        })
        fetchCouples()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `커플 삭제 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  useEffect(() => {
    fetchCouples()
  }, [fetchCouples])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">커플 스키마 테스트</h1>
      
      {/* 새 커플 생성 */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-3">새 커플 생성</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">파트너 1 ID</label>
            <input
              type="text"
              value={newPartner1Id}
              onChange={(e) => setNewPartner1Id(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Partner 1 UUID"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">파트너 2 ID</label>
            <input
              type="text"
              value={newPartner2Id}
              onChange={(e) => setNewPartner2Id(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Partner 2 UUID"
              disabled={loading}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={createCouple}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              {loading ? '생성 중...' : '커플 생성'}
            </button>
          </div>
        </div>
      </div>

      {/* 커플 목록 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">커플 목록</h2>
          <button
            onClick={fetchCouples}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
        </div>
        
        {couples.length === 0 ? (
          <p className="text-gray-500">등록된 커플이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {couples.map((couple) => (
              <div key={couple.id} className="border rounded p-4 bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>ID:</strong> {couple.id}</p>
                    <p><strong>파트너 1:</strong> {couple.partner1_id}</p>
                    <p><strong>파트너 2:</strong> {couple.partner2_id}</p>
                    <p><strong>상태:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-sm ${
                        couple.status === 'active' ? 'bg-green-100 text-green-800' :
                        couple.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {couple.status}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => checkCoupleStatus(couple.id)}
                      disabled={loading}
                      className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:bg-gray-400"
                    >
                      상태 확인
                    </button>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => updateCoupleStatus(couple.id, 'pending')}
                        disabled={loading}
                        className="px-2 py-1 bg-yellow-500 text-white rounded text-xs disabled:bg-gray-400"
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateCoupleStatus(couple.id, 'accepted')}
                        disabled={loading}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:bg-gray-400"
                      >
                        Accepted
                      </button>
                      <button
                        onClick={() => updateCoupleStatus(couple.id, 'active')}
                        disabled={loading}
                        className="px-2 py-1 bg-green-500 text-white rounded text-xs disabled:bg-gray-400"
                      >
                        Active
                      </button>
                    </div>
                    <button
                      onClick={() => deleteCouple(couple.id)}
                      disabled={loading}
                      className="w-full px-3 py-1 bg-red-500 text-white rounded text-sm disabled:bg-gray-400"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 테스트 결과 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">테스트 결과</h2>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm"
          >
            결과 지우기
          </button>
        </div>
        
        {testResults.length === 0 ? (
          <p className="text-gray-500">아직 테스트 결과가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
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

      {/* 도움말 */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium text-gray-800 mb-2">테스트 가이드:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 파트너 ID는 실제 users 테이블의 UUID여야 합니다</li>
          <li>• 커플 생성 시 pending 상태로 시작됩니다</li>
          <li>• 상태는 pending → accepted → active 순서로 변경됩니다</li>
          <li>• 각 사용자는 하나의 활성 커플만 가질 수 있습니다</li>
        </ul>
      </div>
    </div>
  )
} 