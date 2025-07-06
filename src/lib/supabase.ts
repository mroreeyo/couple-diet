import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Create Supabase client (for client-side usage)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Admin client (only for server-side usage)
// This should only be used in API routes or server components
export const createSupabaseAdmin = () => {
  // Only create admin client if we're on the server side
  if (typeof window === 'undefined') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    }
    
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  throw new Error('Admin client can only be used on the server side')
}

// Export types for TypeScript
export type { User as SupabaseUser } from '@supabase/supabase-js'
export type { User, UserInsert, UserUpdate } from '../types/database' 