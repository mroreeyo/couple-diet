import { SignupForm, AuthGuard } from '@/components/auth'

export default function SignupPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <SignupForm />
        </div>
      </div>
    </AuthGuard>
  )
} 