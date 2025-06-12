import axios from 'axios'
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth tokens
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling auth errors
authApi.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      window.location.reload() // Force re-authentication
    }
    return Promise.reject(error)
  }
)

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await authApi.post('/api/v1/auth/login', credentials)
      const authData: AuthResponse = response.data
      
      // Create user object from email since backend doesn't return user info
      const user: User = {
        id: 'current_user', // Placeholder since backend doesn't provide user ID
        email: credentials.email,
      }
      
      const completeAuthData = {
        ...authData,
        user
      }
      
      // Store token and user data
      localStorage.setItem('authToken', authData.access_token)
      localStorage.setItem('user', JSON.stringify(user))
      
      return completeAuthData
    } catch (error: unknown) {
      console.error('Login failed:', error)
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.detail || 'Login failed. Please check your credentials.'
        : 'Login failed. Please check your credentials.'
      throw new Error(errorMessage)
    }
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await authApi.post('/api/v1/auth/register', userData)
      const authData: AuthResponse = response.data
      
      // Create user object from email since backend doesn't return user info
      const user: User = {
        id: 'current_user', // Placeholder since backend doesn't provide user ID
        email: userData.email,
      }
      
      const completeAuthData = {
        ...authData,
        user
      }
      
      // Store token and user data
      localStorage.setItem('authToken', authData.access_token)
      localStorage.setItem('user', JSON.stringify(user))
      
      return completeAuthData
    } catch (error: unknown) {
      console.error('Registration failed:', error)
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.detail || 'Registration failed. Please try again.'
        : 'Registration failed. Please try again.'
      throw new Error(errorMessage)
    }
  },

  logout(): void {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  },

  getStoredToken(): string | null {
    return localStorage.getItem('authToken')
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        localStorage.removeItem('user')
      }
    }
    return null
  },

  isTokenValid(): boolean {
    const token = this.getStoredToken()
    if (!token) return false

    try {
      // Basic JWT validation - check if token is not expired
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp > currentTime
    } catch (error) {
      console.error('Invalid token format:', error)
      return false
    }
  }
}

export default authService 