export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string | null
  storage_used: number
  email_verified?: boolean
  created_at: string
}

export type GalleryVisibility = 'public' | 'private' | 'password'

export type WatermarkPosition =
  | 'south_east'
  | 'south_west'
  | 'north_east'
  | 'north_west'
  | 'south'
  | 'north'
  | 'center'

export interface Gallery {
  id: string
  owner_id: string
  name: string
  description?: string | null
  location?: string | null
  event_date?: string | null
  cover_photo_url?: string | null
  slug: string
  visibility: GalleryVisibility
  views: number
  photo_count?: number
  created_at: string
  updated_at?: string
  owner_name?: string
  watermark_enabled?: boolean
  watermark_text?: string | null
  watermark_logo_url?: string | null
  watermark_logo_public_id?: string | null
  watermark_position?: WatermarkPosition | string | null
  watermark_opacity?: number | null
}

export interface Photo {
  id: string
  gallery_id: string
  user_id: string
  file_name: string
  image_url: string
  thumbnail_url?: string | null
  public_id: string
  file_size: number
  width?: number | null
  height?: number | null
  views: number
  downloads: number
  tags?: string[]
  is_deleted?: boolean
  is_favorited?: boolean
  created_at: string
  gallery_name?: string
  gallery_slug?: string
}

export interface DashboardStats {
  totalGalleries: number
  totalPhotos: number
  totalViews: number
  storageUsed: number
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  requiresPassword?: boolean
}
