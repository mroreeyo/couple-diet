import { RateLimiterMemory } from 'rate-limiter-flexible'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import validator from 'validator'
import bcrypt from 'bcryptjs'
import winston from 'winston'

// Rate Limiter 설정
export const rateLimiters = {
  // 일반 API 요청 제한 (분당 100회)
  general: new RateLimiterMemory({
    keyPrefix: 'general',
    points: 100, // 요청 횟수
    duration: 60, // 1분
  }),
  
  // 로그인 시도 제한 (시간당 5회)
  login: new RateLimiterMemory({
    keyPrefix: 'login',
    points: 5, // 로그인 시도 횟수
    duration: 3600, // 1시간
    blockDuration: 900, // 15분 차단
  }),
  
  // 회원가입 제한 (시간당 3회)
  signup: new RateLimiterMemory({
    keyPrefix: 'signup',
    points: 3, // 회원가입 시도 횟수
    duration: 3600, // 1시간
    blockDuration: 1800, // 30분 차단
  }),
  
  // 패스워드 재설정 제한 (시간당 3회)
  passwordReset: new RateLimiterMemory({
    keyPrefix: 'password_reset',
    points: 3, // 패스워드 재설정 시도 횟수
    duration: 3600, // 1시간
    blockDuration: 3600, // 1시간 차단
  })
}

// DOMPurify 설정 (서버 사이드)
const window = new JSDOM('').window
const DOMPurifyServer = DOMPurify(window as unknown as Window & typeof globalThis)

// 보안 로거 설정
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'couple-diet-security' },
  transports: [
    new winston.transports.File({ filename: 'logs/security-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
})

// 보안 상수
export const SECURITY_CONSTANTS = {
  // 비밀번호 해싱 라운드
  BCRYPT_ROUNDS: 12,
  
  // JWT 토큰 만료 시간
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  
  // 세션 만료 시간
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24시간
  
  // 쿠키 보안 설정
  COOKIE_SECURITY: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24시간
  },
  
  // CORS 허용 오리진
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'https://your-production-domain.com', // 실제 프로덕션 도메인으로 변경
  ],
  
  // 보안 헤더 설정
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  }
}

/**
 * Rate Limiting 체크
 */
export async function checkRateLimit(
  limiter: RateLimiterMemory, 
  key: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await limiter.consume(key)
    return { allowed: true }
  } catch (rejRes: unknown) {
    const rateLimitRejection = rejRes as { msBeforeNext?: number; remainingPoints?: number }
    const retryAfter = Math.round(rateLimitRejection.msBeforeNext || 0) || 1000
    securityLogger.warn('Rate limit exceeded', { 
      key, 
      retryAfter,
      remainingPoints: rateLimitRejection.remainingPoints,
      msBeforeNext: rateLimitRejection.msBeforeNext
    })
    return { allowed: false, retryAfter }
  }
}

/**
 * 입력 데이터 Sanitization
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  // HTML 태그 제거 및 XSS 방지
  const sanitized = DOMPurifyServer.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
  
  // 추가적인 특수문자 처리
  return validator.escape(sanitized.trim())
}

/**
 * 이메일 고급 검증
 */
export function validateEmailAdvanced(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: '이메일이 제공되지 않았습니다.' }
  }
  
  const sanitizedEmail = sanitizeInput(email)
  
  if (!validator.isEmail(sanitizedEmail)) {
    return { isValid: false, error: '유효하지 않은 이메일 형식입니다.' }
  }
  
  if (sanitizedEmail.length > 254) {
    return { isValid: false, error: '이메일이 너무 깁니다.' }
  }
  
  // 금지된 이메일 도메인 체크 (예시)
  const bannedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com']
  const domain = sanitizedEmail.split('@')[1]?.toLowerCase()
  
  if (bannedDomains.includes(domain)) {
    return { isValid: false, error: '허용되지 않는 이메일 도메인입니다.' }
  }
  
  return { isValid: true }
}

/**
 * 비밀번호 고급 검증
 */
export function validatePasswordAdvanced(password: string): { 
  isValid: boolean; 
  strength: 'weak' | 'medium' | 'strong'; 
  errors: string[] 
} {
  const errors: string[] = []
  
  if (!password || typeof password !== 'string') {
    return { isValid: false, strength: 'weak', errors: ['비밀번호가 제공되지 않았습니다.'] }
  }
  
  // 기본 길이 체크
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.')
  }
  
  if (password.length > 128) {
    errors.push('비밀번호는 128자를 초과할 수 없습니다.')
  }
  
  // 문자 종류 체크
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  if (!hasLowercase) errors.push('비밀번호는 소문자를 포함해야 합니다.')
  if (!hasUppercase) errors.push('비밀번호는 대문자를 포함해야 합니다.')
  if (!hasNumbers) errors.push('비밀번호는 숫자를 포함해야 합니다.')
  if (!hasSpecialChars) errors.push('비밀번호는 특수문자를 포함해야 합니다.')
  
  // 일반적인 패스워드 패턴 체크
  const commonPatterns = [
    /^(.)\1+$/, // 같은 문자 반복
    /123456|password|qwerty|admin|letmein/i, // 일반적인 약한 패스워드
    /^[0-9]+$/, // 숫자만
    /^[a-zA-Z]+$/, // 문자만
  ]
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('너무 일반적인 패스워드 패턴입니다.')
      break
    }
  }
  
  // 강도 계산
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  const criteriaCount = [hasLowercase, hasUppercase, hasNumbers, hasSpecialChars].filter(Boolean).length
  
  if (password.length >= 12 && criteriaCount >= 4) {
    strength = 'strong'
  } else if (password.length >= 8 && criteriaCount >= 3) {
    strength = 'medium'
  }
  
  return {
    isValid: errors.length === 0,
    strength,
    errors
  }
}

/**
 * 비밀번호 해싱
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SECURITY_CONSTANTS.BCRYPT_ROUNDS)
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * IP 주소 추출 및 검증
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('remote-addr')
  
  let ip = forwarded?.split(',')[0] || realIP || remoteAddr || 'unknown'
  
  // IPv6 로컬호스트를 IPv4로 변환
  if (ip === '::1') ip = '127.0.0.1'
  
  return ip
}

/**
 * 사용자 에이전트 정보 추출
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * 보안 이벤트 로깅
 */
export function logSecurityEvent(event: string, data?: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString()
  const logData = {
    event,
    data: data || {},
    timestamp,
    level
  }
  
  switch (level) {
    case 'error':
      securityLogger.error(logData)
      break
    case 'warn':
      securityLogger.warn(logData)
      break
    default:
      securityLogger.info(logData)
  }
}

/**
 * 보안 감사 로깅
 */
export function logSecurityAudit(action: string, userId?: string, data?: Record<string, unknown>): void {
  const auditData = {
    action,
    userId,
    timestamp: new Date().toISOString(),
    data: data || {}
  }
  
  securityLogger.info('AUDIT', auditData)
}

/**
 * 기본 환경 변수 검증 (인증 관련)
 */
export function validateEnvironmentVariables(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  }
  
  // URL 형식 검증
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !validator.isURL(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * AI 기능용 환경 변수 검증 (Google API Key 포함)
 */
export function validateAIEnvironmentVariables(): { isValid: boolean; errors: string[] } {
  const baseValidation = validateEnvironmentVariables()
  if (!baseValidation.isValid) {
    return baseValidation
  }
  
  const errors: string[] = []
  
  // Google API Key 검증
  if (!process.env.GOOGLE_API_KEY) {
    errors.push('Missing required environment variable: GOOGLE_API_KEY')
  } else if (process.env.GOOGLE_API_KEY.length < 30) {
    errors.push('GOOGLE_API_KEY appears to be invalid (too short)')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * CORS 오리진 검증
 */
export function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false
  return SECURITY_CONSTANTS.ALLOWED_ORIGINS.includes(origin)
}

/**
 * 보안 헤더 설정
 */
export function getSecurityHeaders(): HeadersInit {
  return SECURITY_CONSTANTS.SECURITY_HEADERS
} 