'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  display_name?: string
  partner_id?: string
  daily_calorie_goal?: number
  timezone?: string
  preferences?: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface TestResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export default function TestUserSchema() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  
  // 테스트용 입력값들
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newCalorieGoal, setNewCalorieGoal] = useState('')
  const [newTimezone, setNewTimezone] = useState('Asia/Seoul')

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result])
  }

  const fetchUserProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        addTestResult({
          success: false,
          message: `사용자 목록 조회 실패: ${error.message}`
        })
      } else {
        setUserProfiles(data || [])
        addTestResult({
          success: true,
          message: `사용자 목록 조회 성공: ${data?.length || 0}명`
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `사용자 목록 조회 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const getCurrentUser = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        addTestResult({
          success: false,
          message: `현재 사용자 조회 실패: ${error.message}`
        })
      } else if (user) {
        setCurrentUser(user)
        addTestResult({
          success: true,
          message: `현재 사용자 조회 성공: ${user.email}`
        })
      } else {
        addTestResult({
          success: false,
          message: '로그인된 사용자가 없습니다'
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `현재 사용자 조회 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const updateUserProfile = async () => {
    if (!currentUser) {
      addTestResult({
        success: false,
        message: '로그인된 사용자가 없습니다'
      })
      return
    }

    setLoading(true)
    try {
      const updates: Partial<UserProfile> = {}
      
      if (newDisplayName) updates.display_name = newDisplayName
      if (newCalorieGoal) updates.daily_calorie_goal = parseInt(newCalorieGoal)
      if (newTimezone) updates.timezone = newTimezone

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single()

      if (error) {
        addTestResult({
          success: false,
          message: `사용자 프로필 업데이트 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: '사용자 프로필 업데이트 성공',
          data: { user: data }
        })
        fetchUserProfiles()
        // 입력값 초기화
        setNewDisplayName('')
        setNewCalorieGoal('')
        setNewTimezone('Asia/Seoul')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `사용자 프로필 업데이트 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePartner = async (userId: string, partnerId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ partner_id: partnerId || null })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        addTestResult({
          success: false,
          message: `파트너 정보 업데이트 실패: ${error.message}`
        })
      } else {
        addTestResult({
          success: true,
          message: '파트너 정보 업데이트 성공',
          data: { user: data }
        })
        fetchUserProfiles()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addTestResult({
        success: false,
        message: `파트너 정보 업데이트 중 오류: ${errorMessage}`
      })
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  useEffect(() => {
    getCurrentUser()
    fetchUserProfiles()
  }, [getCurrentUser, fetchUserProfiles])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">사용자 스키마 테스트</h1>
      
      {/* 현재 사용자 정보 */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold mb-3">현재 로그인 사용자</h2>
        {currentUser ? (
          <div>
            <p><strong>ID:</strong> {currentUser.id}</p>
            <p><strong>이메일:</strong> {currentUser.email}</p>
            <p><strong>이메일 확인:</strong> {currentUser.email_confirmed_at ? '확인됨' : '미확인'}</p>
            <p><strong>가입일:</strong> {new Date(currentUser.created_at).toLocaleString()}</p>
          </div>
        ) : (
          <div>
            <p className="text-red-600">로그인된 사용자가 없습니다.</p>
            <p className="text-sm text-gray-600">
              <a href="/test-auth" className="text-blue-600 underline">
                인증 테스트 페이지
              </a>에서 로그인해주세요.
            </p>
          </div>
        )}
      </div>

      {/* 프로필 업데이트 */}
      {currentUser && (
        <div className="mb-6 p-4 bg-green-50 rounded">
          <h2 className="text-lg font-semibold mb-3">프로필 업데이트</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">표시 이름</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="표시 이름 입력"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">일일 칼로리 목표</label>
              <input
                type="number"
                value={newCalorieGoal}
                onChange={(e) => setNewCalorieGoal(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="예: 2000"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">시간대</label>
              <select
                value={newTimezone}
                onChange={(e) => setNewTimezone(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                disabled={loading}
              >
                <option value="Asia/Seoul">Asia/Seoul</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={updateUserProfile}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
            >
              {loading ? '업데이트 중...' : '프로필 업데이트'}
            </button>
          </div>
        </div>
      )}

      {/* 사용자 목록 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">사용자 목록</h2>
          <div className="space-x-2">
            <button
              onClick={getCurrentUser}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
              {loading ? '확인 중...' : '현재 사용자 확인'}
            </button>
            <button
              onClick={fetchUserProfiles}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
            >
              {loading ? '새로고침 중...' : '목록 새로고침'}
            </button>
          </div>
        </div>
        
        {userProfiles.length === 0 ? (
          <p className="text-gray-500">등록된 사용자가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {userProfiles.map((user) => (
              <div key={user.id} className="border rounded p-4 bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>ID:</strong> {user.id}</p>
                    <p><strong>이메일:</strong> {user.email}</p>
                    <p><strong>표시 이름:</strong> {user.display_name || '설정되지 않음'}</p>
                    <p><strong>파트너 ID:</strong> {user.partner_id || '없음'}</p>
                    <p><strong>칼로리 목표:</strong> {user.daily_calorie_goal || '설정되지 않음'}</p>
                    <p><strong>시간대:</strong> {user.timezone || '설정되지 않음'}</p>
                    <p><strong>가입일:</strong> {new Date(user.created_at).toLocaleString()}</p>
                    <p><strong>수정일:</strong> {new Date(user.updated_at).toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const partnerId = prompt('파트너 ID를 입력하세요 (없애려면 빈 값):', user.partner_id || '')
                        if (partnerId !== null) {
                          updatePartner(user.id, partnerId)
                        }
                      }}
                      disabled={loading}
                      className="w-full px-3 py-1 bg-purple-500 text-white rounded text-sm disabled:bg-gray-400"
                    >
                      파트너 설정/해제
                    </button>
                    {user.preferences && (
                      <div className="text-xs">
                        <strong>설정:</strong>
                        <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(user.preferences, null, 2)}
                        </pre>
                      </div>
                    )}
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
          <li>• 먼저 인증 테스트 페이지에서 로그인해주세요</li>
          <li>• 프로필 업데이트는 현재 로그인한 사용자에 대해서만 가능합니다</li>
          <li>• 파트너 ID는 다른 사용자의 UUID여야 합니다</li>
          <li>• RLS 정책에 의해 자신의 정보만 수정할 수 있습니다</li>
          <li>• preferences 필드는 JSON 객체로 저장됩니다</li>
        </ul>
      </div>
    </div>
  )
} 