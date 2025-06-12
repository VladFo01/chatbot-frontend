import axios from 'axios'
import type { ChatRequest, ChatResponse } from '../types'

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

// WebSocket Chat Service
class WebSocketChatService {
  private ws: WebSocket | null = null
  private messageHandlers: Array<(message: ChatResponse) => void> = []
  private connectionHandlers: Array<(connected: boolean) => void> = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('authToken')
        const wsUrl = token 
          ? `${WS_BASE_URL}/ws/chat?token=${encodeURIComponent(token)}`
          : `${WS_BASE_URL}/ws/chat`

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.notifyConnectionHandlers(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.notifyMessageHandlers(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
            // Handle plain text messages
            this.notifyMessageHandlers({ response: event.data })
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.notifyConnectionHandlers(false)
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  private attemptReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect().catch(console.error)
    }, delay)
  }

  sendMessage(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'))
        return
      }

      try {
        // Send as JSON if the backend expects JSON format
        const messageData = JSON.stringify({ message })
        this.ws.send(messageData)
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  onMessage(handler: (message: ChatResponse) => void) {
    this.messageHandlers.push(handler)
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler)
  }

  private notifyMessageHandlers(message: ChatResponse) {
    this.messageHandlers.forEach(handler => handler(message))
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected))
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Create a singleton instance
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