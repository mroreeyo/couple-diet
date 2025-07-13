'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  refreshSession: () => Promise<{ success: boolean; error?: string }>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 세션 강제 초기화 함수
  const clearSession = async () => {
    try {
      // 로컬 스토리지 및 세션 스토리지 정리
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Supabase 세션 정리 (오류 무시)
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      // 오류 무시 - 이미 세션이 없을 수 있음
      console.log('Session cleanup completed')
    }
    
    setUser(null)
    setLoading(false)
  }

  useEffect(() => {
    // 초기 세션 확인
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('Session error:', error.message)
          // refresh token 오류나 기타 인증 오류 시 세션 초기화
          if (error.message.includes('refresh_token_not_found') || 
              error.message.includes('Invalid Refresh Token') ||
              error.message.includes('JWT expired')) {
            console.log('Invalid session detected, clearing...')
            await clearSession()
            return
          }
        }
        
        setUser(session?.user ?? null)
      } catch (error: any) {
        console.error('Error getting initial session:', error)
        // 예상치 못한 오류 시에도 세션 초기화
        if (error?.message?.includes('refresh_token') || 
            error?.message?.includes('Invalid Refresh Token') ||
            error?.message?.includes('JWT expired')) {
          console.log('Auth error detected, clearing session...')
          await clearSession()
          return
        }
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        // 세션 관련 오류 이벤트 처리
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token successfully refreshed')
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          setUser(null)
          return
        }
        
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Failed to refresh session:', error.message)
        await clearSession()
        return { success: false, error: error.message }
      }
      
      if (data.session) {
        setUser(data.session.user)
        return { success: true }
      }
      
      return { success: false, error: 'No session returned' }
    } catch (error: any) {
      console.error('Unexpected error during session refresh:', error)
      await clearSession()
      return { success: false, error: error.message || 'Unexpected error' }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      console.error('Unexpected error during sign in:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      console.error('Unexpected error during sign up:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      await clearSession()
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      console.error('Unexpected error during password reset:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 