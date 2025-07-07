'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { isValidEmail, LoginAttemptLimiter, translateAuthError } from '@/lib/auth-utils'
import { FormInput } from './form-input'
import { FormButton } from './form-button'
import { Alert } from './alert'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
  className?: string
}

export function LoginForm({ 
  onSuccess, 
  redirectTo = '/dashboard',
  className 
}: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isLockedOut, setIsLockedOut] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(0)

  const { signIn } = useAuth()
  const router = useRouter()

  // 로그아웃 시간 체크
  useEffect(() => {
    if (email) {
      const locked = LoginAttemptLimiter.isLockedOut(email)
      setIsLockedOut(locked)
      
      if (locked) {
        const remaining = LoginAttemptLimiter.getRemainingLockoutTime(email)
        setLockoutTime(remaining)
      }
    }
  }, [email])

  // 로그아웃 카운트다운
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isLockedOut && lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime(prev => {
          const newTime = prev - 1000
          if (newTime <= 0) {
            setIsLockedOut(false)
            return 0
          }
          return newTime
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isLockedOut, lockoutTime])

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('이메일을 입력해주세요.')
      return false
    }
    if (!isValidEmail(email)) {
      setEmailError('올바른 이메일 주소를 입력해주세요.')
      return false
    }
    setEmailError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail(email)) {
      return
    }

    if (!password) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    if (isLockedOut) {
      setError('너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        LoginAttemptLimiter.incrementAttempts(email)
        setError(translateAuthError(error))
        
        // 로그아웃 상태 업데이트
        const locked = LoginAttemptLimiter.isLockedOut(email)
        setIsLockedOut(locked)
        if (locked) {
          setLockoutTime(LoginAttemptLimiter.getRemainingLockoutTime(email))
        }
      } else {
        // 성공시 시도 횟수 리셋
        LoginAttemptLimiter.resetAttempts(email)
        
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(redirectTo)
        }
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}분 ${seconds}초`
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            로그인
          </h2>
          <p className="text-gray-600">
            계정에 로그인하여 시작하세요
          </p>
        </div>

        {isLockedOut && (
          <Alert 
            type="warning"
            title="로그인 제한"
            message={`로그인 시도 횟수를 초과했습니다. ${formatTime(lockoutTime)} 후 다시 시도해주세요.`}
          />
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            id="email"
            type="email"
            label="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => validateEmail(email)}
            error={emailError}
            placeholder="your@email.com"
            disabled={loading}
            autoComplete="email"
            required
          />

          <FormInput
            id="password"
            label="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            isPassword
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            autoComplete="current-password"
            required
          />

          {error && (
            <Alert 
              type="error"
              message={error}
              onClose={() => setError('')}
            />
          )}

          <FormButton
            type="submit" 
            loading={loading}
            loadingText="로그인 중..."
            disabled={isLockedOut}
            fullWidth
          >
            로그인
          </FormButton>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              회원가입
            </button>
          </p>
        </div>
      </div>
    </div>
  )
} 