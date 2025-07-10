'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoadingSpinner } from './loading-spinner'
import { cn } from '@/lib/utils'

interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  loading?: boolean
  loadingText?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export function FormButton({
  children,
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  className,
  ...props
}: FormButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 shadow-lg hover:shadow-xl"
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-400 border border-gray-200",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    gradient: "bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white focus:ring-pink-400 hover:shadow-pink-200/50"
  }
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base"
  }

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        loading && "relative overflow-hidden",
        className
      )}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center">
          <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center space-x-2">
            <LoadingSpinner size="sm" className="text-white" />
            <span className="text-white font-medium text-sm">
              {loadingText || '처리 중...'}
            </span>
          </div>
        </div>
      )}
      
      <span className={cn(
        "transition-opacity duration-200",
        loading && "opacity-0"
      )}>
        {children}
      </span>
    </button>
  )
} 