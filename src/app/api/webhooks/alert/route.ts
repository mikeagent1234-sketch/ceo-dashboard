import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Webhook: Critical alerts (errors, blockers, downtime)
// POST /api/webhooks/alert
// Body: { severity: 'warning'|'error'|'critical', message: string, service?: string, details?: string }

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await request.json()
    const { severity = 'warning', message, service, details } = body

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const severityEmoji: Record<string, string> = {
      warning: '⚠️',
      error: '❌',
      critical: '🔥',
    }

    const notifType = severity === 'critical' ? 'error' : severity === 'error' ? 'error' : 'warning'
    const emoji = severityEmoji[severity] || '⚠️'
    const prefix = service ? `[${service}] ` : ''

    // Create high-priority notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        message: `${emoji} ${prefix}${message}${details ? ` — ${details}` : ''}`,
        type: notifType,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Always post critical alerts to chat
    if (severity === 'critical' || severity === 'error') {
      await supabase.from('messages').insert({
        content: `${emoji} ALERT: ${prefix}${message}${details ? `\n${details}` : ''}`,
        sender: 'system',
        sender_type: 'system',
        command: 'urgent',
      })
    }

    return NextResponse.json({ success: true, notification, severity })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
