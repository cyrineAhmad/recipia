import { createContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'

export interface AuthContextType {
  user: User | null
  session: Session | null
  profile: any | null
  loading: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<{ user?: unknown; session?: unknown } | null>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[AUTH DEBUG] fetchProfile called for:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('[AUTH DEBUG] fetchProfile result:', { data, error })
      if (error) {
        console.warn('[AUTH DEBUG] Profile error (non-critical):', error)
        setProfile(null)
        return
      }
      setProfile(data)
    } catch (error) {
      console.error('[AUTH DEBUG] Profile fetch error:', error)
      setProfile(null)
    }
  }

  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      console.log('[AUTH DEBUG] initAuth called')
  
      try {
        const res = await supabase.auth.getSession()
        console.log('[AUTH DEBUG] getSession raw result:', res)
  
        // safe destructuring
        const session = res?.data?.session ?? null
        
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        console.log('[AUTH DEBUG] session set:', session)
  
        if (session?.user) {
          console.log('[AUTH DEBUG] fetching profile for user:', session.user.id)
          fetchProfile(session.user.id)
        }
      } catch (err) {
        console.error('[AUTH DEBUG] getSession error:', err)
        if (!mounted) return
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        if (mounted) {
          setLoading(false)
          console.log('[AUTH DEBUG] loading finished')
        }
      }
    }
  
    initAuth()
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[AUTH DEBUG] onAuthStateChange:', _event, session)
        
        if (!mounted) {
          console.log('[AUTH DEBUG] ignoring auth change, component unmounted')
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        console.log('[AUTH DEBUG] loading finished after state change')
  
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )
  
    return () => {
      console.log('[AUTH DEBUG] unsubscribing auth state')
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp: AuthContextType['signUp'] = async (email, password, fullName) => {
    return api.auth.signUp(email, password, fullName)
  }

  const signIn = async (email: string, password: string) => {
    console.log('[AUTH DEBUG] signIn called with email:', email)
    try {
      const result = await api.auth.signIn(email, password)
      console.log('[AUTH DEBUG] signIn API result:', result)
    } catch (err) {
      console.error('[AUTH DEBUG] signIn error:', err)
      throw err
    }
  }

  const signInWithGoogle = async () => {
    await api.auth.signInWithGoogle()
  }

  const signOut = async () => {
    await api.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}