// Database types for couple diet app

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  partner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  partner_id?: string | null;
}

export interface UserUpdate {
  display_name?: string | null;
  avatar_url?: string | null;
  partner_id?: string | null;
}

export interface Meal {
  id: string;
  user_id: string;
  meal_name: string;
  calories: number | null;
  meal_type: MealType;
  photo_url: string | null;
  description: string | null;
  meal_date: string;
  created_at: string;
  updated_at: string;
}

export interface MealInsert {
  user_id: string;
  meal_name: string;
  calories?: number | null;
  meal_type: MealType;
  photo_url?: string | null;
  description?: string | null;
  meal_date?: string;
}

export interface MealUpdate {
  meal_name?: string;
  calories?: number | null;
  meal_type?: MealType;
  photo_url?: string | null;
  description?: string | null;
  meal_date?: string;
}

export interface DailyMealSummary {
  user_id: string;
  meal_date: string;
  total_meals: number;
  total_calories: number | null;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
  snack_count: number;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      meals: {
        Row: Meal;
        Insert: MealInsert;
        Update: MealUpdate;
      };
    };
    Views: {
      daily_meal_summary: {
        Row: DailyMealSummary;
      };
    };
  };
} 