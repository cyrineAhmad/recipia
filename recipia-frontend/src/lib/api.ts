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
  
  // Handle 204 No Content responses
  if (response.status === 204) {
    return null
  }
  
  return response.json()
}

export const api = {
  // Auth endpoints - All authentication handled by Supabase directly
  auth: {
    signUp: async (email: string, password: string, fullName?: string): Promise<{ user: unknown; session: unknown } | null> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      if (error) throw error
      return data as { user: unknown; session: unknown } | null
    },
    
    signIn: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      return data
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

  // Sharing endpoints
  sharing: {
    shareRecipe: async (recipeId: string, email: string, permission: 'view' | 'edit' = 'view') => {
      return apiCall(`/sharing/recipes/${recipeId}/share`, {
        method: 'POST',
        body: JSON.stringify({
          shared_with_email: email,
          permission,
        }),
      })
    },

    getSharedWithMe: async () => {
      return apiCall('/sharing/recipes/shared-with-me')
    },

    getRecipeShares: async (recipeId: string) => {
      return apiCall(`/sharing/recipes/${recipeId}/shares`)
    },

    removeShare: async (recipeId: string, shareId: string) => {
      return apiCall(`/sharing/recipes/${recipeId}/share/${shareId}`, {
        method: 'DELETE',
      })
    },

    createPublicLink: async (recipeId: string, expiresAt?: string) => {
      return apiCall(`/sharing/recipes/${recipeId}/public-link`, {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: recipeId,
          expires_at: expiresAt,
        }),
      })
    },

    getPublicLink: async (recipeId: string) => {
      return apiCall(`/sharing/recipes/${recipeId}/public-link`)
    },

    getPublicRecipe: async (linkId: string) => {
      return apiCall(`/sharing/recipes/public/${linkId}`)
    },

    deletePublicLink: async (recipeId: string) => {
      return apiCall(`/sharing/recipes/${recipeId}/public-link`, {
        method: 'DELETE',
      })
    },
  },

  // Notifications endpoints
  notifications: {
    getAll: async (unreadOnly: boolean = false, limit: number = 50) => {
      const params = new URLSearchParams()
      params.append('limit', limit.toString())
      if (unreadOnly) params.append('unread_only', 'true')
      return apiCall(`/notifications?${params.toString()}`)
    },

    getUnreadCount: async () => {
      return apiCall('/notifications/unread-count')
    },

    markAsRead: async (notificationIds: string[]) => {
      return apiCall('/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify({ notification_ids: notificationIds }),
      })
    },

    markAllAsRead: async () => {
      return apiCall('/notifications/mark-all-read', {
        method: 'POST',
      })
    },

    delete: async (notificationId: string) => {
      return apiCall(`/notifications/${notificationId}`, {
        method: 'DELETE',
      })
    },

    deleteAll: async () => {
      return apiCall('/notifications', {
        method: 'DELETE',
      })
    },
  },
}