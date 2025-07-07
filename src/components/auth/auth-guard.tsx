'use client'

import { useAuth } from '@/contexts/auth-context'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from './loading-spinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push(redirectTo)
      } else if (!requireAuth && user) {
        router.push('/dashboard')
      }
    }
  }, [user, loading, requireAuth, router, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="lg" 
          text="인증 정보를 확인하는 중..."
        />
      </div>
    )
  }

  // 인증이 필요한 페이지
  if (requireAuth) {
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              로그인이 필요합니다
            </h2>
            <p className="text-gray-600 mb-4">
              이 페이지를 보려면 로그인이 필요합니다.
            </p>
            <button
              onClick={() => router.push(redirectTo)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              로그인 하러 가기
            </button>
          </div>
        </div>
      )
    }
    return <>{children}</>
  }

  // 인증이 필요하지 않은 페이지 (로그인, 회원가입 등)
  if (!requireAuth) {
    if (user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              이미 로그인되어 있습니다
            </h2>
            <p className="text-gray-600 mb-4">
              이미 로그인된 상태입니다.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              대시보드로 가기
            </button>
          </div>
        </div>
      )
    }
    return <>{children}</>
  }

  return <>{children}</>
} 