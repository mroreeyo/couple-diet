export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        data-testid="loading-spinner"
        className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"
      />
      <span className="ml-2">식사 기록을 불러오는 중...</span>
    </div>
  )
} 