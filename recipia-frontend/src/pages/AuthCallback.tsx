import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Handle the OAuth callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect to home or dashboard
        navigate('/')
      } else {
        // Redirect to login if no session
        navigate('/login')
      }
    })
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Completing sign in...</p>
      </div>
    </div>
  )
}