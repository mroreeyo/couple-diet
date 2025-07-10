'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { Heart, Users, UserPlus, Mail, Check, X, LogOut } from 'lucide-react'

interface PartnerInfo {
  id: string
  email: string
  displayName: string | null
}

interface CoupleStatusData {
  status: 'none' | 'pending_sent' | 'pending_received' | 'active'
  partner?: PartnerInfo
  requestInfo?: {
    id: string
    requestedAt: string
    acceptedAt?: string
    createdAt: string
  }
}

export function CoupleConnectionWidget() {
  const { user } = useAuth()
  const [coupleStatus, setCoupleStatus] = useState<CoupleStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // API 호출을 위한 토큰 헤더
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return { 'Content-Type': 'application/json' }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        return {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    } catch (error) {
      console.error('Failed to get session:', error)
    }
    
    return { 'Content-Type': 'application/json' }
  }

  // 커플 상태 확인
  const fetchCoupleStatus = async () => {
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      const response = await fetch('/api/couples/status', {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // API 응답을 프론트엔드 형식으로 매핑
          setCoupleStatus({
            status: result.data.coupleStatus, // coupleStatus -> status
            partner: result.data.partnerInfo ? {
              id: result.data.partnerInfo.id,
              email: result.data.partnerInfo.email,
              displayName: result.data.partnerInfo.displayName
            } : undefined,
            requestInfo: result.data.requestInfo
          })
        }
      } else {
        console.error('API 응답 에러:', await response.text())
      }
    } catch (error) {
      console.error('커플 상태 확인 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 커플 요청 보내기
  const sendCoupleRequest = async (email: string) => {
    setActionLoading('send')
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      const response = await fetch('/api/couples/send-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetUserEmail: email })
      })

      if (response.ok) {
        await fetchCoupleStatus()
        setPartnerEmail('')
      } else {
        const errorData = await response.json()
        alert(errorData.message || '요청 실패')
      }
    } catch (error) {
      console.error('커플 요청 실패:', error)
      alert('요청 중 오류가 발생했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  // 커플 요청 수락
  const acceptCoupleRequest = async () => {
    setActionLoading('accept')
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      const response = await fetch('/api/couples/respond-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          coupleId: coupleStatus?.requestInfo?.id,
          action: 'accept'
        })
      })

      if (response.ok) {
        await fetchCoupleStatus()
      } else {
        const errorData = await response.json()
        alert(errorData.message || '수락 실패')
      }
    } catch (error) {
      console.error('커플 요청 수락 실패:', error)
      alert('수락 중 오류가 발생했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  // 커플 요청 거절
  const rejectCoupleRequest = async () => {
    setActionLoading('reject')
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      const response = await fetch('/api/couples/respond-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          coupleId: coupleStatus?.requestInfo?.id,
          action: 'decline'
        })
      })

      if (response.ok) {
        await fetchCoupleStatus()
      } else {
        const errorData = await response.json()
        alert(errorData.message || '거절 실패')
      }
    } catch (error) {
      console.error('커플 요청 거절 실패:', error)
      alert('거절 중 오류가 발생했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  // 커플 연결 해제
  const disconnectCouple = async () => {
    if (!confirm('정말로 커플 연결을 해제하시겠습니까?')) return

    setActionLoading('disconnect')
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) return

      const response = await fetch('/api/couples/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await fetchCoupleStatus()
      } else {
        const errorData = await response.json()
        alert(errorData.message || '연결 해제 실패')
      }
    } catch (error) {
      console.error('커플 연결 해제 실패:', error)
      alert('연결 해제 중 오류가 발생했습니다')
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchCoupleStatus()
  }, [user])

  // 에러/메시지 자동 제거
  useEffect(() => {
    if (error || message) {
      const timer = setTimeout(() => {
        setError('')
        setMessage('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, message])

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          <span className="ml-3 text-gray-600">상태 확인 중...</span>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (!coupleStatus) return null

    switch (coupleStatus.status) {
      case 'none':
        return (
          <div>
            <div className="flex items-center mb-4">
              <UserPlus className="w-6 h-6 text-pink-500 mr-3" />
              <h3 className="text-xl font-semibold text-gray-800">
                파트너 연결하기
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              파트너의 이메일을 입력하여 커플 요청을 보내세요.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="파트너 이메일 주소"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                disabled={actionLoading === 'send'}
              />
              <button
                onClick={() => sendCoupleRequest(partnerEmail)}
                disabled={actionLoading === 'send' || !partnerEmail.trim()}
                className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {actionLoading === 'send' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    요청 전송 중...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    커플 요청 보내기
                  </div>
                )}
              </button>
            </div>
          </div>
        )

      case 'pending_sent':
        return (
          <div>
            <div className="flex items-center mb-4">
              <Mail className="w-6 h-6 text-blue-500 mr-3" />
              <h3 className="text-xl font-semibold text-gray-800">
                요청 전송됨
              </h3>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-blue-800">
                <span className="font-semibold">{coupleStatus.partner?.email}</span>님에게 커플 요청을 보냈습니다.
              </p>
              <p className="text-blue-600 text-sm mt-1">
                상대방의 응답을 기다리고 있습니다...
              </p>
            </div>
            <button
              onClick={fetchCoupleStatus}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-xl transition-all duration-200"
            >
              상태 새로고침
            </button>
          </div>
        )

      case 'pending_received':
        return (
          <div>
            <div className="flex items-center mb-4">
              <Heart className="w-6 h-6 text-red-500 mr-3" />
              <h3 className="text-xl font-semibold text-gray-800">
                커플 요청 받음
              </h3>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4">
              <p className="text-pink-800">
                <span className="font-semibold">{coupleStatus.partner?.email}</span>님이 커플 요청을 보냈습니다! 💕
              </p>
              <p className="text-pink-600 text-sm mt-1">
                함께 건강한 식습관을 만들어보세요.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={acceptCoupleRequest}
                disabled={actionLoading === 'accept'}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {actionLoading === 'accept' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    수락 중...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Check className="w-4 h-4 mr-2" />
                    수락
                  </div>
                )}
              </button>
              <button
                onClick={rejectCoupleRequest}
                disabled={actionLoading === 'reject'}
                className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {actionLoading === 'reject' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    거절 중...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <X className="w-4 h-4 mr-2" />
                    거절
                  </div>
                )}
              </button>
            </div>
          </div>
        )

      case 'active':
        return (
          <div>
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-green-500 mr-3" />
              <h3 className="text-xl font-semibold text-gray-800">
                커플 연결됨
              </h3>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-green-800">
                <span className="font-semibold">{coupleStatus.partner?.email}</span>님과 연결되었습니다! 💕
              </p>
              {coupleStatus.requestInfo?.acceptedAt && (
                <p className="text-green-600 text-sm mt-1">
                  연결된 날짜: {new Date(coupleStatus.requestInfo.acceptedAt).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <button className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95">
                <div className="flex items-center justify-center">
                  <Heart className="w-4 h-4 mr-2" />
                  함께 식단 보기
                </div>
              </button>
              <button
                onClick={disconnectCouple}
                disabled={actionLoading === 'disconnect'}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {actionLoading === 'disconnect' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    해제 중...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <LogOut className="w-4 h-4 mr-2" />
                    커플 관계 해제
                  </div>
                )}
              </button>
            </div>
          </div>
        )

      default:
        return (
          <div>
            <p className="text-gray-600">알 수 없는 상태입니다.</p>
          </div>
        )
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
      {renderContent()}
      
      {/* 에러/성공 메시지 */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-green-800 text-sm">{message}</p>
        </div>
      )}
    </div>
  )
} 