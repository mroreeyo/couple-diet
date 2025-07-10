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
    const hasValue = value.length > 0

    return (
      <div className={cn("space-y-2", className)}>
        <label 
          htmlFor={id}
          className={cn(
            "block text-sm font-semibold transition-colors duration-200",
            error ? "text-red-600" : "text-gray-700"
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="relative group">
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
              "w-full px-4 py-3 border-2 rounded-xl shadow-sm transition-all duration-200",
              "focus:outline-none focus:shadow-lg placeholder:text-gray-400",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200",
              // Default state
              !error && !isFocused && "border-gray-200 bg-gray-50/50",
              // Focused state
              !error && isFocused && "border-pink-400 bg-white shadow-pink-100",
              // Error state
              error && "border-red-400 bg-red-50/50",
              // Password field padding
              isPassword && "pr-12",
              // Value state
              hasValue && !error && !isFocused && "bg-white border-gray-300"
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          
          {/* Focus ring effect */}
          <div className={cn(
            "absolute inset-0 rounded-xl transition-all duration-200 pointer-events-none",
            !error && isFocused && "ring-2 ring-pink-200 ring-opacity-50"
          )} />
          
          {isPassword && (
            <button
              type="button"
              onClick={onTogglePassword}
              className={cn(
                "absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-200",
                "hover:bg-gray-100 rounded-r-xl"
              )}
              disabled={disabled}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
              )}
            </button>
          )}
        </div>
        
        {error && (
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
            <p id={`${id}-error`} className="text-sm text-red-600 font-medium">
              {error}
            </p>
          </div>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput' 