'use client'

import { AuthGuard } from '@/components/auth'
import { useAuth } from '@/contexts/auth-context'
import { LogOut, User } from 'lucide-react'
import { useState } from 'react'

function DashboardContent() {
  const { user, signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50">
      {/* Header with user info and logout */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent">
                  💕 Couple Diet
                </h1>
                <p className="text-sm text-gray-600">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">
                {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              대시보드
            </h2>
            <p className="text-gray-600">
              함께하는 건강한 식습관 여정에 오신 것을 환영합니다! 🎉
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                환영합니다! 👋
              </h3>
              <p className="text-gray-600">
                커플 다이어트를 시작해보세요.
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                오늘의 목표 🎯
              </h3>
              <p className="text-gray-600">
                아직 목표가 설정되지 않았습니다.
              </p>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                진행 상황 📊
              </h3>
              <p className="text-gray-600">
                데이터가 없습니다.
              </p>
            </div>

            {/* 빠른 액션 카드들 */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                식사 기록 📝
              </h3>
              <p className="text-gray-600 mb-4">
                오늘의 식사를 기록해보세요.
              </p>
              <button className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95">
                식사 추가하기
              </button>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                파트너 연결 💑
              </h3>
              <p className="text-gray-600 mb-4">
                파트너와 함께 건강한 식습관을 만들어보세요.
              </p>
              <button className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95">
                파트너 연결하기
              </button>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                테스트 페이지 🧪
              </h3>
              <p className="text-gray-600 mb-4">
                개발된 기능들을 테스트해보세요.
              </p>
              <div className="space-y-2">
                <a 
                  href="/meals/new" 
                  className="block w-full text-center bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                >
                  식사 업로드
                </a>
                <a 
                  href="/test-realtime-validation" 
                  className="block w-full text-center bg-green-100 hover:bg-green-200 text-green-700 py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                >
                  실시간 검증
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth={true}>
      <DashboardContent />
    </AuthGuard>
  )
} 