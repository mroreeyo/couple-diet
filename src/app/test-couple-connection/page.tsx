'use client'

import { AuthGuard } from '@/components/auth'
import { CoupleConnectionWidget } from '@/components/couples/CoupleConnectionWidget'
import Link from 'next/link'

function TestCoupleConnectionContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent mb-4">
            💕 커플 연결 기능 테스트
          </h1>
          <p className="text-gray-600 mb-6">
            커플 연결 기능을 테스트해보세요. 이메일로 파트너에게 요청을 보내고 응답할 수 있습니다.
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>

        {/* 커플 연결 위젯 */}
        <div className="max-w-2xl mx-auto mb-8">
          <CoupleConnectionWidget />
        </div>

        {/* 사용법 가이드 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🔧 사용법 가이드
          </h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2">1. 커플 요청 보내기</h3>
              <p className="text-blue-700 text-sm">
                • 파트너의 이메일 주소를 입력하고 "커플 요청 보내기" 버튼을 클릭하세요<br/>
                • 파트너는 같은 앱에 회원가입이 되어 있어야 합니다<br/>
                • 요청이 성공적으로 전송되면 "요청 전송됨" 상태로 변경됩니다
              </p>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
              <h3 className="font-semibold text-pink-800 mb-2">2. 커플 요청 받기</h3>
              <p className="text-pink-700 text-sm">
                • 다른 사용자가 요청을 보내면 "커플 요청 받음" 상태로 변경됩니다<br/>
                • "수락" 또는 "거절" 버튼을 클릭하여 응답할 수 있습니다<br/>
                • 수락하면 커플 관계가 성립됩니다
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-green-800 mb-2">3. 커플 관계 관리</h3>
              <p className="text-green-700 text-sm">
                • 커플 관계가 성립되면 "커플 연결됨" 상태로 변경됩니다<br/>
                • "함께 식단 보기" 버튼으로 파트너와 식단을 공유할 수 있습니다 (추후 구현)<br/>
                • "커플 관계 해제" 버튼으로 관계를 종료할 수 있습니다
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-2">4. 테스트 시나리오</h3>
              <p className="text-gray-700 text-sm">
                • 두 개의 계정으로 테스트해보세요 (다른 브라우저 또는 시크릿 모드 사용)<br/>
                • A 계정에서 B 계정으로 요청을 보내고, B 계정에서 응답해보세요<br/>
                • 각 상태 변화를 확인하고 알림 메시지를 확인해보세요
              </p>
            </div>
          </div>
        </div>

        {/* API 엔드포인트 정보 */}
        <div className="mt-8 bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🛠️ API 엔드포인트
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm font-mono text-gray-800">GET /api/couples/status</code>
              <p className="text-xs text-gray-600 mt-1">현재 커플 상태 조회</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm font-mono text-gray-800">POST /api/couples/send-request</code>
              <p className="text-xs text-gray-600 mt-1">커플 요청 보내기</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm font-mono text-gray-800">POST /api/couples/respond-request</code>
              <p className="text-xs text-gray-600 mt-1">커플 요청에 응답</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm font-mono text-gray-800">POST /api/couples/disconnect</code>
              <p className="text-xs text-gray-600 mt-1">커플 관계 해제</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TestCoupleConnectionPage() {
  return (
    <AuthGuard requireAuth={true}>
      <TestCoupleConnectionContent />
    </AuthGuard>
  )
} 