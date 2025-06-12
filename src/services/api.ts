import axios from 'axios'
import type { ChatRequest, ChatResponse } from '../types'
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