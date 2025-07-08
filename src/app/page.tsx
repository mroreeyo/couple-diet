import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center space-y-8 max-w-2xl">
          {/* Hero Section */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight">
              커플 다이어트
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              함께하는 건강한 라이프스타일 ❤️
            </p>
            <p className="text-gray-500">
              연인과 함께 목표를 세우고, 서로를 응원하며 건강해져요!
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
            >
              회원가입하기
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-blue-600 bg-white hover:bg-gray-50 rounded-md border border-blue-300 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
            >
              로그인
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">💪</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">함께 운동</h3>
              <p className="text-gray-600 text-sm">
                커플끼리 운동 계획을 세우고 서로의 진행상황을 확인해요
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">🥗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">식단 관리</h3>
              <p className="text-gray-600 text-sm">
                건강한 식단을 공유하고 함께 요리해보세요
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">진행 추적</h3>
              <p className="text-gray-600 text-sm">
                목표 달성 과정을 시각화하고 성과를 공유해요
              </p>
            </div>
          </div>

          {/* Test Links */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">개발 테스트 페이지</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                href="/test-auth"
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded"
              >
                인증 테스트
              </Link>
              <Link
                href="/test-couples"
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded"
              >
                커플 테스트
              </Link>
              <Link
                href="/test-api-endpoints"
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded"
              >
                API 테스트
              </Link>
              <Link
                href="/test-meal-analysis"
                className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded"
              >
                🧪 AI 음식 분석 테스트
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
