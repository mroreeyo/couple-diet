import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MealHistoryPage from '../page';
import { getMealHistory } from '@/lib/meals-history';
import { AuthContext } from '@/contexts/auth-context';
import { User } from '@supabase/supabase-js';

// Next.js App Router 모킹
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/meals';
  },
}));

// Next.js Link 컴포넌트 모킹
jest.mock('next/link', () => {
  return ({ children }: { children: React.ReactNode }) => children;
});

// Next.js Image 컴포넌트 모킹
jest.mock('next/image', () => {
  return ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />;
});

// useUser 훅 모킹
jest.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    user: { id: 'test-user-id' },
    loading: false,
  }),
}));

// getMealHistory 모킹
jest.mock('@/lib/meals-history', () => ({
  getMealHistory: jest.fn(),
}));

const mockUser: User = {
  id: 'test-user-id',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-03-20T12:00:00Z',
  role: 'authenticated',
  updated_at: '2024-03-20T12:00:00Z',
};

const mockAuthContext = {
  user: mockUser,
  loading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  resetPassword: jest.fn(),
};

const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {ui}
    </AuthContext.Provider>
  );
};

describe('MealHistoryPage', () => {
  beforeEach(() => {
    // 각 테스트 전에 모든 모의(mock) 초기화
    jest.clearAllMocks();
  });

  it('로딩 상태를 표시해야 함', async () => {
    (getMealHistory as jest.Mock).mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      renderWithAuth(<MealHistoryPage />);
    });
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('식사 기록이 없을 때 메시지를 표시해야 함', async () => {
    (getMealHistory as jest.Mock).mockResolvedValue({ success: true, data: [] });
    await act(async () => {
      renderWithAuth(<MealHistoryPage />);
    });
    const emptyMessage = await screen.findByText(/아직 기록된 식사가 없습니다/i);
    expect(emptyMessage).toBeInTheDocument();
  });

  it('식사 기록 목록을 표시해야 함', async () => {
    const mockMeals = [
      {
        id: '1',
        user_id: 'test-user-id',
        created_at: '2024-03-20T12:00:00Z',
        meal_type: 'lunch',
        total_calories: 800,
        analysis_result: {
          foods: [
            { name: '김치찌개', calories: 500 },
            { name: '공기밥', calories: 300 },
          ],
          total_calories: 800,
          meal_type: 'lunch',
          analysis_confidence: 0.9,
        },
        image_url: 'test-image.jpg',
      },
    ];

    (getMealHistory as jest.Mock).mockResolvedValue({ success: true, data: mockMeals });
    await act(async () => {
      renderWithAuth(<MealHistoryPage />);
    });
    
    // 식사 기록 카드가 표시되는지 확인
    const mealCard = await screen.findByTestId('meal-card-1');
    expect(mealCard).toBeInTheDocument();
    
    // 음식 항목들이 표시되는지 확인
    expect(screen.getByText(/김치찌개/)).toBeInTheDocument();
    expect(screen.getByText(/공기밥/)).toBeInTheDocument();
    
    // 총 칼로리가 표시되는지 확인
    expect(screen.getByText('800 kcal')).toBeInTheDocument();
  });
}); 