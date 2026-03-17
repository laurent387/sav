import { createContext, useEffect, useState } from 'react'
import type { AuthContextType, User } from '../types/auth'
import { ApiService } from '../services/api'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch {
        setError('Impossible de restaurer la session')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Essayer d'abord le serveur réel
      let response
      try {
        response = await ApiService.login({ username, password })
      } catch {
        // En cas d'erreur, essayer le mock (fallback pour développement)
        response = await ApiService.loginMock({ username, password })
      }

      setUser(response.user)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await ApiService.logout()
    } catch {
      // Logout côté client même en cas d'erreur
    }
    setUser(null)
    setError(null)
  }

  const refreshToken = async () => {
    try {
      await ApiService.refreshToken()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de refresh')
      await logout()
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
