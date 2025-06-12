import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AuthContextType, User, LoginRequest, RegisterRequest } from '../types'
import { authService } from '../services/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored authentication on app startup
    const initializeAuth = async () => {
      try {
        const storedToken = authService.getStoredToken()
        const storedUser = authService.getStoredUser()

        if (storedToken && storedUser && authService.isTokenValid()) {
          setToken(storedToken)
          setUser(storedUser)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Clear invalid data
        authService.logout()
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true)
    try {
      const authData = await authService.login(credentials)
      setToken(authData.access_token)
      setUser(authData.user)
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterRequest): Promise<void> => {
    setIsLoading(true)
    try {
      const authData = await authService.register(userData)
      setToken(authData.access_token)
      setUser(authData.user)
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = (): void => {
    authService.logout()
    setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext 