import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../../types'
import { Send, Loader2, Sparkles, Code2 } from 'lucide-react'

interface ChatPanelProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSendMessage: (message: string) => void
}

// Quick action buttons
const QUICK_ACTIONS = [
  { label: 'Landing Page', prompt: 'Create a modern landing page with hero, features, and CTA sections' },
  { label: 'Dashboard', prompt: 'Create a dashboard with sidebar navigation and stats cards' },
  { label: 'Login Form', prompt: 'Create a login page with email and password form' },
  { label: 'Pricing Page', prompt: 'Create a pricing page with 3 tier comparison cards' },
]

export function ChatPanel({ messages, isLoading, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    onSendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Welcome to Thunder
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Describe what you want to build and I'll generate the code.
            </p>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => onSendMessage(action.prompt)}
                  className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] px-4 py-3 rounded-2xl text-sm
                  ${message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white/5 text-gray-200 rounded-bl-md border border-white/10'
                  }
                `}
              >
                {/* Message content */}
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Artifact indicator */}
                {message.artifact && message.artifact.files.size > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-gray-400">
                    <Code2 className="w-3 h-3" />
                    <span>{message.artifact.files.size} file(s) generated</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            disabled={isLoading}
            rows={1}
            className="
              w-full px-4 py-3 pr-12
              bg-white/5 border border-white/10 rounded-xl
              text-white placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
              resize-none disabled:opacity-50
            "
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="
              absolute right-2 bottom-2
              p-2 rounded-lg
              bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700
              text-white disabled:text-gray-500
              transition-colors
            "
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  )
}
