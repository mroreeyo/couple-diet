'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { isValidEmail, validatePassword, translateAuthError } from '@/lib/auth-utils'

interface SignupFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export function SignupForm({ onSuccess, redirectTo = '/dashboard' }: SignupFormProps) {
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
        
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/login')
          }
        }, 3000)
      }
    } catch (err) {
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

  if (successMessage) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              회원가입 완료!
            </h2>
            <p className="text-gray-600 mb-6">
              {successMessage}
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          회원가입
        </h2>

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
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (e.target.value) {
                    validatePasswordStrength(e.target.value)
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-10 ${
                  passwordErrors.length > 0 && password.length > 0 ? 'border-red-300' : 'border-gray-300'
                }`}
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
            
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">비밀번호 강도:</span>
                  <span className={`text-sm font-medium ${getPasswordStrengthColor()}`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                {passwordErrors.length > 0 && (
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 확인
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => validatePasswordConfirmation(password, confirmPassword)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 pr-10 ${
                  confirmPasswordError ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPasswordError && (
              <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || emailError !== '' || passwordErrors.length > 0 || confirmPasswordError !== ''}
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              loading || emailError !== '' || passwordErrors.length > 0 || confirmPasswordError !== ''
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? '회원가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => router.push('/login')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            이미 계정이 있으신가요? 로그인
          </button>
        </div>
      </div>
    </div>
  )
} 