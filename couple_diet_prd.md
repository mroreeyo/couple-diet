# 커플 다이어트 식단 인증 웹사이트 MVP - PRD (Product Requirements Document)

## 1. 프로젝트 개요

### 1.1 프로젝트 목표
- 커플이 서로의 매끼 식단을 인증하며 함께 다이어트를 할 수 있는 모바일 최적화 웹사이트 개발
- AI 기반 칼로리 측정 기능을 통한 자동화된 식단 관리
- 간편한 사진 업로드와 직관적인 UI/UX 제공

### 1.2 타겟 사용자
- 함께 다이어트를 하고 싶은 커플
- 식단 관리에 관심이 있는 사용자
- 모바일 환경에서 간편하게 식단을 기록하고 싶은 사용자

## 2. 핵심 기능 요구사항

### 2.1 사용자 인증 시스템
- **로그인/회원가입 기능**
  - 이메일 기반 회원가입
  - 소셜 로그인 옵션 (Google, Apple 등)
  - 비밀번호 찾기 기능
  - 커플 연결 기능 (초대 코드 또는 이메일 기반)

### 2.2 식단 인증 시스템
- **일일 3회 식단 인증**
  - 오전 (6시~9시): 아침 식사
  - 오후 (12시~2시): 점심 식사
  - 저녁 (6시~9시): 저녁 식사
  - 각 시간대별 1회 업로드 제한
  - 시간대 외 업로드 시 알림/경고

- **사진 업로드 기능**
  - 카메라 촬영 또는 갤러리에서 선택
  - 이미지 압축 및 최적화
  - 업로드 진행 상태 표시

### 2.3 AI 칼로리 측정 시스템
- **자동 칼로리 계산**
  - 업로드된 사진 분석
  - 음식 종류 및 양 인식
  - 예상 칼로리 자동 계산
  - 계산 결과를 게시물에 표시

- **게시물 구성**
  - 사진 + 칼로리 정보 = 1개 게시물
  - 일일 총 칼로리 합계 표시
  - 게시 시간 및 식사 구분 표시

### 2.4 데이터 표시 시스템
- **일일 칼로리 합계**
  - 3끼 식단의 총 칼로리 계산
  - "합계: XXX kcal" 형태로 표시
  - 실시간 업데이트

## 3. 화면 구성 요구사항

### 3.1 로그인/회원가입 화면
- **로그인 화면**
  - 이메일/비밀번호 입력 필드
  - 로그인 버튼
  - 회원가입 링크
  - 소셜 로그인 버튼들
  - 비밀번호 찾기 링크

- **회원가입 화면**
  - 이메일, 비밀번호, 이름 입력 필드
  - 비밀번호 확인 필드
  - 이용약관 동의 체크박스
  - 회원가입 버튼
  - 커플 연결 옵션

### 3.2 식단 일지 화면 (메인 피드)
- **무한 스크롤 피드**
  - 오늘 날짜 표시
  - 3끼 식단 게시물 표시 (아침 → 점심 → 저녁 순)
  - 각 게시물: 사진 + 칼로리 정보 + 시간
  - 일일 총 칼로리 합계 표시
  - 과거 날짜 게시물도 스크롤로 확인 가능

- **게시물 업로드 기능**
  - 플로팅 액션 버튼 (카메라 아이콘)
  - 현재 시간대에 맞는 식사 구분 자동 설정
  - 사진 선택/촬영 모달

### 3.3 월 달력 화면
- **달력 뷰**
  - 현재 월의 달력 표시
  - 각 날짜별 식단 인증 상태 표시
  - 완료된 날짜: 체크 표시 또는 초록색
  - 미완료 날짜: X 이모지 표시 또는 빨간색
  - 오늘 날짜 하이라이트

- **상세 정보**
  - 날짜 클릭 시 해당 날짜의 식단 상세 보기
  - 월간 통계 정보 (완료율, 평균 칼로리 등)

### 3.4 공통 UI 요소
- **네비게이션 바**
  - 홈 (식단 일지)
  - 달력
  - 설정/프로필
- **헤더**
  - 앱 로고
  - 사용자 정보
  - 알림 아이콘

## 4. 기술 스택

### 4.1 프론트엔드
- **React Native**: 모바일 크로스 플랫폼 개발
- **TypeScript**: 타입 안정성 확보
- **Next.js**: 서버사이드 렌더링 및 라우팅
- **Vite**: 빠른 개발 서버 및 빌드 도구

### 4.2 스타일링
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **shadcn/ui**: 재사용 가능한 UI 컴포넌트

### 4.3 상태 관리
- **React Query**: 서버 상태 관리 및 캐싱
- **Jotai**: 아토믹 상태 관리
- **Context API**: 전역 상태 관리

### 4.4 백엔드
- **Supabase**: 
  - 데이터베이스 (PostgreSQL)
  - 인증 시스템
  - 스토리지 (이미지 파일)
  - 실시간 데이터 동기화

### 4.5 AI 서비스
- **칼로리 측정 AI**: 외부 AI API 또는 자체 모델 활용

## 5. 데이터베이스 구조

### 5.1 사용자 테이블 (users)
```sql
- id (UUID, Primary Key)
- email (String, Unique)
- name (String)
- created_at (Timestamp)
- updated_at (Timestamp)
- partner_id (UUID, Foreign Key)
```

### 5.2 식단 게시물 테이블 (meal_posts)
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- meal_type (Enum: breakfast, lunch, dinner)
- image_url (String)
- calories (Integer)
- meal_date (Date)
- created_at (Timestamp)
```

### 5.3 커플 연결 테이블 (couples)
```sql
- id (UUID, Primary Key)
- user1_id (UUID, Foreign Key)
- user2_id (UUID, Foreign Key)
- created_at (Timestamp)
```

## 6. 사용자 플로우

### 6.1 신규 사용자 플로우
1. 앱 접속 → 로그인/회원가입 화면
2. 회원가입 또는 로그인 완료
3. 커플 연결 (초대 코드 입력 또는 파트너 초대)
4. 메인 피드 화면 진입
5. 식단 사진 업로드 및 인증 시작

### 6.2 일일 사용 플로우
1. 앱 접속 → 메인 피드 화면
2. 해당 시간대 식사 사진 촬영/업로드
3. AI 칼로리 측정 결과 확인
4. 게시물 자동 생성 및 피드 업데이트
5. 파트너 식단 확인
6. 달력에서 월간 기록 확인

## 7. 비기능적 요구사항

### 7.1 성능 요구사항
- 이미지 업로드 시간: 5초 이내
- 페이지 로딩 시간: 3초 이내
- AI 칼로리 측정 시간: 10초 이내

### 7.2 보안 요구사항
- 사용자 인증 및 권한 관리
- 이미지 파일 보안 업로드
- 개인정보 보호 정책 준수

### 7.3 사용성 요구사항
- 모바일 최적화 반응형 디자인
- 직관적인 사용자 인터페이스
- 접근성 가이드라인 준수

## 8. 추후 확장 가능성

### 8.1 추가 기능
- 영양소 분석 기능
- 운동 기록 연동
- 체중 변화 추적
- 커뮤니티 기능
- 목표 설정 및 달성 리워드

### 8.2 기술적 확장
- 푸시 알림 시스템
- 오프라인 모드 지원
- 다국어 지원
- 고급 AI 분석 기능

## 9. 성공 지표 (KPI)

### 9.1 사용자 참여도
- 일일 활성 사용자 수 (DAU)
- 월간 활성 사용자 수 (MAU)
- 식단 인증 완료율 (일일 3회 기준)

### 9.2 서비스 품질
- 앱 크래시율 < 1%
- 이미지 업로드 성공률 > 95%
- 사용자 만족도 > 4.0/5.0

## 10. 개발 일정 (MVP 기준)

### Phase 1 (2주): 기본 인프라 구축
- 프로젝트 초기 설정
- 기본 UI 컴포넌트 구축
- Supabase 설정 및 데이터베이스 구조 생성

### Phase 2 (2주): 핵심 기능 개발
- 사용자 인증 시스템 구현
- 이미지 업로드 기능 개발
- AI 칼로리 측정 API 연동

### Phase 3 (2주): 화면 구성 및 피드 개발
- 메인 피드 화면 구현
- 무한 스크롤 기능 개발
- 달력 화면 구현

### Phase 4 (1주): 테스트 및 최적화
- 기능 테스트 및 버그 수정
- 성능 최적화
- MVP 릴리스 준비

**총 개발 기간: 7주**

## 11. 위험 요소 및 대응책

### 11.1 기술적 위험
- **AI 칼로리 측정 정확도 문제**
  - 대응책: 사용자 수정 기능 추가, 다양한 AI 모델 비교 테스트
  - 백업 계획: 수동 입력 옵션 제공

- **이미지 업로드 실패**
  - 대응책: 재업로드 기능, 네트워크 상태 확인
  - 백업 계획: 로컬 캐싱 및 재시도 메커니즘

### 11.2 사용자 경험 위험
- **식단 인증 부담감**
  - 대응책: 간편한 UI/UX, 리마인드 알림 기능
  - 백업 계획: 유연한 시간대 설정 옵션

- **커플 간 동기부여 저하**
  - 대응책: 상호 응원 기능, 달성 리워드 시스템
  - 백업 계획: 개인 모드 지원

## 12. 상세 API 명세서

### 12.1 인증 관련 API
```typescript
// 회원가입
POST /api/auth/register
{
  email: string;
  password: string;
  name: string;
}

// 로그인
POST /api/auth/login
{
  email: string;
  password: string;
}

// 커플 연결
POST /api/couples/connect
{
  partner_email: string;
  invitation_code?: string;
}
```

### 12.2 식단 관련 API
```typescript
// 식단 게시물 업로드
POST /api/meals
{
  image: File;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  meal_date: string;
}

// 식단 게시물 조회
GET /api/meals?date=YYYY-MM-DD&user_id=uuid

// 월간 식단 통계
GET /api/meals/monthly?year=2024&month=01
```

### 12.3 AI 칼로리 측정 API
```typescript
// 칼로리 분석 요청
POST /api/ai/analyze-calories
{
  image_url: string;
  meal_type: string;
}

// 응답 형태
{
  calories: number;
  confidence: number;
  food_items: Array<{
    name: string;
    calories: number;
    weight: number;
  }>;
}
```

## 13. 화면별 상세 컴포넌트 구조

### 13.1 로그인 화면 컴포넌트
```typescript
// LoginScreen.tsx
interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

components:
- LoginForm
- SocialLoginButtons
- SignUpLink
- ForgotPasswordLink
```

### 13.2 메인 피드 화면 컴포넌트
```typescript
// MainFeedScreen.tsx
interface MainFeedScreenProps {
  userId: string;
  partnerId: string;
}

components:
- DateHeader
- MealPostList
- MealPostCard
- CalorieSummary
- UploadButton
- InfiniteScroll
```

### 13.3 달력 화면 컴포넌트
```typescript
// CalendarScreen.tsx
interface CalendarScreenProps {
  userId: string;
  currentMonth: Date;
}

components:
- MonthlyCalendar
- DateCell
- CompletionStatus
- MonthNavigator
- StatsSummary
```

## 14. 상태 관리 구조

### 14.1 Jotai Atoms
```typescript
// atoms/user.ts
export const userAtom = atom<User | null>(null);
export const partnerAtom = atom<User | null>(null);
export const isLoggedInAtom = atom(false);

// atoms/meals.ts
export const mealsAtom = atom<MealPost[]>([]);
export const dailyCaloriesAtom = atom<number>(0);
export const uploadingAtom = atom<boolean>(false);

// atoms/calendar.ts
export const selectedDateAtom = atom<Date>(new Date());
export const monthlyStatsAtom = atom<MonthlyStats | null>(null);
```

### 14.2 React Query 키 구조
```typescript
// queryKeys.ts
export const queryKeys = {
  meals: {
    all: ['meals'] as const,
    daily: (date: string) => ['meals', 'daily', date] as const,
    monthly: (year: number, month: number) => ['meals', 'monthly', year, month] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
    partner: ['user', 'partner'] as const,
  },
  ai: {
    calories: (imageUrl: string) => ['ai', 'calories', imageUrl] as const,
  },
};
```

## 15. 테스트 전략

### 15.1 단위 테스트
- **컴포넌트 테스트**: Jest + React Testing Library
- **유틸리티 함수 테스트**: Jest
- **API 함수 테스트**: Jest + MSW (Mock Service Worker)

### 15.2 통합 테스트
- **사용자 플로우 테스트**: Cypress 또는 Playwright
- **API 통합 테스트**: Postman 또는 Jest + Supertest

### 15.3 E2E 테스트
- **핵심 사용자 시나리오**:
  - 회원가입 → 로그인 → 식단 업로드 → 칼로리 확인
  - 달력 확인 → 과거 식단 조회
  - 커플 연결 → 파트너 식단 확인

## 16. 배포 및 CI/CD 전략

### 16.1 개발 환경
- **로컬 개발**: Vite 개발 서버
- **스테이징**: Vercel 또는 Netlify
- **프로덕션**: Vercel 또는 AWS

### 16.2 CI/CD 파이프라인
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run E2E tests
        run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: npm run deploy
```

## 17. 모니터링 및 분석

### 17.1 성능 모니터링
- **웹 바이탈 측정**: Core Web Vitals
- **에러 트래킹**: Sentry 또는 Bugsnag
- **성능 분석**: Google Analytics, Mixpanel

### 17.2 사용자 행동 분석
- **이벤트 트래킹**:
  - 로그인/회원가입 완료
  - 식단 업로드 성공/실패
  - 칼로리 측정 정확도
  - 앱 체류 시간

### 17.3 비즈니스 메트릭
- **사용자 유지율**: 1일, 7일, 30일
- **식단 인증 완료율**: 일일 3회 기준
- **커플 연결 성공률**
- **AI 칼로리 측정 만족도**

## 18. 보안 및 개인정보 보호

### 18.1 데이터 보안
- **암호화**: 비밀번호 해싱 (bcrypt)
- **토큰 관리**: JWT 토큰 + Refresh Token
- **이미지 보안**: 서명된 URL 사용
- **SQL 인젝션 방지**: Parameterized queries

### 18.2 개인정보 보호
- **GDPR 준수**: 데이터 삭제 권리 보장
- **최소 정보 수집**: 서비스 운영에 필요한 최소한의 정보만 수집
- **데이터 보존 정책**: 탈퇴 시 개인정보 완전 삭제

## 19. 접근성 (Accessibility)

### 19.1 웹 접근성 가이드라인
- **WCAG 2.1 AA 준수**
- **키보드 네비게이션 지원**
- **스크린 리더 호환성**
- **색상 대비 비율 준수**

### 19.2 모바일 접근성
- **터치 타겟 크기**: 최소 44px × 44px
- **폰트 크기**: 최소 16px
- **음성 입력 지원**

## 20. 런칭 후 개선 계획

### 20.1 사용자 피드백 수집
- **인앱 피드백 시스템**
- **사용자 인터뷰 실시**
- **앱스토어 리뷰 분석**

### 20.2 기능 개선 우선순위
1. **AI 칼로리 측정 정확도 개선**
2. **사용자 경험 최적화**
3. **성능 개선**
4. **새로운 기능 추가**

### 20.3 확장 계획
- **영양소 분석 기능**
- **운동 기록 연동**
- **소셜 기능 강화**
- **개인화 추천 시스템**

---

## 부록: 개발 체크리스트

### A. 개발 전 준비사항
- [ ] 기술 스택 환경 구성
- [ ] Supabase 프로젝트 생성
- [ ] AI 칼로리 측정 API 선정
- [ ] 디자인 시스템 구축
- [ ] 프로젝트 구조 설계

### B. 개발 단계별 체크리스트
**Phase 1: 기본 인프라**
- [ ] 프로젝트 초기 설정
- [ ] 기본 라우팅 구성
- [ ] shadcn/ui 컴포넌트 설치
- [ ] Supabase 연동
- [ ] 기본 상태 관리 설정

**Phase 2: 핵심 기능**
- [ ] 사용자 인증 시스템
- [ ] 이미지 업로드 기능
- [ ] AI API 연동
- [ ] 데이터베이스 스키마 구현

**Phase 3: 화면 구성**
- [ ] 로그인/회원가입 화면
- [ ] 메인 피드 화면
- [ ] 달력 화면
- [ ] 무한 스크롤 구현

**Phase 4: 테스트 및 최적화**
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 실행
- [ ] 성능 최적화
- [ ] 보안 점검
- [ ] 접근성 점검

### C. 런칭 전 최종 점검
- [ ] 모든 기능 동작 확인
- [ ] 다양한 디바이스 테스트
- [ ] 네트워크 환경별 테스트
- [ ] 에러 처리 확인
- [ ] 개인정보 보호 정책 준비
- [ ] 앱스토어 등록 준비

---

**문서 버전**: 1.0  
**최종 수정일**: 2025-07-06  
**작성자**: Product Team  
**검토자**: Development Team, Design Team