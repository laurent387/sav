// Custom hooks for auth
import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import type { AuthContextType } from '../types/auth'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
