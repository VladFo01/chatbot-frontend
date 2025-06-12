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
