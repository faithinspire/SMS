'use client'

import { useContext, createContext } from 'react'
import { User } from '@/types'

export interface AuthContextType {
  user: User | null
  school: any | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      school: null,
      loading: false,
      error: null,
      login: async () => {},
      logout: async () => {},
    }
  }
  return context
}

export { AuthContext }
