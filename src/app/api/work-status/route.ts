import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// POST: Push a work status event (for agents to report progress)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent_id, task_id, event_type, message, progress, metadata } = body

    if (!agent_id || !message) {
      return NextResponse.json(
        { error: 'agent_id and message are required' },
        { status: 400 }
      )
    }

    const validTypes = ['start', 'progress', 'log', 'error', 'complete', 'idle']
    if (event_type && !validTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `event_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('work_status_events')
      .insert({
        agent_id,
        task_id: task_id || null,
        event_type: event_type || 'log',
        message,
        progress: typeof progress === 'number' ? progress : null,
        metadata: metadata || null,
      })
      .select()
      .single()

    if (error) throw error

    // If event is 'complete', also update task status
    if (event_type === 'complete' && task_id) {
      await supabase
        .from('tasks')
        .update({ status: 'review', progress: 100, updated_at: new Date().toISOString() })
        .eq('id', task_id)
    }

    // If event is 'progress' and has progress value, update task
    if (event_type === 'progress' && task_id && typeof progress === 'number') {
      await supabase
        .from('tasks')
        .update({ progress, updated_at: new Date().toISOString() })
        .eq('id', task_id)
    }

    // If event is 'start', update agent status to working
    if (event_type === 'start') {
      await supabase
        .from('agents')
        .update({ status: 'working' })
        .eq('id', agent_id)
    }

    // If event is 'complete' or 'idle', set agent to idle
    if (event_type === 'complete' || event_type === 'idle') {
      await supabase
        .from('agents')
        .update({ status: 'idle' })
        .eq('id', agent_id)
    }

    // If event is 'error', set agent to blocked
    if (event_type === 'error') {
      await supabase
        .from('agents')
        .update({ status: 'blocked' })
        .eq('id', agent_id)
    }

    return NextResponse.json({ success: true, event: data })
  } catch (err: any) {
    console.error('Work status error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

// GET: Retrieve recent work status events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let query = supabase
      .from('work_status_events')
      .select('*, agent:agents(*), task:tasks(*)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ events: data })
  } catch (err: any) {
    console.error('Work status fetch error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
