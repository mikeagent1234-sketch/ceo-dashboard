'use client'

import { ChatProvider } from '@/lib/chat-context'
import ChatWidget from '@/components/ChatWidget'

export default function ChatWidgetWrapper() {
  return (
    <ChatProvider>
      <ChatWidget />
    </ChatProvider>
  )
}
