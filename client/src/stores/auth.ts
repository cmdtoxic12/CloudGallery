import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { authApi } from '../lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadUser: () => Promise<void>
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) => {
        localStorage.setItem('cg_token', token)
        set({ user, token, isAuthenticated: true, isLoading: false })
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {}
        localStorage.removeItem('cg_token')
        localStorage.removeItem('cg_user')
        set({ user: null, token: null, isAuthenticated: false })
      },

      loadUser: async () => {
        const token = localStorage.getItem('cg_token')
        if (!token) {
          set({ isLoading: false, isAuthenticated: false })
          return
        }
        try {
          const { data } = await authApi.me()
          if (data.success && data.data?.user) {
            set({
              user: data.data.user,
              token,
              isAuthenticated: true,
              isLoading: false,
            })
          } else {
            get().clear()
          }
        } catch {
          get().clear()
        }
      },

      clear: () => {
        localStorage.removeItem('cg_token')
        set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      },
    }),
    {
      name: 'cg-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
)
