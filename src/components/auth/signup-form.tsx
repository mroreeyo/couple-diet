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
      <div className={cn("w-full max-w-md mx-auto", className)}>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <span className="text-3xl">✅</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                회원가입 완료!
              </h2>
              <p className="text-gray-600">
                {successMessage}
              </p>
            </div>
            <div className="pt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">
                로그인 페이지로 이동 중...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            회원가입
          </h2>
          <p className="text-gray-600">
            새 계정을 만들어 시작하세요
          </p>
        </div>
        
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
          />

          {/* 비밀번호 강도 표시 */}
          {password.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">비밀번호 강도:</span>
                <span className={`text-sm font-medium ${getPasswordStrengthColor()}`}>
                  {getPasswordStrengthText()}
                </span>
              </div>
          
              {passwordErrors.length > 0 && (
                <div className="space-y-1">
                  {passwordErrors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600 flex items-center gap-1">
                      <span>•</span>
                      {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

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
            loadingText="회원가입 중..."
            fullWidth
          >
            계정 만들기
          </FormButton>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  )
} 