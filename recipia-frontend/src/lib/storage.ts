/**
 * Supabase Storage utilities for recipe images.
 * Bucket: recipe-images
 * Policies: users can view, admins can insert/delete.
 */
import { supabase } from './supabase'

const BUCKET = 'recipe-images'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

export async function uploadRecipeImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Use JPEG, PNG, WebP, or GIF.')
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File too large. Max size is ${MAX_SIZE_MB}MB.`)
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `recipes/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return urlData.publicUrl
}
