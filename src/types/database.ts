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

export type RelationshipStatus = 'pending' | 'active' | 'inactive' | 'blocked';

export interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  relationship_status: RelationshipStatus;
  requested_by: string;
  requested_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoupleInsert {
  user1_id: string;
  user2_id: string;
  relationship_status?: RelationshipStatus;
  requested_by: string;
}

export interface CoupleUpdate {
  relationship_status?: RelationshipStatus;
  accepted_at?: string | null;
}

export interface ActiveCouple {
  id: string;
  user1_id: string;
  user2_id: string;
  relationship_status: RelationshipStatus;
  requested_at: string;
  accepted_at: string | null;
  user1_email: string;
  user1_display_name: string | null;
  user1_avatar_url: string | null;
  user2_email: string;
  user2_display_name: string | null;
  user2_avatar_url: string | null;
}

export interface CoupleRequestResponse {
  success: boolean;
  couple_id?: string;
  message: string;
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
      couples: {
        Row: Couple;
        Insert: CoupleInsert;
        Update: CoupleUpdate;
      };
    };
    Views: {
      daily_meal_summary: {
        Row: DailyMealSummary;
      };
      active_couples: {
        Row: ActiveCouple;
      };
    };
    Enums: {
      meal_type: MealType;
      relationship_status: RelationshipStatus;
    };
  };
} 