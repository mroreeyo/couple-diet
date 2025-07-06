# Hooks Directory

This directory contains custom React hooks for the Couple Diet application.

## Structure
- `useAuth.ts` - Authentication hooks
- `useMeal.ts` - Meal upload and management hooks
- `useSupabase.ts` - Supabase related hooks
- `useLocalStorage.ts` - Local storage management

## Purpose
- Encapsulate complex state logic in reusable hooks
- Provide clean interfaces for common operations
- Separate business logic from UI components

## Example
```typescript
export function useAuth() {
  const [user, setUser] = useAtom(userAtom)
  
  const login = async (email: string, password: string) => {
    // Login logic
  }
  
  const logout = async () => {
    // Logout logic
  }
  
  return { user, login, logout }
} 