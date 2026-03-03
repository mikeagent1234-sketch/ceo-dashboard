'use client'

import { useState, useRef, useEffect } from 'react'
import { useChatContext } from '@/lib/chat-context'
import { format } from 'date-fns'
import {
  MessageCircle,
  X,
  Send,
  ChevronDown,
  Zap,
  Hash,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Wifi,
  WifiOff,
} from 'lucide-react'

const QUICK_COMMANDS = [
  { cmd: '/task', label: 'Create Task', icon: Hash, color: 'text-blue-400' },
  { cmd: '/urgent', label: 'Urgent Alert', icon: AlertTriangle, color: 'text-red-400' },
  { cmd: '/done', label: 'Mark Done', icon: CheckCircle2, color: 'text-emerald-400' },
  { cmd: '/status', label: 'Get Status', icon: BarChart3, color: 'text-purple-400' },
]

export default function ChatWidget() {
  const {
    messages,
    sendMessage,
    isOpen,
    toggleChat,
    unreadCount,
    clearUnread,
    isTyping,
    setTyping,
    isConnected,
  } = useChatContext()

  const [input, setInput] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Clear unread when opened
  useEffect(() => {
    if (isOpen) {
      clearUnread()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, clearUnread])

  // Show command palette when typing /
  useEffect(() => {
    setShowCommands(input.startsWith('/') && !input.includes(' '))
  }, [input])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setSending(true)
    setInput('')
    setTyping('sebastian', false)

    try {
      await sendMessage(trimmed, 'sebastian', 'user')
    } catch (err) {
      console.error('Send failed:', err)
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    setTyping('sebastian', e.target.value.length > 0)
  }

  const selectCommand = (cmd: string) => {
    setInput(cmd + ' ')
    setShowCommands(false)
    inputRef.current?.focus()
  }

  const typingUsers = Object.entries(isTyping)
    .filter(([sender, typing]) => typing && sender !== 'sebastian')
    .map(([sender]) => sender)

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-24 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 z-50 group"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
        }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-dot">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-0 right-0 w-full sm:w-96 h-full sm:h-[600px] sm:bottom-6 sm:right-6 sm:rounded-xl z-50 flex flex-col animate-fade-in-scale overflow-hidden"
      style={{
        background: 'rgba(8, 12, 30, 0.98)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(59, 130, 246, 0.15))',
          borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Command Chat</h3>
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400">Reconnecting...</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleChat}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs mt-1">Start a conversation or use /commands</p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender_type === 'user'
          const isSystem = msg.sender_type === 'system'

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-1'}`}>
                {/* Sender name */}
                <div className={`flex items-center gap-1.5 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-500 capitalize">{msg.sender}</span>
                  <span className="text-xs text-gray-700">
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={`px-3 py-2 rounded-xl text-sm ${
                    isUser
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
                      : 'bg-gray-800/80 border border-gray-700/50 text-gray-200'
                  }`}
                >
                  {/* Command badge */}
                  {msg.command && (
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 font-medium ${
                        msg.command === 'urgent'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : msg.command === 'task'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : msg.command === 'done'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      /{msg.command}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingUsers.join(', ')} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Command palette */}
      {showCommands && (
        <div className="px-4 pb-2">
          <div className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-2 space-y-1">
            {QUICK_COMMANDS.filter((c) =>
              c.cmd.startsWith(input.toLowerCase())
            ).map((c) => {
              const Icon = c.icon
              return (
                <button
                  key={c.cmd}
                  onClick={() => selectCommand(c.cmd)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-700/50 transition-colors text-left"
                >
                  <Icon className={`w-4 h-4 ${c.color}`} />
                  <div>
                    <span className="text-sm text-white font-mono">{c.cmd}</span>
                    <span className="text-xs text-gray-500 ml-2">{c.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or /command..."
          className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            background: input.trim()
              ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
              : 'rgba(51, 65, 85, 0.3)',
          }}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}
