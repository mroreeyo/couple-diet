'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormInputProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  autoComplete?: string
  className?: string
  isPassword?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({
    id,
    label,
    type = 'text',
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    disabled = false,
    required = false,
    autoComplete,
    className,
    isPassword = false,
    showPassword = false,
    onTogglePassword
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className={cn("space-y-2", className)}>
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={inputType}
            value={value}
            onChange={onChange}
            onBlur={() => {
              setIsFocused(false)
              onBlur?.()
            }}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            className={cn(
              "w-full px-3 py-2 border rounded-md shadow-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              error ? "border-red-500" : "border-gray-300",
              isFocused && !error && "border-blue-500",
              isPassword && "pr-10"
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          
          {isPassword && (
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={disabled}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
        </div>
        
        {error && (
          <p id={`${id}-error`} className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput' 