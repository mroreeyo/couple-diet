# Types Directory

This directory contains TypeScript type definitions and interfaces.

## Structure
- `index.ts` - Main type exports
- `auth.ts` - Authentication related types
- `meal.ts` - Meal data types
- `database.ts` - Supabase database types
- `api.ts` - API response types

## Purpose
- Centralize TypeScript type definitions
- Ensure type safety across the application
- Provide clear interfaces for data structures

## Example
```typescript
export interface User {
  id: string
  email: string
  profile: UserProfile
  coupleId?: string
}

export interface Meal {
  id: string
  userId: string
  imageUrl: string
  calories: number
  uploadedAt: Date
}
``` 