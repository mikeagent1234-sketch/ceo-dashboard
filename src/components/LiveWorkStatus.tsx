'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Agent, Task } from '@/types'
import {
  Terminal,
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Circle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react'

// ---- Types ----

interface WorkStatusEvent {
  id: string
  agent_id: string
  task_id: string | null
  event_type: 'start' | 'progress' | 'log' | 'error' | 'complete' | 'idle'
  message: string
  progress: number | null
  metadata: Record<string, any> | null
  created_at: string
}

interface AgentWorkState {
  agent: Agent
  currentTask: Task | null
  status: 'idle' | 'working' | 'error' | 'complete'
  progress: number
  eta: string | null
  lastMessage: string
  logs: WorkStatusEvent[]
  startedAt: string | null
}

// ---- ETA Calculation ----
function calculateETA(progress: number, startedAt: string | null): string | null {
  if (!startedAt || progress <= 0 || progress >= 100) return null
  const elapsed = Date.now() - new Date(startedAt).getTime()
  const estimatedTotal = elapsed / (progress / 100)
  const remaining = estimatedTotal - elapsed
  if (remaining < 60000) return '< 1 min'
  if (remaining < 3600000) return `~${Math.ceil(remaining / 60000)} min`
  return `~${Math.round(remaining / 3600000 * 10) / 10} hr`
}

// ---- Simulated Events (fallback when no real SSE) ----
function generateSimulatedEvents(agents: Agent[], tasks: Task[]): AgentWorkState[] {
  return agents.map(agent => {
    const agentTasks = tasks.filter(t => t.agent_id === agent.id)
    const activeTasks = agentTasks.filter(t => t.status === 'in_progress')
    const reviewTasks = agentTasks.filter(t => t.status === 'review')
    const currentTask = activeTasks[0] || reviewTasks[0] || null

    let status: AgentWorkState['status'] = 'idle'
    let progress = 0
    let lastMessage = 'Waiting for assignment...'
    let startedAt: string | null = null

    if (agent.status === 'blocked') {
      status = 'error'
      lastMessage = '⚠ Blocked — waiting for input'
    } else if (currentTask) {
      if (currentTask.status === 'in_progress') {
        status = 'working'
        progress = currentTask.progress || Math.floor(Math.random() * 70) + 10
        startedAt = currentTask.updated_at
        lastMessage = `Working on: ${currentTask.title}`
      } else if (currentTask.status === 'review') {
        status = 'complete'
        progress = 100
        lastMessage = `Ready for review: ${currentTask.title}`
      }
    }

    return {
      agent,
      currentTask,
      status,
      progress,
      eta: calculateETA(progress, startedAt),
      lastMessage,
      logs: [],
      startedAt,
    }
  })
}

// ---- Terminal Log Line ----
function LogLine({ event, agentName }: { event: WorkStatusEvent; agentName: string }) {
  const time = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const typeColors: Record<string, string> = {
    start: 'text-blue-400',
    progress: 'text-cyan-400',
    log: 'text-gray-400',
    error: 'text-red-400',
    complete: 'text-emerald-400',
    idle: 'text-gray-600',
  }

  return (
    <div className="flex gap-2 text-xs font-mono leading-relaxed">
      <span className="text-gray-600 flex-shrink-0">{time}</span>
      <span className={`flex-shrink-0 ${typeColors[event.event_type] || 'text-gray-400'}`}>
        [{event.event_type.toUpperCase().padEnd(8)}]
      </span>
      <span className="text-violet-400 flex-shrink-0">{agentName}:</span>
      <span className="text-gray-300">{event.message}</span>
    </div>
  )
}

// ---- Agent Status Row ----
function AgentStatusRow({ state, onClick, isSelected }: {
  state: AgentWorkState
  onClick: () => void
  isSelected: boolean
}) {
  const statusConfig = {
    idle: { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Idle' },
    working: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Working' },
    error: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Blocked' },
    complete: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Done' },
  }

  const config = statusConfig[state.status]
  const Icon = config.icon

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-500/10 border border-blue-500/25'
          : 'bg-gray-800/30 border border-transparent hover:bg-gray-800/50 hover:border-gray-700'
      }`}
    >
      {/* Agent Avatar */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: state.agent.avatar_color }}
      >
        {state.agent.name.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{state.agent.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${config.bg} ${config.color} border border-current/20 flex items-center gap-1`}>
            <Icon className={`w-3 h-3 ${state.status === 'working' ? 'animate-spin' : ''}`} />
            {config.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{state.lastMessage}</p>
      </div>

      {/* Progress */}
      {state.status === 'working' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {state.eta && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {state.eta}
            </span>
          )}
          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full progress-bar-animated transition-all duration-1000"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <span className="text-xs text-blue-400 font-mono w-8 text-right">{state.progress}%</span>
        </div>
      )}
    </div>
  )
}

// ---- Main Component ----

export default function LiveWorkStatus() {
  const [expanded, setExpanded] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [agentStates, setAgentStates] = useState<AgentWorkState[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [terminalLogs, setTerminalLogs] = useState<WorkStatusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Fetch data and build states
  const fetchData = useCallback(async () => {
    const [agentsRes, tasksRes, eventsRes] = await Promise.all([
      supabase.from('agents').select('*').order('name'),
      supabase.from('tasks').select('*, agent:agents(*), project:projects(*)').order('created_at', { ascending: false }),
      supabase.from('work_status_events').select('*').order('created_at', { ascending: false }).limit(100)
        .then(res => res)
        .catch(() => ({ data: null, error: null })),
    ])

    const agents = agentsRes.data || []
    const tasks = tasksRes.data || []
    const events = (eventsRes as any)?.data || []

    // Build states from real events if available, otherwise simulate
    const states = generateSimulatedEvents(agents, tasks)

    // Merge real events into states
    if (events.length > 0) {
      for (const state of states) {
        const agentEvents = events.filter((e: WorkStatusEvent) => e.agent_id === state.agent.id)
        state.logs = agentEvents.slice(0, 50)
        const latestProgress = agentEvents.find((e: WorkStatusEvent) => e.event_type === 'progress')
        if (latestProgress) {
          state.progress = latestProgress.progress || state.progress
          state.lastMessage = latestProgress.message || state.lastMessage
        }
      }
    }

    setAgentStates(states)

    // Global terminal logs — combine real events + generate simulated lines
    const allLogs: WorkStatusEvent[] = events.length > 0
      ? events.slice(0, 50)
      : generateTerminalLogs(agents, tasks)

    setTerminalLogs(allLogs)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLogs])

  // Subscribe to real-time inserts
  useEffect(() => {
    const channel = supabase
      .channel('work-status-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'work_status_events' }, (payload) => {
        const event = payload.new as WorkStatusEvent
        setTerminalLogs(prev => [...prev.slice(-99), event])
        // Update agent state
        setAgentStates(prev => prev.map(s => {
          if (s.agent.id !== event.agent_id) return s
          return {
            ...s,
            progress: event.progress ?? s.progress,
            lastMessage: event.message,
            status: event.event_type === 'error' ? 'error'
              : event.event_type === 'complete' ? 'complete'
              : event.event_type === 'start' ? 'working'
              : s.status,
            logs: [...s.logs.slice(-49), event],
          }
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const workingCount = agentStates.filter(s => s.status === 'working').length
  const selectedState = selectedAgent ? agentStates.find(s => s.agent.id === selectedAgent) : null
  const displayLogs = selectedState ? selectedState.logs : terminalLogs

  const wrapperClass = fullscreen
    ? 'fixed inset-0 z-50 bg-gray-950 flex flex-col'
    : 'mb-8'

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none mb-3"
        onClick={() => !fullscreen && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center relative">
            <Activity className="w-4 h-4 text-blue-400" />
            {workingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse-dot">
                {workingCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Live Work Status
              {workingCount > 0 && (
                <span className="text-xs font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {workingCount} active
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500">Real-time agent progress &amp; terminal view</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreen(!fullscreen) }}
            className="text-gray-500 hover:text-white transition-colors p-1"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {!fullscreen && (
            <button className="text-gray-500 hover:text-white transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {(expanded || fullscreen) && (
        <div className={`${fullscreen ? 'flex-1 flex flex-col overflow-hidden p-4 pt-0' : ''} animate-fade-in`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : (
            <div className={`${fullscreen ? 'flex-1 flex flex-col md:flex-row gap-4 overflow-hidden' : 'space-y-4'}`}>
              {/* Agent Status List */}
              <div className={`${fullscreen ? 'w-full md:w-80 overflow-y-auto' : ''} space-y-1.5`}>
                {/* "All" button for terminal */}
                <button
                  onClick={() => setSelectedAgent(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    !selectedAgent
                      ? 'bg-violet-500/10 border border-violet-500/25 text-violet-400'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent hover:bg-gray-800/30'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  All Agents Feed
                  <Zap className="w-3 h-3 ml-auto" />
                </button>

                {agentStates.map(state => (
                  <AgentStatusRow
                    key={state.agent.id}
                    state={state}
                    onClick={() => setSelectedAgent(
                      selectedAgent === state.agent.id ? null : state.agent.id
                    )}
                    isSelected={selectedAgent === state.agent.id}
                  />
                ))}
              </div>

              {/* Terminal View */}
              <div className={`${fullscreen ? 'flex-1 flex flex-col overflow-hidden' : ''}`}>
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-950 border border-gray-800 rounded-t-xl">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono ml-2">
                    {selectedState
                      ? `${selectedState.agent.name.toLowerCase()}@ceo-dashboard ~ work-log`
                      : 'all-agents@ceo-dashboard ~ live-feed'
                    }
                  </span>
                  {selectedState && selectedState.status === 'working' && (
                    <span className="ml-auto text-xs text-blue-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-dot" />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Terminal Body */}
                <div
                  ref={terminalRef}
                  className={`bg-gray-950/90 border border-t-0 border-gray-800 rounded-b-xl p-3 overflow-y-auto font-mono ${
                    fullscreen ? 'flex-1' : 'max-h-64'
                  }`}
                >
                  {displayLogs.length === 0 ? (
                    <div className="text-xs text-gray-600 py-4 text-center">
                      <Terminal className="w-5 h-5 mx-auto mb-2 opacity-30" />
                      No activity logs yet. Events will appear here in real-time.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {displayLogs.map((event, i) => {
                        const agent = agentStates.find(s => s.agent.id === event.agent_id)
                        return (
                          <LogLine
                            key={event.id || `log-${i}`}
                            event={event}
                            agentName={agent?.agent.name || 'unknown'}
                          />
                        )
                      })}
                      {/* Blinking cursor */}
                      <div className="flex gap-2 text-xs">
                        <span className="text-emerald-500 animate-pulse">▊</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Agent Detail Bar */}
                {selectedState && selectedState.status === 'working' && (
                  <div className="mt-2 flex items-center gap-4 px-3 py-2.5 bg-gray-900/80 border border-gray-800 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-400">
                          {selectedState.currentTask?.title || 'Working...'}
                        </span>
                        <span className="text-xs text-blue-400 font-mono">{selectedState.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full progress-bar-animated transition-all duration-1000"
                          style={{ width: `${selectedState.progress}%` }}
                        />
                      </div>
                    </div>
                    {selectedState.eta && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        ETA: {selectedState.eta}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Generate Simulated Terminal Logs ----
function generateTerminalLogs(agents: Agent[], tasks: Task[]): WorkStatusEvent[] {
  const logs: WorkStatusEvent[] = []
  const now = Date.now()

  for (const agent of agents) {
    const agentTasks = tasks.filter(t => t.agent_id === agent.id)
    const activeTasks = agentTasks.filter(t => t.status === 'in_progress')
    const reviewTasks = agentTasks.filter(t => t.status === 'review')
    const completedTasks = agentTasks.filter(t => t.status === 'approved')

    // Generate log entries from task data
    for (const task of completedTasks.slice(0, 2)) {
      logs.push({
        id: `sim-complete-${task.id}`,
        agent_id: agent.id,
        task_id: task.id,
        event_type: 'complete',
        message: `✓ Completed: ${task.title}`,
        progress: 100,
        metadata: null,
        created_at: task.updated_at,
      })
    }

    for (const task of reviewTasks.slice(0, 2)) {
      logs.push({
        id: `sim-review-${task.id}`,
        agent_id: agent.id,
        task_id: task.id,
        event_type: 'complete',
        message: `Ready for review: ${task.title}`,
        progress: 100,
        metadata: null,
        created_at: task.updated_at,
      })
    }

    for (const task of activeTasks.slice(0, 2)) {
      const progress = task.progress || Math.floor(Math.random() * 60) + 20
      logs.push({
        id: `sim-start-${task.id}`,
        agent_id: agent.id,
        task_id: task.id,
        event_type: 'start',
        message: `Started: ${task.title}`,
        progress: 0,
        metadata: null,
        created_at: task.created_at,
      })
      logs.push({
        id: `sim-progress-${task.id}`,
        agent_id: agent.id,
        task_id: task.id,
        event_type: 'progress',
        message: `Working on: ${task.title} (${progress}%)`,
        progress,
        metadata: null,
        created_at: new Date(now - Math.random() * 300000).toISOString(),
      })
    }

    if (agent.status === 'blocked') {
      logs.push({
        id: `sim-blocked-${agent.id}`,
        agent_id: agent.id,
        task_id: null,
        event_type: 'error',
        message: '⚠ Agent blocked — awaiting input or dependency',
        progress: null,
        metadata: null,
        created_at: new Date(now - 60000).toISOString(),
      })
    }

    if (activeTasks.length === 0 && reviewTasks.length === 0 && agent.status !== 'blocked') {
      logs.push({
        id: `sim-idle-${agent.id}`,
        agent_id: agent.id,
        task_id: null,
        event_type: 'idle',
        message: 'Idle — awaiting task assignment',
        progress: null,
        metadata: null,
        created_at: new Date(now - 120000).toISOString(),
      })
    }
  }

  // Sort by time
  logs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return logs
}
