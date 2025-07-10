'use client';

import { useState } from 'react';
import { useToastHelpers } from '@/components/ui/toast-container';
import { useMealValidationNotifier } from '@/components/meals/MealValidationNotifier';

export default function TestMealNotificationsPage() {
  const { 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo, 
    showTimeRestriction, 
    showDuplicateWarning 
  } = useToastHelpers();

  const { 
    notifyTimeRestriction,
    notifyDuplicateUpload,
    notifyUploadSuccess,
    notifyUploadError,
    notifyFromAPIResponse
  } = useMealValidationNotifier({
    onViewExistingMeal: (mealId) => {
      console.log('View existing meal:', mealId);
      showInfo(`기존 식사 ${mealId} 보기 요청됨`);
    },
    onForceUpload: () => {
      console.log('Force upload as snack');
      showInfo('스낵으로 강제 업로드 요청됨');
    }
  });

  const [apiResponse, setApiResponse] = useState('');

  const testBasicToasts = () => {
    showSuccess('성공적으로 완료되었습니다!');
    
    setTimeout(() => {
      showError('오류가 발생했습니다. 다시 시도해주세요.');
    }, 1000);
    
    setTimeout(() => {
      showWarning('주의가 필요한 상황입니다.');
    }, 2000);
    
    setTimeout(() => {
      showInfo('정보성 메시지입니다.');
    }, 3000);
  };

  const testMealValidationToasts = () => {
    showTimeRestriction('현재 시간(15시)에는 아침식사 업로드가 제한됩니다.', {
      actionButton: {
        label: '내일 7시에 알림받기',
        onClick: () => showInfo('알림 설정됨!'),
        variant: 'primary'
      }
    });

    setTimeout(() => {
      showDuplicateWarning('오늘 이미 점심을 업로드했습니다.', {
        actionButton: {
          label: '기존 식사 보기',
          onClick: () => showInfo('기존 식사 페이지로 이동'),
          variant: 'primary'
        },
        children: (
          <div className="mt-2 space-y-1">
            <div className="text-xs opacity-75">기존 업로드 시간: 12:30</div>
            <div className="text-xs opacity-75">음식: 김치찌개</div>
          </div>
        )
      });
    }, 1500);
  };

  const testMealValidationFunctions = () => {
    notifyTimeRestriction('아침식사', 15, 5, 11);
    
    setTimeout(() => {
      notifyDuplicateUpload('점심', '12:30');
    }, 1000);
    
    setTimeout(() => {
      notifyUploadSuccess('저녁', '삼겹살');
    }, 2000);
    
    setTimeout(() => {
      notifyUploadError('네트워크 연결 실패');
    }, 3000);
  };

  const testAPIResponse = () => {
    const sampleAPIResponses = [
      // 성공 응답
      {
        success: true,
        data: { id: 'meal_123' },
        analysis: {
          meal_type: '저녁',
          food_name: '불고기',
          total_calories: 450
        }
      },
      
      // 시간대 제한 응답
      {
        success: false,
        error: '시간대 제한으로 업로드 실패',
        validation: {
          timeValidation: {
            isValid: false,
            message: '현재 시간(2시)에는 아침식사 업로드가 제한됩니다.',
            restrictionReason: '아침식사는 5-11시에만 업로드할 수 있습니다.'
          },
          duplicateValidation: {
            isDuplicate: false,
            message: ''
          }
        },
        analysis: {
          meal_type: '아침',
          food_name: '토스트',
          total_calories: 200
        }
      },
      
      // 중복 업로드 응답
      {
        success: false,
        error: '중복 업로드로 저장 실패',
        validation: {
          timeValidation: {
            isValid: true,
            message: ''
          },
          duplicateValidation: {
            isDuplicate: true,
            message: '오늘 이미 점심을 업로드했습니다.',
            existingMeal: {
              id: 'meal_456',
              meal_name: '김치찌개',
              created_at: '2024-01-15T12:30:00Z'
            }
          }
        },
        analysis: {
          meal_type: '점심',
          food_name: '비빔밥',
          total_calories: 380
        }
      }
    ];

    sampleAPIResponses.forEach((response, index) => {
      setTimeout(() => {
        console.log('Testing API response:', response);
        notifyFromAPIResponse(response);
      }, index * 2000);
    });
  };

  const testCustomAPIResponse = () => {
    try {
      const response = JSON.parse(apiResponse);
      notifyFromAPIResponse(response);
    } catch (error) {
      showError('잘못된 JSON 형식입니다.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">🔔 식사 알림 시스템 테스트</h1>

      <div className="grid gap-6 max-w-4xl">
        {/* 기본 Toast 테스트 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">📢 기본 Toast 알림</h2>
          <p className="text-gray-600 mb-4">
            기본적인 Toast 알림들을 순서대로 테스트합니다.
          </p>
          <button
            onClick={testBasicToasts}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            기본 Toast 테스트
          </button>
        </div>

        {/* 식사 검증 Toast 테스트 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🍽️ 식사 검증 Toast</h2>
          <p className="text-gray-600 mb-4">
            시간대 제한과 중복 업로드 관련 특화된 Toast를 테스트합니다.
          </p>
          <button
            onClick={testMealValidationToasts}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            식사 검증 Toast 테스트
          </button>
        </div>

        {/* 식사 검증 함수 테스트 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">⚙️ 식사 검증 함수</h2>
          <p className="text-gray-600 mb-4">
            MealValidationNotifier의 개별 함수들을 테스트합니다.
          </p>
          <button
            onClick={testMealValidationFunctions}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            검증 함수 테스트
          </button>
        </div>

        {/* API 응답 테스트 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🔗 API 응답 테스트</h2>
          <p className="text-gray-600 mb-4">
            실제 API 응답 형태를 시뮬레이션하여 테스트합니다.
          </p>
          <button
            onClick={testAPIResponse}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            API 응답 시뮬레이션
          </button>
        </div>

        {/* 커스텀 API 응답 테스트 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🛠️ 커스텀 API 응답</h2>
          <p className="text-gray-600 mb-4">
            직접 JSON을 입력하여 API 응답을 테스트할 수 있습니다.
          </p>
          <textarea
            value={apiResponse}
            onChange={(e) => setApiResponse(e.target.value)}
            placeholder={`{
  "success": false,
  "error": "테스트 에러",
  "validation": {
    "timeValidation": {
      "isValid": false,
      "message": "시간대 제한 메시지"
    }
  }
}`}
            className="w-full h-40 p-3 border border-gray-300 rounded-lg mb-4 font-mono text-sm"
          />
          <button
            onClick={testCustomAPIResponse}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            커스텀 응답 테스트
          </button>
        </div>
      </div>

      {/* 사용법 안내 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 사용법</h3>
        <ul className="text-blue-700 space-y-1 text-sm">
          <li>• Toast는 화면 우상단에 나타나며 자동으로 사라집니다</li>
          <li>• 에러 메시지는 8초, 일반 메시지는 5초 동안 표시됩니다</li>
          <li>• 시간대 제한과 중복 업로드 메시지는 7초 동안 표시됩니다</li>
          <li>• X 버튼을 클릭하면 수동으로 닫을 수 있습니다</li>
          <li>• 액션 버튼이 있는 Toast는 사용자 액션을 유도합니다</li>
        </ul>
      </div>
    </div>
  );
} 