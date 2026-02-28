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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        setProfile(null)
        return
      }
      setProfile(data)
    } catch (error) {
      setProfile(null)
    }
  }

  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      try {
        const res = await supabase.auth.getSession()
        const session = res?.data?.session ?? null
        
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
  
        if (session?.user) {
          fetchProfile(session.user.id)
        }
      } catch (err) {
        if (!mounted) return
        setSession(null)
        setUser(null)
        setProfile(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
  
    initAuth()
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
  
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )
  
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp: AuthContextType['signUp'] = async (email, password, fullName) => {
    return api.auth.signUp(email, password, fullName)
  }

  const signIn = async (email: string, password: string) => {
    await api.auth.signIn(email, password)
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