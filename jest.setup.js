// @ts-check
/// <reference types="@testing-library/jest-dom" />
require('@testing-library/jest-dom');

// 테스트 환경 변수 설정
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'; 