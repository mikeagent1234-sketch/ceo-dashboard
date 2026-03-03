import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Webhook endpoint for proactive notifications
// POST /api/webhooks/notify
// Body: { type: 'info'|'success'|'warning'|'error', message: string, source?: string, chat?: boolean }

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await request.json()
    const { type = 'info', message, source, chat = false } = body

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const validTypes = ['info', 'success', 'warning', 'error']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    // Insert notification
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        message: source ? `[${source}] ${message}` : message,
        type,
      })
      .select()
      .single()

    if (notifError) {
      return NextResponse.json({ error: notifError.message }, { status: 500 })
    }

    // Optionally post to chat as system message
    if (chat) {
      await supabase.from('messages').insert({
        content: message,
        sender: source || 'system',
        sender_type: 'system',
        command: null,
      })
    }

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// GET /api/webhooks/notify — health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'POST /api/webhooks/notify',
    body: {
      type: 'info | success | warning | error',
      message: 'string (required)',
      source: 'string (optional label)',
      chat: 'boolean (optional, also post to chat)',
    },
  })
}
