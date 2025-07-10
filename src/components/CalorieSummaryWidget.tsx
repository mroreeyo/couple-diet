'use client'

import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js'
import { TrendingUp, Calendar, Target, Users } from 'lucide-react'

// Chart.js 컴포넌트 등록
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
)

interface CalorieData {
  current: number
  goal: number
  partner?: {
    current: number
    goal: number
  }
}

interface WeeklyData {
  labels: string[]
  userCalories: number[]
  partnerCalories: number[]
}

interface CalorieSummaryWidgetProps {
  dailyData: CalorieData
  weeklyData: WeeklyData
  userName?: string
  partnerName?: string
}

export default function CalorieSummaryWidget({
  dailyData,
  weeklyData,
  userName = "나",
  partnerName = "파트너"
}: CalorieSummaryWidgetProps) {
  
  // 일일 칼로리 도넛 차트 데이터
  const dailyChartData = {
    labels: ['달성', '남은 목표'],
    datasets: [
      {
        data: [
          dailyData.current,
          Math.max(0, dailyData.goal - dailyData.current)
        ],
        backgroundColor: [
          'rgba(236, 72, 153, 0.8)', // 핑크
          'rgba(229, 231, 235, 0.3)'  // 회색
        ],
        borderColor: [
          'rgba(236, 72, 153, 1)',
          'rgba(229, 231, 235, 0.5)'
        ],
        borderWidth: 2,
        cutout: '70%'
      }
    ]
  }

  // 파트너 일일 칼로리 도넛 차트 데이터
  const partnerDailyChartData = dailyData.partner ? {
    labels: ['달성', '남은 목표'],
    datasets: [
      {
        data: [
          dailyData.partner.current,
          Math.max(0, dailyData.partner.goal - dailyData.partner.current)
        ],
        backgroundColor: [
          'rgba(251, 146, 60, 0.8)', // 오렌지
          'rgba(229, 231, 235, 0.3)'  // 회색
        ],
        borderColor: [
          'rgba(251, 146, 60, 1)',
          'rgba(229, 231, 235, 0.5)'
        ],
        borderWidth: 2,
        cutout: '70%'
      }
    ]
  } : null

  // 주간 추이 라인 차트 데이터
  const weeklyChartData = {
    labels: weeklyData.labels,
    datasets: [
      {
        label: userName,
        data: weeklyData.userCalories,
        borderColor: 'rgba(236, 72, 153, 1)',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(236, 72, 153, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: partnerName,
        data: weeklyData.partnerCalories,
        borderColor: 'rgba(251, 146, 60, 1)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(251, 146, 60, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }

  // 차트 옵션
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#374151',
        bodyColor: '#374151',
        borderColor: 'rgba(229, 231, 235, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            const label = context.label || ''
            const value = context.raw
            return `${label}: ${value}kcal`
          }
        }
      }
    }
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 'bold' as const
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#374151',
        bodyColor: '#374151',
        borderColor: 'rgba(229, 231, 235, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw}kcal`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(229, 231, 235, 0.3)'
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          }
        }
      }
    }
  }

  const userProgress = Math.round((dailyData.current / dailyData.goal) * 100)
  const partnerProgress = dailyData.partner ? 
    Math.round((dailyData.partner.current / dailyData.partner.goal) * 100) : 0

  return (
    <div className="space-y-4">
      {/* 오늘의 칼로리 - 도넛 차트 */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center mb-4">
          <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
          <h3 className="font-semibold text-gray-800">오늘의 칼로리</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 내 칼로리 도넛 차트 */}
          <div className="space-y-3">
            <div className="relative h-32">
              <Doughnut data={dailyChartData} options={doughnutOptions} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">{userProgress}%</div>
                  <div className="text-xs text-gray-600">{userName}</div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-800">
                {dailyData.current.toLocaleString()} / {dailyData.goal.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">kcal</div>
            </div>
          </div>

          {/* 파트너 칼로리 도넛 차트 */}
          {dailyData.partner && partnerDailyChartData && (
            <div className="space-y-3">
              <div className="relative h-32">
                <Doughnut data={partnerDailyChartData} options={doughnutOptions} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">{partnerProgress}%</div>
                    <div className="text-xs text-gray-600">{partnerName}</div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-800">
                  {dailyData.partner.current.toLocaleString()} / {dailyData.partner.goal.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">kcal</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 주간 칼로리 추이 - 라인 차트 */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center mb-4">
          <Calendar className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="font-semibold text-gray-800">주간 칼로리 추이</h3>
        </div>
        
        <div className="h-48">
          <Line data={weeklyChartData} options={lineOptions} />
        </div>
      </div>

      {/* 이번 주 목표 달성률 */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center mb-4">
          <Target className="w-5 h-5 text-purple-500 mr-2" />
          <h3 className="font-semibold text-gray-800">이번 주 목표</h3>
        </div>
        
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {weeklyData.userCalories.filter(cal => cal > 0).length} / 7
            </div>
            <div className="text-sm text-gray-600">식단 인증 완료</div>
          </div>
          
          <div className="flex justify-center space-x-1">
            {[1,2,3,4,5,6,7].map((day) => (
              <div 
                key={day} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200
                  ${weeklyData.userCalories[day - 1] > 0
                    ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 커플 현황 */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center mb-4">
          <Users className="w-5 h-5 text-pink-500 mr-2" />
          <h3 className="font-semibold text-gray-800">커플 현황</h3>
        </div>
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-pink-600">
            <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-orange-400 rounded-full"></div>
            <span className="font-semibold">함께 진행 중</span>
          </div>
          <div className="text-sm text-gray-600">
            {userName} & {partnerName}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            총 {weeklyData.userCalories.filter(cal => cal > 0).length + weeklyData.partnerCalories.filter(cal => cal > 0).length}회 식단 기록
          </div>
        </div>
      </div>
    </div>
  )
} 