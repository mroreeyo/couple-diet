'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/auth-helpers-nextjs'

interface ExtendedUser extends User {
  partnerId?: string
  partner?: {
    id: string
    email: string
    display_name?: string
    avatar_url?: string
  }
  displayName?: string
  profile?: any
}

export function useUser() {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClientComponentClient()

  const fetchUserProfile = useCallback(async (authUser: User): Promise<ExtendedUser> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return authUser as ExtendedUser

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          return {
            ...authUser,
            partnerId: result.data.partnerId,
            partner: result.data.partner,
            displayName: result.data.displayName,
            profile: result.data.profile
          } as ExtendedUser
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
    return authUser as ExtendedUser
  }, [supabase.auth])

  const refreshUser = useCallback(async () => {
    if (!user) return
    
    setRefreshing(true)
    try {
      const updatedUser = await fetchUserProfile(user)
      setUser(updatedUser)
      console.log('🔄 사용자 정보 새로고침 완료:', {
        partnerId: updatedUser.partnerId,
        hasPartner: !!updatedUser.partner
      })
    } catch (error) {
      console.error('Error refreshing user:', error)
    } finally {
      setRefreshing(false)
    }
  }, [user, fetchUserProfile])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const extendedUser = await fetchUserProfile(authUser)
          setUser(extendedUser)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const extendedUser = await fetchUserProfile(session.user)
        setUser(extendedUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, fetchUserProfile])

  return { user, loading, refreshing, refreshUser }
} 