import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, MessageSquare, Wifi, WifiOff, LogOut, Paperclip, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from './types'
import { websocketChatService } from './services/api'
import { useAuth } from './contexts/AuthContext'
import { AuthWrapper } from './components/AuthWrapper'
import { FileUploadComponent } from './components/FileUpload'

interface ChatMessage {
  sender: string
  message: string
  timestamp: string
}

function App() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello${user?.email ? ` ${user.email}` : ''}! I'm your knowledge-based chatbot assistant. How can I help you today?`,
      role: 'assistant',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<{id: string, name: string}[]>([])
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

    // Set up message handler - handle the actual backend message format
    websocketChatService.onMessage((data: ChatMessage) => {
      // Backend echoes back user messages and stores them
      // We need to check if this is an echo of our own message or a bot response
      if (data.sender === user?.email) {
        // This is an echo of our own message, we can ignore it since we already added it
        console.log('Received echo of own message:', data)
        setIsLoading(false) // Stop loading since message was processed
        return
      }
      
      // This would be a bot response (if the backend sends bot responses)
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.message,
        role: 'assistant',
        timestamp: new Date(data.timestamp)
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
  }, [user?.email])

  // Show auth wrapper if not authenticated
  if (!isAuthenticated && !authLoading) {
    return <AuthWrapper />
  }

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Checking authentication status</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    websocketChatService.disconnect()
    logout()
  }

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
      // Note: Since your backend only echoes messages and doesn't generate responses,
      // we'll just stop loading after the echo is received
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

  const handleFileUploadComplete = (fileId: string, filename: string) => {
    setUploadedFiles(prev => [...prev, { id: fileId, name: filename }])
    
    // Add a message to the chat about the uploaded file
    const fileMessage: Message = {
      id: Date.now().toString(),
      content: `📁 **File uploaded successfully:** ${filename}\n\nThe file has been processed and is now available for questions. You can ask me anything about its content!`,
      role: 'assistant',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, fileMessage])
  }

  const handleFileUploadError = (error: string) => {
    // Add an error message to the chat
    const errorMessage: Message = {
      id: Date.now().toString(),
      content: `❌ **File upload failed:** ${error}`,
      role: 'assistant',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, errorMessage])
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
              <p className="text-sm text-gray-500">
                Ask me anything about our knowledge base
                {uploadedFiles.length > 0 && (
                  <span className="ml-2 text-primary-600">
                    • {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
            
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
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
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowFileUpload(true)}
              className="flex items-center justify-center p-2 h-10 w-10 text-gray-400 hover:text-gray-600 transition-colors"
              title="Upload files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center">
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
              className="flex items-center justify-center send-button h-10 w-10"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {isConnected ? (
              "Press Enter to send, Shift+Enter for new line • Click 📎 to upload files"
            ) : (
              "Connecting to WebSocket server..."
            )}
          </p>
        </form>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
              <button
                onClick={() => setShowFileUpload(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <FileUploadComponent
                onUploadComplete={handleFileUploadComplete}
                onUploadError={handleFileUploadError}
                acceptedTypes={['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.json']}
                maxFileSize={25}
                multiple={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
