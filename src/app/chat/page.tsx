'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatMessage } from '@/types'
import { format } from 'date-fns'
import {
  MessageCircle,
  Send,
  Hash,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Wifi,
  WifiOff,
  Loader2,
  Trash2,
  Zap,
} from 'lucide-react'

const QUICK_COMMANDS = [
  { cmd: '/task', label: 'Create a quick task', icon: Hash, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { cmd: '/urgent', label: 'Flag something urgent', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  { cmd: '/done', label: 'Mark task complete', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { cmd: '/status', label: 'Request status update', icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
]

function parseCommand(content: string): { command: string | null; processedContent: string } {
  const match = content.match(/^\/(\w+)\s*(.*)/)
  if (!match) return { command: null, processedContent: content }
  const cmd = match[1].toLowerCase()
  const rest = match[2]
  const commands: Record<string, string> = { task: 'task', urgent: 'urgent', done: 'done', status: 'status' }
  if (commands[cmd]) return { command: commands[cmd], processedContent: rest || `${cmd} command issued` }
  return { command: null, processedContent: content }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [connected, setConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load history
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('chat-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as ChatMessage
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      })
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setShowCommands(input.startsWith('/') && !input.includes(' '))
  }, [input])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    setSending(true)
    setInput('')

    const { command, processedContent } = parseCommand(trimmed)

    await supabase.from('messages').insert({
      content: processedContent,
      sender: 'sebastian',
      sender_type: 'user',
      command,
    })

    if (command === 'task') {
      await supabase.from('notifications').insert({ message: `💬 Quick task from chat: "${processedContent}"`, type: 'info' })
    } else if (command === 'urgent') {
      await supabase.from('notifications').insert({ message: `🚨 URGENT: "${processedContent}"`, type: 'warning' })
    }

    setSending(false)
  }

  const clearHistory = async () => {
    await supabase.from('messages').delete().neq('id', '')
    setMessages([])
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  // Group messages by date
  const groupedMessages: Record<string, ChatMessage[]> = {}
  messages.forEach((msg) => {
    const dateKey = format(new Date(msg.created_at), 'MMMM d, yyyy')
    if (!groupedMessages[dateKey]) groupedMessages[dateKey] = []
    groupedMessages[dateKey].push(msg)
  })

  return (
    <div className="max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Command Chat</h1>
            <div className="flex items-center gap-2">
              {connected ? (
                <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-xs text-emerald-400">Real-time connected</span></>
              ) : (
                <><WifiOff className="w-3 h-3 text-red-400" /><span className="text-xs text-red-400">Reconnecting...</span></>
              )}
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-500">{messages.length} messages</span>
            </div>
          </div>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all text-sm"
        >
          <Trash2 className="w-4 h-4" /> Clear
        </button>
      </div>

      {/* Quick Commands */}
      <div className="flex gap-2 mb-4 flex-shrink-0 overflow-x-auto pb-2">
        {QUICK_COMMANDS.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.cmd}
              onClick={() => { setInput(c.cmd + ' '); inputRef.current?.focus() }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-all hover:scale-[1.02] ${c.bg}`}
            >
              <Icon className={`w-3.5 h-3.5 ${c.color}`} />
              <span className="text-gray-300 font-mono text-xs">{c.cmd}</span>
            </button>
          )
        })}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-gray-900/40 border border-gray-800 rounded-xl p-4 space-y-1 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg">No messages yet</p>
            <p className="text-sm mt-1">Start a conversation with your agent team</p>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600 px-2">{date}</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {msgs.map((msg) => {
              const isUser = msg.sender_type === 'user'
              const isSystem = msg.sender_type === 'system'

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-800/50 px-3 py-1.5 rounded-full">
                      {msg.command === 'urgent' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      {msg.command === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      <span>{msg.content}</span>
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
                  <div className={`max-w-[70%]`}>
                    <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {msg.sender.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-gray-500 capitalize">{msg.sender}</span>
                      <span className="text-xs text-gray-700">{format(new Date(msg.created_at), 'h:mm a')}</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600/20 border border-blue-500/25 text-blue-50 rounded-br-md'
                        : 'bg-gray-800/80 border border-gray-700/40 text-gray-200 rounded-bl-md'
                    }`}>
                      {msg.command && (
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1.5 font-medium ${
                          msg.command === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : msg.command === 'task' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : msg.command === 'done' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>/{msg.command}</span>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Command palette */}
      {showCommands && (
        <div className="mb-2">
          <div className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-2 space-y-1">
            {QUICK_COMMANDS.filter((c) => c.cmd.startsWith(input.toLowerCase())).map((c) => {
              const Icon = c.icon
              return (
                <button
                  key={c.cmd}
                  onClick={() => { setInput(c.cmd + ' '); setShowCommands(false); inputRef.current?.focus() }}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-700/50 transition-colors text-left"
                >
                  <Icon className={`w-4 h-4 ${c.color}`} />
                  <span className="text-sm text-white font-mono">{c.cmd}</span>
                  <span className="text-xs text-gray-500">{c.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-3 flex-shrink-0 pb-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a message or /command..."
          className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          autoFocus
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            background: input.trim() ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'rgba(51, 65, 85, 0.3)',
          }}
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  )
}
