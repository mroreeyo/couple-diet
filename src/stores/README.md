# Stores Directory

This directory contains Jotai atoms for state management.

## Structure
- `authStore.ts` - Authentication state (user, couple connection)
- `mealStore.ts` - Meal upload and verification state
- `uiStore.ts` - UI state (modals, loading states)

## Purpose
- Manage global application state using Jotai
- Provide reactive state management for user and meal data
- Maintain UI state across components

## Usage
```typescript
import { useAtom } from 'jotai'
import { userAtom } from './authStore'

function MyComponent() {
  const [user, setUser] = useAtom(userAtom)
  // Component logic
}
``` 