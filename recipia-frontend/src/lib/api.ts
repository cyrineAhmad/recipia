import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Helper to get auth token
async function getAuthHeaders() {
    const { data } = await supabase.auth.getSession()
    const session = data?.session
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }

// Generic API call helper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

export const api = {
  // Auth endpoints - Use Supabase directly for better compatibility
  auth: {
    signUp: async (email: string, password: string, fullName?: string): Promise<{ user: unknown; session: unknown } | null> => {
      console.log('[AUTH] Starting signup...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      console.log('[AUTH] Signup response:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message
      })
      
      if (error) throw error
      return data as { user: unknown; session: unknown } | null
    },
    
    signIn: async (email: string, password: string) => {
      console.log('[AUTH] Starting login...')
      // Use backend login (works reliably) then set session in Supabase client
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      console.log('[AUTH] Login response status:', res.status)
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }))
        console.error('[AUTH] Login failed:', err)
        throw new Error(err.detail || 'Login failed')
      }
      
      const responseData = await res.json()
      console.log('[AUTH] Login response data:', { 
        hasSession: !!responseData.session,
        hasAccessToken: !!responseData.session?.access_token,
        hasRefreshToken: !!responseData.session?.refresh_token,
        user: responseData.user
      })
      
      const { session } = responseData
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('Invalid login response')
      }
      
      console.log('[AUTH] Setting session in Supabase client...')
      // Set session directly - the auth state change listener will trigger
      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      
      if (error) {
        console.error('[AUTH] setSession error:', error)
        throw error
      }
      
      console.log('[AUTH] Session set successfully:', { hasData: !!data.session })
      return { data: { session: data.session } }
    },
    
    signInWithGoogle: async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      if (error) throw error
      return data
    },
    
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    
    getSession: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    
    getUser: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  },
  
  // Recipe endpoints
  recipes: {
    getAll: async (params?: {
      search?: string
      cuisine_type?: string
      prep_time_max?: number
    }) => {
      const queryParams = new URLSearchParams()
      if (params?.search) queryParams.append('search', params.search)
      if (params?.cuisine_type) queryParams.append('cuisine_type', params.cuisine_type)
      if (params?.prep_time_max) queryParams.append('prep_time_max', params.prep_time_max.toString())
      
      const query = queryParams.toString()
      return apiCall(`/recipes${query ? `?${query}` : ''}`)
    },
    
    getById: async (id: string) => {
      return apiCall(`/recipes/${id}`)
    },
    
    create: async (recipe: {
      name: string
      ingredients: string[]
      instructions: string[]
      cuisine_type?: string
      prep_time_minutes?: number
      image_url?: string
    }) => {
      return apiCall('/recipes', {
        method: 'POST',
        body: JSON.stringify(recipe),
      })
    },
    
    update: async (id: string, recipe: Partial<{
      name: string
      ingredients: string[]
      instructions: string[]
      cuisine_type: string
      prep_time_minutes: number
      image_url: string
    }>) => {
      return apiCall(`/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(recipe),
      })
    },
    
    delete: async (id: string) => {
      return apiCall(`/recipes/${id}`, {
        method: 'DELETE',
      })
    },
    
    updateStatus: async (id: string, status: 'favorite' | 'to_try' | 'made_before') => {
      return apiCall(`/recipes/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
    },
    
    removeStatus: async (id: string) => {
      return apiCall(`/recipes/${id}/status`, {
        method: 'DELETE',
      })
    },
  },
  
  // AI endpoints
  ai: {
    chat: async (message: string) => {
      return apiCall('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      })
    },
    
    generateRecipe: async (params: {
      prompt: string
      cuisine_type?: string
      prep_time_max?: number
    }) => {
      return apiCall('/ai/generate-recipe', {
        method: 'POST',
        body: JSON.stringify(params),
      })
    },
    
    improveRecipe: async (recipeId: string, improvementType: 'detailed' | 'simpler' | 'healthier') => {
      return apiCall('/ai/improve-recipe', {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: recipeId,
          improvement_type: improvementType,
        }),
      })
    },
    
    suggestByIngredients: async (ingredients: string[]) => {
      return apiCall('/ai/suggest-by-ingredients', {
        method: 'POST',
        body: JSON.stringify(ingredients),
      })
    },
    
    getChatHistory: async (limit: number = 20) => {
      return apiCall(`/ai/chat-history?limit=${limit}`)
    },
  },
}