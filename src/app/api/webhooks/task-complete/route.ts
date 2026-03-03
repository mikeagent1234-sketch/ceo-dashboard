import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Webhook: Task completion notification
// POST /api/webhooks/task-complete
// Body: { task_id: string, agent_name?: string, summary?: string }

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await request.json()
    const { task_id, agent_name, summary } = body

    if (!task_id) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 })
    }

    // Fetch task details
    const { data: task } = await supabase
      .from('tasks')
      .select('*, agent:agents(*)')
      .eq('id', task_id)
      .single()

    const taskTitle = task?.title || 'Unknown task'
    const agentDisplay = agent_name || task?.agent?.name || 'Unknown agent'

    // Create notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        message: `✅ Task completed by ${agentDisplay}: "${taskTitle}"${summary ? ` — ${summary}` : ''}`,
        type: 'success',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also post to chat
    await supabase.from('messages').insert({
      content: `Task "${taskTitle}" completed by ${agentDisplay}${summary ? `: ${summary}` : ''}`,
      sender: 'system',
      sender_type: 'system',
      command: 'done',
    })

    return NextResponse.json({ success: true, notification })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
