export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export interface ChatResponse {
  response: string
  error?: string
}

export interface ChatRequest {
  message: string
  conversationId?: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in?: number
  user: User
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

// File upload types
export interface FileUploadResponse {
  file_id: string
  filename: string
  status: string
}

export interface FileStatusResponse {
  file_id: string
  status: 'processing' | 'processed' | 'unknown'
  detail: string
}

export interface UploadProgress {
  fileId: string
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'processed' | 'unknown' | 'error'
  error?: string
}

export interface FileUpload {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'processed' | 'unknown' | 'error'
  fileId?: string
  error?: string
}
