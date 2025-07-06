// Database types for couple diet app

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

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
    };
  };
} 