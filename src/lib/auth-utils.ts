import { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 비밀번호 강도 체크
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 사용자 인증 상태 확인
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * 사용자 세션 확인
 */
export async function getCurrentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Error getting current session:', error)
    return null
  }
}

/**
 * 사용자 프로필 정보 가져오기
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * 사용자 프로필 업데이트
 */
export async function updateUserProfile(userId: string, updates: {
  display_name?: string
  avatar_url?: string
}) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error updating user profile:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * 이메일 확인 상태 체크
 */
export function isEmailConfirmed(user: User | null): boolean {
  return user?.email_confirmed_at !== null
}

/**
 * 사용자 권한 확인 (향후 확장용)
 */
export function hasPermission(user: User | null, permission: string): boolean {
  // 현재는 기본 구현, 향후 권한 시스템 확장 시 수정
  if (!user) return false
  
  // TODO: 실제 권한 체크 로직 구현 예정
  // 현재는 permission 파라미터를 무시하고 기본적으로 로그인한 사용자는 모든 권한을 가짐
  console.debug('Permission check:', permission)
  
  return true
}

/**
 * 로그인 시도 제한 (간단한 클라이언트 측 제한)
 */
export class LoginAttemptLimiter {
  private static readonly MAX_ATTEMPTS = 5
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15분

  static getAttempts(email: string): number {
    const key = `login_attempts_${email}`
    const attempts = localStorage.getItem(key)
    return attempts ? parseInt(attempts) : 0
  }

  static incrementAttempts(email: string): void {
    const key = `login_attempts_${email}`
    const attempts = this.getAttempts(email) + 1
    localStorage.setItem(key, attempts.toString())
    localStorage.setItem(`login_lockout_${email}`, Date.now().toString())
  }

  static resetAttempts(email: string): void {
    localStorage.removeItem(`login_attempts_${email}`)
    localStorage.removeItem(`login_lockout_${email}`)
  }

  static isLockedOut(email: string): boolean {
    const attempts = this.getAttempts(email)
    if (attempts < this.MAX_ATTEMPTS) return false

    const lockoutTime = localStorage.getItem(`login_lockout_${email}`)
    if (!lockoutTime) return false

    const lockoutStart = parseInt(lockoutTime)
    const now = Date.now()
    
    if (now - lockoutStart > this.LOCKOUT_DURATION) {
      this.resetAttempts(email)
      return false
    }

    return true
  }

  static getRemainingLockoutTime(email: string): number {
    const lockoutTime = localStorage.getItem(`login_lockout_${email}`)
    if (!lockoutTime) return 0

    const lockoutStart = parseInt(lockoutTime)
    const now = Date.now()
    const remaining = this.LOCKOUT_DURATION - (now - lockoutStart)
    
    return Math.max(0, remaining)
  }
}

/**
 * 에러 메시지 한국어 변환
 */
export function translateAuthError(error: string): string {
  const translations: { [key: string]: string } = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'User not found': '사용자를 찾을 수 없습니다.',
    'Invalid email': '올바른 이메일 주소를 입력해주세요.',
    'Password is too weak': '비밀번호가 너무 약합니다.',
    'User already registered': '이미 등록된 사용자입니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
    'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    'Network error': '네트워크 오류가 발생했습니다.',
    'An unexpected error occurred': '예기치 않은 오류가 발생했습니다.',
  }

  return translations[error] || error
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const bearerPrefix = 'Bearer '
  if (!authHeader.startsWith(bearerPrefix)) return null
  
  return authHeader.slice(bearerPrefix.length).trim()
}

/**
 * JWT 토큰에서 사용자 정보 추출
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    // Supabase JWT 토큰 검증
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('Token validation failed:', error?.message)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error validating token:', error)
    return null
  }
} 