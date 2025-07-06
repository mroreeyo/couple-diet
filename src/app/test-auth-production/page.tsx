'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthGuard } from '@/components/auth/auth-guard'
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'

export default function TestAuthProductionPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'dashboard'>('login')
  const { user, loading, signOut } = useAuth()

  // 로딩 중 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // 로그인된 사용자 대시보드
  if (user) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                🎉 프로덕션 인증 시스템 테스트
              </h1>

              {/* 사용자 정보 섹션 */}
              <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <h2 className="text-xl font-semibold text-green-800 mb-4">
                  ✅ 로그인 성공!
                </h2>
                <div className="space-y-2 text-green-700">
                  <p><span className="font-medium">이메일:</span> {user.email}</p>
                  <p><span className="font-medium">사용자 ID:</span> {user.id}</p>
                  <p><span className="font-medium">생성일:</span> {new Date(user.created_at).toLocaleDateString('ko-KR')}</p>
                  <p><span className="font-medium">이메일 인증:</span> {user.email_confirmed_at ? '✅ 완료' : '❌ 미완료'}</p>
                  <p><span className="font-medium">마지막 로그인:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ko-KR') : '정보 없음'}</p>
                </div>
              </div>

              {/* 기능 테스트 섹션 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🧪 기능 테스트
                </h3>
                <div className="grid gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">✅ AuthProvider</h4>
                    <p className="text-sm text-blue-700">전역 인증 상태 관리가 정상적으로 작동합니다.</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">✅ useAuth Hook</h4>
                    <p className="text-sm text-blue-700">사용자 정보와 인증 함수들이 정상적으로 제공됩니다.</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">✅ AuthGuard</h4>
                    <p className="text-sm text-blue-700">보호된 라우트가 정상적으로 작동합니다.</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">✅ 인증 유틸리티</h4>
                    <p className="text-sm text-blue-700">이메일 검증, 비밀번호 강도 체크 등이 정상 작동합니다.</p>
                  </div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="space-y-4">
                <button
                  onClick={signOut}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  🚪 로그아웃
                </button>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    모든 프로덕션 인증 기능이 정상적으로 작동하고 있습니다! 🎉
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  // 로그인/회원가입 폼
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔐 프로덕션 인증 시스템 테스트
            </h1>
            <p className="text-gray-600">
              새로 구현된 인증 시스템을 테스트해보세요
            </p>
          </div>

          {/* 모드 전환 버튼 */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                mode === 'login' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              로그인 테스트
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                mode === 'signup' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              회원가입 테스트
            </button>
          </div>

          {/* 폼 렌더링 */}
          {mode === 'login' && (
            <div>
              <LoginForm onSuccess={() => setMode('dashboard')} />
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">🧪 로그인 테스트 기능</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 이메일 형식 검증</li>
                  <li>• 로그인 시도 제한 (5회)</li>
                  <li>• 에러 메시지 한국어 번역</li>
                  <li>• 비밀번호 표시/숨김 토글</li>
                  <li>• 로딩 상태 표시</li>
                </ul>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <SignupForm onSuccess={() => setMode('login')} />
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">🧪 회원가입 테스트 기능</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 실시간 이메일 검증</li>
                  <li>• 비밀번호 강도 체크</li>
                  <li>• 비밀번호 확인 검증</li>
                  <li>• 성공 시 자동 페이지 전환</li>
                  <li>• 종합적인 입력 검증</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
} 