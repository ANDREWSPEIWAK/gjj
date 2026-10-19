import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Custom hook to manage Supabase connection and user state
export function useSupabase() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Helper to get current user profile
  const getCurrentUser = () => {
    return user
  }
  
  // Helper to get current role from user metadata
  const getCurrentRole = () => {
    return user?.role ?? null
  }
  
  // Helper to check if user has specific role
  const hasRole = (role: string) => {
    return user?.role === role
  }
  
  // Enhanced data fetcher with error handling
  const fetchWithErrorHandler = async <T>(query: Promise<{ data: T; error: any }>, options?: any) => {
    try {
      const result = await query
      if (result.error) {
        console.error('Supabase query failed:', result.error)
        throw new Error(`Failed to fetch: ${result.error.message}`)
      }
      return result.data
    } catch (error) {
      console.error('Supabase query failed:', error)
      throw error
    }
  }

  return {
    supabase,
    user,
    session,
    loading,
    getCurrentUser,
    getCurrentRole,
    hasRole,
    fetchWithErrorHandler
  }
}
