'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatMessage } from '@/types'

interface ChatContextType {
  messages: ChatMessage[]
  sendMessage: (content: string, sender?: string, senderType?: string) => Promise<void>
  isOpen: boolean
  toggleChat: () => void
  setIsOpen: (open: boolean) => void
  unreadCount: number
  clearUnread: () => void
  isTyping: Record<string, boolean>
  setTyping: (sender: string, typing: boolean) => void
  isConnected: boolean
}

const ChatContext = createContext<ChatContextType | null>(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}

// Parse quick commands: /task, /urgent, /done
function parseCommand(content: string): { command: string | null; processedContent: string } {
  const commandMatch = content.match(/^\/(\w+)\s*(.*)/)
  if (!commandMatch) return { command: null, processedContent: content }

  const cmd = commandMatch[1].toLowerCase()
  const rest = commandMatch[2]

  switch (cmd) {
    case 'task':
      return { command: 'task', processedContent: rest || 'New task created' }
    case 'urgent':
      return { command: 'urgent', processedContent: rest || 'Urgent flag raised' }
    case 'done':
      return { command: 'done', processedContent: rest || 'Task marked complete' }
    case 'status':
      return { command: 'status', processedContent: rest || 'Status requested' }
    default:
      return { command: null, processedContent: content }
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isTyping, setIsTypingState] = useState<Record<string, boolean>>({})
  const [isConnected, setIsConnected] = useState(false)
  const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

  // Load message history
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100)
      if (data) setMessages(data)
    }
    loadMessages()
  }, [])

  // Subscribe to real-time messages via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Increment unread if chat is closed
          if (!isOpen) {
            setUnreadCount((c) => c + 1)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen])

  const sendMessage = useCallback(async (content: string, sender = 'sebastian', senderType = 'user') => {
    const { command, processedContent } = parseCommand(content)

    const { error } = await supabase.from('messages').insert({
      content: processedContent,
      sender,
      sender_type: senderType,
      command,
    })

    if (error) console.error('Failed to send message:', error)

    // Handle command side effects
    if (command === 'task') {
      await supabase.from('notifications').insert({
        message: `💬 Quick task from chat: "${processedContent}"`,
        type: 'info',
      })
    } else if (command === 'urgent') {
      await supabase.from('notifications').insert({
        message: `🚨 URGENT from ${sender}: "${processedContent}"`,
        type: 'warning',
      })
    }
  }, [])

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const clearUnread = useCallback(() => {
    setUnreadCount(0)
  }, [])

  const setTyping = useCallback((sender: string, typing: boolean) => {
    setIsTypingState((prev) => ({ ...prev, [sender]: typing }))

    // Auto-clear typing after 3 seconds
    if (typing) {
      if (typingTimeouts.current[sender]) {
        clearTimeout(typingTimeouts.current[sender])
      }
      typingTimeouts.current[sender] = setTimeout(() => {
        setIsTypingState((prev) => ({ ...prev, [sender]: false }))
      }, 3000)
    }
  }, [])

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isOpen,
        toggleChat,
        setIsOpen,
        unreadCount,
        clearUnread,
        isTyping,
        setTyping,
        isConnected,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
