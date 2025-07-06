'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { isValidEmail, LoginAttemptLimiter, translateAuthError } from '@/lib/auth-utils'

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function LoginForm({ onSuccess, redirectTo = '/dashboard' }: LoginFormProps) {
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
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          로그인
        </h2>

        {isLockedOut && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              로그인 시도 횟수를 초과했습니다. {formatTime(lockoutTime)} 후 다시 시도해주세요.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateEmail(email)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                emailError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="your@email.com"
              disabled={loading}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600">{emailError}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-10"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLockedOut}
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              loading || isLockedOut
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => router.push('/forgot-password')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
      </div>
    </div>
  )
} 