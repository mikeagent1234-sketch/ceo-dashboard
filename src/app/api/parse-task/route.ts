import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const PRIORITY_KEYWORDS = {
  high: ['urgent', 'asap', 'critical', 'immediately', 'right now', 'high priority', 'important', 'emergency', 'rush'],
  low: ['whenever', 'low priority', 'not urgent', 'when you can', 'no rush', 'eventually', 'sometime'],
}

// POST: Parse natural language into a task and optionally create it
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input, autoCreate } = body

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'input string is required' }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch agents and projects
    const [agentsRes, projectsRes] = await Promise.all([
      supabase.from('agents').select('*').order('name'),
      supabase.from('projects').select('*').eq('status', 'active').order('name'),
    ])

    const agents = agentsRes.data || []
    const projects = projectsRes.data || []
    const lower = input.toLowerCase().trim()

    let confidence = 0.5
    let agentId: string | null = null
    let agentName: string | null = null
    let priority: 'high' | 'medium' | 'low' = 'medium'
    let projectId: string | null = null
    let projectName: string | null = null
    let title = input.trim()

    // Agent detection: "AgentName: task"
    for (const agent of agents) {
      const nameLower = agent.name.toLowerCase()
      const colonPattern = new RegExp(`^${nameLower}[:\\s,]+(.+)`, 'i')
      const match = input.match(colonPattern)
      if (match) {
        agentName = agent.name
        agentId = agent.id
        title = match[1].trim()
        confidence += 0.3
        break
      }
    }

    // Agent detection: keyword/name mention
    if (!agentId) {
      for (const agent of agents) {
        const nameLower = agent.name.toLowerCase()
        const roleLower = agent.role.toLowerCase()
        if (lower.includes(nameLower) || lower.includes(roleLower)) {
          agentName = agent.name
          agentId = agent.id
          confidence += 0.2
          title = title.replace(new RegExp(`\\b${nameLower}\\b[:\\s,]*`, 'gi'), '').trim()
          break
        }
      }
    }

    // "assign to X"
    if (!agentId) {
      const assignMatch = input.match(/(?:assign(?:\s+(?:it|this))?\s+to|for)\s+(\w+)/i)
      if (assignMatch) {
        const target = assignMatch[1].toLowerCase()
        const matched = agents.find(a =>
          a.name.toLowerCase() === target || a.role.toLowerCase().includes(target)
        )
        if (matched) {
          agentName = matched.name
          agentId = matched.id
          confidence += 0.25
          title = title.replace(/(?:assign(?:\s+(?:it|this))?\s+to|for)\s+\w+/i, '').trim()
        }
      }
    }

    // Priority
    for (const kw of PRIORITY_KEYWORDS.high) {
      if (lower.includes(kw)) {
        priority = 'high'
        confidence += 0.1
        title = title.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '').trim()
        break
      }
    }
    if (priority === 'medium') {
      for (const kw of PRIORITY_KEYWORDS.low) {
        if (lower.includes(kw)) {
          priority = 'low'
          confidence += 0.05
          title = title.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '').trim()
          break
        }
      }
    }

    // Project
    for (const project of projects) {
      if (lower.includes(project.name.toLowerCase())) {
        projectName = project.name
        projectId = project.id
        confidence += 0.1
        break
      }
    }

    // Clean title
    title = title
      .replace(/^(tell|ask|have|get|make)\s+(the\s+)?/i, '')
      .replace(/\s+to\s+$/i, '')
      .replace(/^\s*[,:\-]\s*/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (title.length > 0) title = title.charAt(0).toUpperCase() + title.slice(1)
    if (title.length > 5) confidence += 0.1
    if (agentId && title.length > 10) confidence += 0.1
    confidence = Math.min(Math.round(confidence * 100) / 100, 1.0)

    const parsed = {
      title,
      agent_id: agentId,
      agent_name: agentName,
      priority,
      project_id: projectId,
      project_name: projectName,
      confidence,
      raw_input: input,
    }

    // Auto-create if requested and confidence is high enough
    if (autoCreate && confidence >= 0.6 && title.length > 3) {
      const { data: task, error: insertErr } = await supabase
        .from('tasks')
        .insert({
          title,
          agent_id: agentId,
          priority,
          project_id: projectId,
          status: 'todo',
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      await supabase.from('notifications').insert({
        message: `🤖 Auto-created task: "${title}"${agentName ? ` → ${agentName}` : ''} (${Math.round(confidence * 100)}% confidence)`,
        type: 'success',
      })

      return NextResponse.json({ parsed, created: true, task })
    }

    return NextResponse.json({ parsed, created: false })
  } catch (err: any) {
    console.error('Parse task error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
