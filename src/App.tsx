import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, MessageSquare, Wifi, WifiOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from './types'
import { websocketChatService } from './services/api'

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your knowledge-based chatbot assistant. How can I help you today?',
      role: 'assistant',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        await websocketChatService.connect()
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error)
        setIsConnected(false)
      }
    }

    // Set up message handler
    websocketChatService.onMessage((data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.response || 'I received your message.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    })

    // Set up connection handler
    websocketChatService.onConnectionChange((connected) => {
      setIsConnected(connected)
      if (connected) {
        console.log('WebSocket connected successfully')
      } else {
        console.log('WebSocket disconnected')
      }
    })

    initializeWebSocket()

    return () => {
      websocketChatService.disconnect()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !isConnected) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      await websocketChatService.sendMessage(input)
      // The response will be handled by the onMessage callback
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I\'m currently unable to process your request. Please try again later.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
    }
  }

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 p-4">
      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
        <Bot className="w-5 h-5 text-primary-600" />
      </div>
      <div className="typing-indicator">
        <div className="typing-dot" style={{ animationDelay: '0ms' }}></div>
        <div className="typing-dot" style={{ animationDelay: '150ms' }}></div>
        <div className="typing-dot" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Knowledge Base Chatbot</h1>
              <p className="text-sm text-gray-500">Ask me anything about our knowledge base</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 animate-slide-up ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-primary-500' 
                  : 'bg-primary-100'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-primary-600" />
                )}
              </div>
              <div className={`max-w-3xl p-4 ${
                message.role === 'user' 
                  ? 'message-user' 
                  : 'message-assistant'
              }`}>
                {message.role === 'assistant' ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm max-w-none"
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-primary-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isConnected ? "Type your message..." : "Connecting to chat..."}
                className="chat-input"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                disabled={isLoading || !isConnected}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !isConnected}
              className="send-button"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {isConnected ? (
              "Press Enter to send, Shift+Enter for new line"
            ) : (
              "Connecting to WebSocket server..."
            )}
          </p>
        </form>
      </div>
    </div>
  )
}

export default App
