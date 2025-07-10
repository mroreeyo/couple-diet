'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { isValidEmail, validatePassword, translateAuthError } from '@/lib/auth-utils'
import { FormInput } from './form-input'
import { FormButton } from './form-button'
import { Alert } from './alert'
import { cn } from '@/lib/utils'

interface SignupFormProps {
  onSuccess?: () => void
  redirectTo?: string
  className?: string
}

export function SignupForm({ 
  onSuccess, 
  redirectTo = '/dashboard',
  className 
}: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { signUp } = useAuth()
  const router = useRouter()

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

  const validatePasswordStrength = (password: string) => {
    const validation = validatePassword(password)
    if (!validation.isValid) {
      setPasswordErrors(validation.errors)
      return false
    }
    setPasswordErrors([])
    return true
  }

  const validatePasswordConfirmation = (password: string, confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError('비밀번호 확인을 입력해주세요.')
      return false
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('비밀번호가 일치하지 않습니다.')
      return false
    }
    setConfirmPasswordError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePasswordStrength(password)
    const isConfirmPasswordValid = validatePasswordConfirmation(password, confirmPassword)

    if (!isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return
    }

    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const { error } = await signUp(email, password)
      
      if (error) {
        setError(translateAuthError(error))
      } else {
        setSuccessMessage('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.')
        
        // 3초 후 지정된 페이지로 이동
        setTimeout(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push(redirectTo)
          }
        }, 3000)
      }
    } catch (error) {
      console.error('Error during signup:', error)
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordErrors.length === 0 && password.length > 0) return 'text-green-600'
    if (passwordErrors.length <= 2) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPasswordStrengthText = () => {
    if (passwordErrors.length === 0 && password.length > 0) return '강함'
    if (passwordErrors.length <= 2) return '보통'
    return '약함'
  }

  // 성공 상태 UI
  if (successMessage) {
    return (
      <div className={cn("w-full", className)}>
        <div className="text-center space-y-6">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <span className="text-4xl">✅</span>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-900">
              환영합니다! 🎉
            </h2>
            <div className="space-y-2">
              <p className="text-gray-600 font-medium">
                {successMessage}
              </p>
              <p className="text-sm text-gray-500">
                이메일 인증을 완료하면 모든 기능을 사용할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="pt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-200 border-t-pink-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">
              로그인 페이지로 이동 중...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-6">
        {/* Welcome text */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            함께 시작해요! 💕
          </h2>
          <p className="text-gray-600">
            새 계정을 만들어 파트너와 건강한 식습관을 만들어보세요
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <FormInput
              id="email"
              type="email"
              label="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateEmail(email)}
              error={emailError}
              placeholder="couple@example.com"
              disabled={loading}
              autoComplete="email"
              required
              className="transition-all duration-200 focus:scale-[1.02]"
            />

            <div className="space-y-3">
              <FormInput
                id="password"
                label="비밀번호"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (e.target.value) {
                    validatePasswordStrength(e.target.value)
                  }
                }}
                placeholder="••••••••"
                disabled={loading}
                isPassword
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                error={passwordErrors.length > 0 ? passwordErrors[0] : ''}
                autoComplete="new-password"
                required
                className="transition-all duration-200 focus:scale-[1.02]"
              />

              {/* Password strength indicator */}
              {password && (
                <div className="px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">비밀번호 강도:</span>
                    <span className={cn("text-sm font-semibold", getPasswordStrengthColor())}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        passwordErrors.length === 0 && password.length > 0 
                          ? "bg-gradient-to-r from-green-400 to-green-600 w-full"
                          : passwordErrors.length <= 2 
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-600 w-2/3"
                          : "bg-gradient-to-r from-red-400 to-red-600 w-1/3"
                      )}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <FormInput
              id="confirmPassword"
              label="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (e.target.value) {
                  validatePasswordConfirmation(password, e.target.value)
                }
              }}
              placeholder="••••••••"
              disabled={loading}
              isPassword
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              error={confirmPasswordError}
              autoComplete="new-password"
              required
              className="transition-all duration-200 focus:scale-[1.02]"
            />
          </div>

          {error && (
            <Alert 
              type="error"
              message={error}
              onClose={() => setError('')}
            />
          )}

          <div className="pt-2">
            <FormButton
              type="submit" 
              loading={loading}
              loadingText="계정 생성 중..."
              disabled={loading || passwordErrors.length > 0 || !password || !confirmPassword}
              fullWidth
              variant="gradient"
            >
              계정 만들기
            </FormButton>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              계정을 생성하면{' '}
              <button 
                type="button"
                className="text-pink-600 hover:text-pink-700 transition-colors duration-200"
                onClick={() => alert('서비스 약관을 확인하세요.')}
              >
                서비스 약관
              </button>
              {' '}및{' '}
              <button 
                type="button"
                className="text-pink-600 hover:text-pink-700 transition-colors duration-200"
                onClick={() => alert('개인정보 처리방침을 확인하세요.')}
              >
                개인정보 처리방침
              </button>
              에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 