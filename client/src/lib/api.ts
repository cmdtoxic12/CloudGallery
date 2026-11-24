import axios from 'axios'
import type { ApiResponse, AuthResponse, DashboardStats, Gallery, Photo, User } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cg_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/')
      if (!isAuthRoute) {
        localStorage.removeItem('cg_token')
        localStorage.removeItem('cg_user')
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string; confirmPassword?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  me: () => api.get<ApiResponse<{ user: User }>>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  verifyEmail: (token: string) => api.post<ApiResponse>('/auth/verify-email', { token }),
  resendVerification: () => api.post<ApiResponse>('/auth/resend-verification'),
  forgotPassword: (email: string) => api.post<ApiResponse>('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string; confirmPassword?: string }) =>
    api.post<ApiResponse>('/auth/reset-password', data),
}

// Galleries
export const galleryApi = {
  list: () => api.get<ApiResponse<{ galleries: Gallery[] }>>('/galleries'),
  create: (data: Partial<Gallery> & { password?: string }) =>
    api.post<ApiResponse<{ gallery: Gallery }>>('/galleries', data),
  getById: (id: string) => api.get<ApiResponse<{ gallery: Gallery }>>(`/galleries/${id}`),
  getBySlug: (slug: string) => api.get<ApiResponse<{ gallery: Gallery }>>(`/galleries/slug/${slug}`),
  unlock: (slug: string, password: string) =>
    api.post<ApiResponse<{ gallery: Gallery }>>(`/galleries/slug/${slug}/unlock`, { password }),
  update: (id: string, data: Partial<Gallery> & { password?: string }) =>
    api.put<ApiResponse<{ gallery: Gallery }>>(`/galleries/${id}`, data),
  delete: (id: string) => api.delete(`/galleries/${id}`),
  stats: () => api.get<ApiResponse<DashboardStats>>('/galleries/stats'),
  trackShare: (id: string, platform: string) =>
    api.post(`/galleries/${id}/share`, { platform }),
}

// Photos
export const photoApi = {
  upload: (galleryId: string, files: File[], onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('galleryId', galleryId)
    files.forEach((f) => form.append('photos', f))
    return api.post<ApiResponse<{ photos: Photo[] }>>('/photos/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
  },
  list: (galleryId: string, page = 1, limit = 50, trash = false) =>
    api.get<ApiResponse<{ photos: Photo[]; pagination: any }>>(
      `/photos/gallery/${galleryId}?page=${page}&limit=${limit}${trash ? '&trash=1' : ''}`
    ),
  get: (id: string) => api.get<ApiResponse<{ photo: Photo }>>(`/photos/${id}`),
  delete: (id: string) => api.delete(`/photos/${id}`),
  toggleFavorite: (id: string) =>
    api.post<ApiResponse<{ favorited: boolean }>>(`/photos/${id}/favorite`),
  favorites: () => api.get<ApiResponse<{ photos: Photo[] }>>('/photos/favorites'),
  trackDownload: (id: string) => api.post(`/photos/${id}/download`),
  bulkDelete: (ids: string[]) => api.post<ApiResponse<{ deleted: number }>>('/photos/bulk-delete', { ids }),
  purge: (ids: string[]) => api.post<ApiResponse<{ purged: number }>>('/photos/purge', { ids }),
  restore: (ids: string[]) => api.post<ApiResponse<{ restored: number }>>('/photos/restore', { ids }),
  bulkDownload: (payload: { ids?: string[]; galleryId?: string }) =>
    api.post('/photos/bulk-download', payload, { responseType: 'blob' }),
}

export default api
