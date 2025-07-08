import Image from 'next/image';
import Link from 'next/link';
import { MealAnalysisRecord } from '@/types/food-analysis';

interface MealCardProps {
  meal: MealAnalysisRecord;
}

export function MealCard({ meal }: MealCardProps) {
  const date = new Date(meal.created_at || new Date().toISOString())
  const formattedDate = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  return (
    <Link href={`/meals/${meal.id}`}>
      <div
        data-testid={`meal-card-${meal.id}`}
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
      >
        {meal.image_url && (
          <div className="relative h-48 w-full">
            <Image
              src={meal.image_url}
              alt={meal.analysis_result.foods?.map(f => f.name).join(', ') || '식사 이미지'}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">{formattedDate}</span>
            <span className="text-sm font-medium text-blue-600 capitalize">{meal.meal_type}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">총 칼로리</span>
            <span className="text-blue-600 font-semibold">
              {Math.round(meal.total_calories)} kcal
            </span>
          </div>
          {meal.analysis_result.foods && meal.analysis_result.foods.length > 0 && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {meal.analysis_result.foods.map(f => f.name).join(', ')}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
} 