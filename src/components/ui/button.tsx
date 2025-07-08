import { ButtonHTMLAttributes } from 'react'
import { LoadingSpinner } from './loading'

interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

export function FormButton({ children, loading, disabled, className = '', ...props }: FormButtonProps) {
  return (
    <button
      disabled={loading || disabled}
      className={`px-4 py-2 rounded-lg text-white font-medium transition-colors
        ${loading || disabled ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-opacity-90'}
        ${className}`}
      {...props}
    >
      <div className="flex items-center justify-center">
        {loading && <LoadingSpinner />}
        <span className={loading ? 'ml-2' : ''}>{children}</span>
      </div>
    </button>
  )
} 