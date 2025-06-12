import axios from 'axios'
import type { ChatRequest, ChatResponse, FileUploadResponse, FileStatusResponse } from '../types'
import { authService } from './auth'

// Configure base URL - update this to match your backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
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

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

interface ChatMessage {
  sender: string
  message: string
  timestamp: string
}

interface WebSocketMessage {
  message: string
}

class WebSocketChatService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageHandler: ((data: ChatMessage) => void) | null = null
  private connectionHandler: ((connected: boolean) => void) | null = null

  async connect(): Promise<void> {
    const token = authService.getStoredToken()
    if (!token) {
      throw new Error('No authentication token available')
    }

    const wsEndpoint = `${WS_BASE_URL}/ws/chat?token=${token}`

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsEndpoint)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.connectionHandler?.(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data: ChatMessage = JSON.parse(event.data)
            console.log('Received message:', data)
            this.messageHandler?.(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason)
          this.connectionHandler?.(false)
          
          // Don't reconnect if it's an authentication error (1008 = Policy Violation)
          if (event.code === 1008) {
            console.log('Authentication failed, not attempting to reconnect')
            return
          }

          // Attempt to reconnect if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        reject(error)
      }
    })
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.reconnectAttempts++
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    const messageData: WebSocketMessage = { message }
    this.ws.send(JSON.stringify(messageData))
  }

  onMessage(handler: (data: ChatMessage) => void): void {
    this.messageHandler = handler
  }

  onConnectionChange(handler: (connected: boolean) => void): void {
    this.connectionHandler = handler
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const websocketChatService = new WebSocketChatService()

// File Upload Service
export const fileUploadService = {
  /**
   * Upload a file to the backend
   */
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/api/v1/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percentCompleted)
          }
        },
      })

      return response.data
    } catch (error) {
      console.error('File upload failed:', error)
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || 'File upload failed'
        throw new Error(errorMessage)
      }
      throw new Error('File upload failed')
    }
  },

  /**
   * Check the processing status of an uploaded file
   */
  async getFileStatus(fileId: string): Promise<FileStatusResponse> {
    try {
      const response = await api.get(`/api/v1/upload/status/${fileId}`)
      return response.data
    } catch (error) {
      console.error('Failed to get file status:', error)
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || 'Failed to get file status'
        throw new Error(errorMessage)
      }
      throw new Error('Failed to get file status')
    }
  },

  /**
   * Poll file status until processing is complete
   */
  async pollFileStatus(
    fileId: string,
    onStatusUpdate?: (status: FileStatusResponse) => void,
    pollInterval: number = 2000,
    maxAttempts: number = 30
  ): Promise<FileStatusResponse> {
    let attempts = 0

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++
          const status = await this.getFileStatus(fileId)
          
          if (onStatusUpdate) {
            onStatusUpdate(status)
          }

          // Check if processing is complete
          if (status.status === 'processed') {
            resolve(status)
            return
          }

          // Check for unknown status (which might indicate an error)
          if (status.status === 'unknown') {
            reject(new Error(status.detail || 'File processing failed with unknown status'))
            return
          }

          // Check if we've exceeded max attempts
          if (attempts >= maxAttempts) {
            reject(new Error('File processing timeout - file is still processing'))
            return
          }

          // Continue polling if status is 'processing'
          if (status.status === 'processing') {
            setTimeout(poll, pollInterval)
          } else {
            // Unexpected status
            reject(new Error(`Unexpected file status: ${status.status}`))
          }
        } catch (error) {
          reject(error)
        }
      }

      poll()
    })
  }
}

// Traditional HTTP API service (for non-chat endpoints)
export const chatService = {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // For WebSocket-based chat, this method delegates to WebSocket
    if (websocketChatService.isConnected()) {
      await websocketChatService.sendMessage(request.message)
      return { response: 'Message sent via WebSocket' }
    }
    
    // Fallback to HTTP if WebSocket is not available
    try {
      const response = await api.post('/api/chat', request)
      return response.data
    } catch (error) {
      console.error('Failed to send message:', error)
      throw new Error('Failed to communicate with the server')
    }
  },

  async getConversationHistory(conversationId: string) {
    try {
      const response = await api.get(`/api/conversations/${conversationId}`)
      return response.data
    } catch (error) {
      console.error('Failed to get conversation history:', error)
      throw error
    }
  },

  async createConversation() {
    try {
      const response = await api.post('/api/conversations')
      return response.data
    } catch (error) {
      console.error('Failed to create conversation:', error)
      throw error
    }
  }
}

export default api 