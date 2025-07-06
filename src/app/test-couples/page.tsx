'use client'

import { useState, useEffect } from 'react'

interface ApiResponse {
  success: boolean
  data?: any
  message?: string
  error?: string
}

interface UserInfo {
  id: string
  email: string
  displayName: string
  partnerId?: string
}

interface PartnerInfo {
  id: string
  email: string
  displayName: string
}

interface CoupleStatus {
  currentUser: UserInfo
  coupleStatus: 'none' | 'pending_sent' | 'pending_received' | 'active'
  partnerInfo: PartnerInfo | null
  requestInfo: any
}

export default function TestCouplesPage() {
  const [accessToken, setAccessToken] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [requestId, setRequestId] = useState('')
  const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null)
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // API 호출 함수
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any, token?: string): Promise<ApiResponse> => {
    setIsLoading(true)
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const config: RequestInit = {
        method,
        headers,
      }

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body)
      }

      const response = await fetch(endpoint, config)
      const data = await response.json()

      const result: ApiResponse = {
        success: response.ok,
        data: data.data,
        message: data.message,
        error: data.error
      }

      setLastResponse(result)
      return result
    } catch (error) {
      const result: ApiResponse = {
        success: false,
        error: '네트워크 오류가 발생했습니다.'
      }
      setLastResponse(result)
      return result
    } finally {
      setIsLoading(false)
    }
  }

  // 커플 상태 조회
  const checkCoupleStatus = async () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }

    const result = await apiCall('/api/couples/status', 'GET', undefined, accessToken)
    if (result.success && result.data) {
      setCoupleStatus(result.data)
    }
  }

  // 커플 요청 보내기
  const sendCoupleRequest = async () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }

    if (!partnerEmail) {
      alert('파트너 이메일을 입력해주세요.')
      return
    }

    await apiCall('/api/couples/send-request', 'POST', { partnerEmail }, accessToken)
    // 요청 후 상태 새로고침
    setTimeout(() => checkCoupleStatus(), 500)
  }

  // 커플 요청 수락
  const acceptCoupleRequest = async () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }

    if (!requestId) {
      alert('요청 ID를 입력해주세요.')
      return
    }

    await apiCall('/api/couples/respond-request', 'POST', { action: 'accept', requestId: parseInt(requestId) }, accessToken)
    // 요청 후 상태 새로고침
    setTimeout(() => checkCoupleStatus(), 500)
  }

  // 커플 요청 거절
  const rejectCoupleRequest = async () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }

    if (!requestId) {
      alert('요청 ID를 입력해주세요.')
      return
    }

    await apiCall('/api/couples/respond-request', 'POST', { action: 'reject', requestId: parseInt(requestId) }, accessToken)
    // 요청 후 상태 새로고침
    setTimeout(() => checkCoupleStatus(), 500)
  }

  // 커플 관계 해제
  const disconnectCouple = async () => {
    if (!accessToken) {
      alert('먼저 로그인해서 토큰을 받아주세요.')
      return
    }

    if (!confirm('정말로 커플 관계를 해제하시겠습니까?')) {
      return
    }

    await apiCall('/api/couples/disconnect', 'POST', {}, accessToken)
    // 요청 후 상태 새로고침
    setTimeout(() => checkCoupleStatus(), 500)
  }

  // 페이지 로드 시 상태 확인
  useEffect(() => {
    if (accessToken) {
      checkCoupleStatus()
    }
  }, [accessToken])

  // 상태별 UI 렌더링
  const renderCoupleStatusUI = () => {
    if (!coupleStatus) return null

    const { coupleStatus: status, partnerInfo, requestInfo } = coupleStatus

    switch (status) {
      case 'none':
        return (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-black">커플 관계 없음</h3>
            <p className="text-gray-800 mb-4">현재 커플 관계가 없습니다. 새로운 커플 요청을 보내보세요!</p>
          </div>
        )

      case 'pending_sent':
        return (
          <div className="bg-yellow-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-black">커플 요청 전송됨</h3>
            <p className="text-gray-800 mb-2">다음 사용자에게 커플 요청을 보냈습니다:</p>
            {partnerInfo && (
              <div className="bg-white p-2 rounded">
                <p className="text-black"><strong>이메일:</strong> {partnerInfo.email}</p>
                <p className="text-black"><strong>이름:</strong> {partnerInfo.displayName}</p>
              </div>
            )}
            {requestInfo && (
              <p className="text-sm text-gray-700 mt-2">
                요청 ID: {requestInfo.id} | 전송 시간: {new Date(requestInfo.requestedAt).toLocaleString()}
              </p>
            )}
          </div>
        )

      case 'pending_received':
        return (
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-black">커플 요청 받음</h3>
            <p className="text-gray-800 mb-2">다음 사용자로부터 커플 요청을 받았습니다:</p>
            {partnerInfo && (
              <div className="bg-white p-2 rounded mb-4">
                <p className="text-black"><strong>이메일:</strong> {partnerInfo.email}</p>
                <p className="text-black"><strong>이름:</strong> {partnerInfo.displayName}</p>
              </div>
            )}
            {requestInfo && (
              <>
                <input
                  type="number"
                  value={requestId || requestInfo.id}
                  onChange={(e) => setRequestId(e.target.value)}
                  placeholder="요청 ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-black"
                />
                <div className="flex gap-2">
                  <button
                    onClick={acceptCoupleRequest}
                    disabled={isLoading}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                  >
                    수락
                  </button>
                  <button
                    onClick={rejectCoupleRequest}
                    disabled={isLoading}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
                  >
                    거절
                  </button>
                </div>
              </>
            )}
          </div>
        )

      case 'active':
        return (
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-black">🎉 커플 관계 활성화됨</h3>
            <p className="text-gray-800 mb-2">현재 파트너:</p>
            {partnerInfo && (
              <div className="bg-white p-2 rounded mb-4">
                <p className="text-black"><strong>이메일:</strong> {partnerInfo.email}</p>
                <p className="text-black"><strong>이름:</strong> {partnerInfo.displayName}</p>
              </div>
            )}
            {requestInfo && (
              <p className="text-sm text-gray-700 mb-4">
                수락 시간: {new Date(requestInfo.acceptedAt).toLocaleString()}
              </p>
            )}
            <button
              onClick={disconnectCouple}
              disabled={isLoading}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              커플 관계 해제
            </button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">
          🍽️ 커플 다이어트 - 커플 연결 기능 테스트
        </h1>

        {/* 토큰 입력 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">1. 인증 토큰 설정</h2>
          <p className="text-gray-800 mb-4">
            먼저 <a href="/test-api-endpoints" className="text-blue-600 underline">API 테스트 페이지</a>에서 
            로그인하여 토큰을 받아오세요.
          </p>
          <input
            type="text"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Bearer 토큰을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
          />
          {accessToken && (
            <div className="mt-2 text-sm">
              <p className="text-gray-600">
                토큰 길이: <span className="font-semibold text-black">{accessToken.length}</span>자
              </p>
              <p className="text-gray-600">
                토큰 시작: <span className="font-mono text-black">{accessToken.substring(0, 30)}...</span>
              </p>
              <p className="text-gray-600">
                토큰 끝: <span className="font-mono text-black">...{accessToken.substring(accessToken.length - 30)}</span>
              </p>
            </div>
          )}
        </div>

        {/* 현재 커플 상태 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-black">2. 현재 커플 상태</h2>
            <button
              onClick={checkCoupleStatus}
              disabled={isLoading || !accessToken}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              상태 새로고침
            </button>
          </div>
          
          {coupleStatus ? renderCoupleStatusUI() : (
            <p className="text-gray-700">토큰을 입력하고 상태를 확인해주세요.</p>
          )}
        </div>

        {/* 커플 요청 보내기 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">3. 커플 요청 보내기</h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="파트너 이메일 주소"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black"
            />
            <button
              onClick={sendCoupleRequest}
              disabled={isLoading || !accessToken}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              요청 보내기
            </button>
          </div>
        </div>

        {/* 수동 요청 응답 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">4. 수동 요청 응답 (고급)</h2>
          <p className="text-gray-800 mb-4">특정 요청 ID로 직접 응답하려면 사용하세요.</p>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="요청 ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptCoupleRequest}
              disabled={isLoading || !accessToken}
              className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              수락
            </button>
            <button
              onClick={rejectCoupleRequest}
              disabled={isLoading || !accessToken}
              className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              거절
            </button>
          </div>
        </div>

        {/* 마지막 API 응답 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-black">5. 마지막 API 응답</h2>
          {lastResponse ? (
            <div className={`p-4 rounded-lg ${lastResponse.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center mb-2">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${lastResponse.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="font-semibold text-black">
                  {lastResponse.success ? '성공' : '실패'}
                </span>
              </div>
              {lastResponse.message && (
                <p className="text-gray-800 mb-2">{lastResponse.message}</p>
              )}
              {lastResponse.error && (
                <p className="text-red-600 mb-2">{lastResponse.error}</p>
              )}
              {lastResponse.data && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    응답 데이터 보기
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto text-black">
                    {JSON.stringify(lastResponse.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <p className="text-gray-700">아직 API 요청을 하지 않았습니다.</p>
          )}
        </div>

        {/* 사용 안내 */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-2 text-black">📝 사용 안내</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-800">
            <li>먼저 <a href="/test-api-endpoints" className="text-blue-600 underline">API 테스트 페이지</a>에서 로그인하여 토큰을 받아옵니다.</li>
            <li>받은 토큰을 위의 "인증 토큰 설정"에 입력합니다.</li>
            <li>"상태 새로고침" 버튼을 클릭하여 현재 커플 상태를 확인합니다.</li>
            <li>상대방의 이메일을 입력하고 커플 요청을 보냅니다.</li>
            <li>상대방도 같은 과정으로 요청을 수락/거절할 수 있습니다.</li>
            <li>커플 관계가 활성화되면 해제 버튼이 나타납니다.</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 