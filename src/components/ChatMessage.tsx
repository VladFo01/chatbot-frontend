import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../types'

interface ChatMessageProps {
  message: Message
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div
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
  )
} 