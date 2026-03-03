'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Agent, Project } from '@/types'
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Keyboard,
} from 'lucide-react'

// ---- NLP Parsing Engine ----

interface ParsedTask {
  title: string
  agentName: string | null
  agentId: string | null
  priority: 'high' | 'medium' | 'low'
  projectName: string | null
  projectId: string | null
  confidence: number
  rawInput: string
}

const AGENT_KEYWORDS: Record<string, string[]> = {
  // Common agent roles → matched against agent name/role
  marketer: ['marketer', 'marketing', 'social media', 'content', 'seo', 'ads'],
  developer: ['developer', 'dev', 'engineer', 'coder', 'code', 'build', 'implement', 'fix bug'],
  designer: ['designer', 'design', 'ui', 'ux', 'mockup', 'wireframe', 'figma'],
  writer: ['writer', 'write', 'blog', 'article', 'copy', 'copywriter'],
  analyst: ['analyst', 'analyze', 'data', 'report', 'metrics', 'analytics'],
  mike: ['mike', 'assistant', 'ai', 'agent'],
}

const PRIORITY_KEYWORDS = {
  high: ['urgent', 'asap', 'critical', 'immediately', 'right now', 'high priority', 'important', 'emergency', 'rush'],
  low: ['whenever', 'low priority', 'not urgent', 'when you can', 'no rush', 'eventually', 'sometime'],
}

function parseNaturalLanguage(input: string, agents: Agent[], projects: Project[]): ParsedTask {
  const lower = input.toLowerCase().trim()
  let confidence = 0.5
  let detectedAgentName: string | null = null
  let detectedAgentId: string | null = null
  let detectedPriority: 'high' | 'medium' | 'low' = 'medium'
  let detectedProjectName: string | null = null
  let detectedProjectId: string | null = null
  let title = input.trim()

  // --- Agent Detection ---
  // 1. Direct match: "AgentName: task" or "AgentName, task"
  for (const agent of agents) {
    const nameLower = agent.name.toLowerCase()
    const colonPattern = new RegExp(`^${nameLower}[:\\s,]+(.+)`, 'i')
    const match = input.match(colonPattern)
    if (match) {
      detectedAgentName = agent.name
      detectedAgentId = agent.id
      title = match[1].trim()
      confidence += 0.3
      break
    }
  }

  // 2. Role-based match: "tell the marketer to..."
  if (!detectedAgentId) {
    for (const agent of agents) {
      const roleLower = agent.role.toLowerCase()
      const nameLower = agent.name.toLowerCase()
      // Check if agent name or role keywords appear
      const allKeywords = [nameLower, roleLower]
      // Also check generic role keywords
      for (const [, keywords] of Object.entries(AGENT_KEYWORDS)) {
        if (keywords.some(k => nameLower.includes(k) || roleLower.includes(k))) {
          allKeywords.push(...keywords)
        }
      }
      for (const kw of allKeywords) {
        if (lower.includes(kw)) {
          detectedAgentName = agent.name
          detectedAgentId = agent.id
          confidence += 0.2
          // Clean agent reference from title
          title = title.replace(new RegExp(`\\b${kw}\\b[:\\s,]*`, 'gi'), '').trim()
          break
        }
      }
      if (detectedAgentId) break
    }
  }

  // 3. "assign to X" / "for X" pattern
  if (!detectedAgentId) {
    const assignPattern = /(?:assign(?:\s+(?:it|this))?\s+to|for)\s+(\w+)/i
    const assignMatch = input.match(assignPattern)
    if (assignMatch) {
      const target = assignMatch[1].toLowerCase()
      const matchedAgent = agents.find(a =>
        a.name.toLowerCase() === target || a.role.toLowerCase().includes(target)
      )
      if (matchedAgent) {
        detectedAgentName = matchedAgent.name
        detectedAgentId = matchedAgent.id
        confidence += 0.25
        title = title.replace(assignPattern, '').trim()
      }
    }
  }

  // --- Priority Detection ---
  for (const kw of PRIORITY_KEYWORDS.high) {
    if (lower.includes(kw)) {
      detectedPriority = 'high'
      confidence += 0.1
      title = title.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '').trim()
      break
    }
  }
  if (detectedPriority === 'medium') {
    for (const kw of PRIORITY_KEYWORDS.low) {
      if (lower.includes(kw)) {
        detectedPriority = 'low'
        confidence += 0.05
        title = title.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '').trim()
        break
      }
    }
  }

  // --- Project Detection ---
  for (const project of projects) {
    if (lower.includes(project.name.toLowerCase())) {
      detectedProjectName = project.name
      detectedProjectId = project.id
      confidence += 0.1
      break
    }
  }

  // Clean up title
  title = title
    .replace(/^(tell|ask|have|get|make)\s+(the\s+)?/i, '')
    .replace(/\s+to\s+$/i, '')
    .replace(/^\s*[,:\-]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }

  // Confidence adjustments
  if (title.length > 5) confidence += 0.1
  if (detectedAgentId && title.length > 10) confidence += 0.1
  confidence = Math.min(confidence, 1.0)

  return {
    title,
    agentName: detectedAgentName,
    agentId: detectedAgentId,
    priority: detectedPriority,
    projectName: detectedProjectName,
    projectId: detectedProjectId,
    confidence: Math.round(confidence * 100) / 100,
    rawInput: input,
  }
}

// ---- Component ----

export default function VoiceTaskCreator() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'voice' | 'text'>('text')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [textInput, setTextInput] = useState('')
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check speech support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSpeechSupported(!!SpeechRecognition)
  }, [])

  // Fetch agents + projects when panel opens
  useEffect(() => {
    if (!isOpen) return
    const fetch = async () => {
      const [agentsRes, projectsRes] = await Promise.all([
        supabase.from('agents').select('*').order('name'),
        supabase.from('projects').select('*').eq('status', 'active').order('name'),
      ])
      if (agentsRes.data) setAgents(agentsRes.data)
      if (projectsRes.data) setProjects(projectsRes.data)
    }
    fetch()
  }, [isOpen])

  // Auto-focus text input
  useEffect(() => {
    if (isOpen && mode === 'text' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, mode])

  // Parse on transcript/text change
  useEffect(() => {
    const input = mode === 'voice' ? transcript : textInput
    if (input.trim().length > 2 && agents.length > 0) {
      const parsed = parseNaturalLanguage(input, agents, projects)
      setParsedTask(parsed)
    } else {
      setParsedTask(null)
    }
  }, [transcript, textInput, mode, agents, projects])

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += t
        } else {
          interimTranscript += t
        }
      }
      setTranscript(finalTranscript || interimTranscript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error)
      if (event.error !== 'no-speech') {
        setError(`Speech error: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setError(null)
    setTranscript('')
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const handleCreate = async () => {
    if (!parsedTask || !parsedTask.title) return
    setCreating(true)
    setError(null)

    try {
      const { error: insertErr } = await supabase.from('tasks').insert({
        title: parsedTask.title,
        agent_id: parsedTask.agentId,
        priority: parsedTask.priority,
        project_id: parsedTask.projectId,
        status: 'todo',
      })

      if (insertErr) throw insertErr

      // Create notification
      await supabase.from('notifications').insert({
        message: `🎙️ Voice task created: "${parsedTask.title}"${parsedTask.agentName ? ` → ${parsedTask.agentName}` : ''}`,
        type: 'success',
      })

      setCreated(true)
      setTimeout(() => {
        setCreated(false)
        setTranscript('')
        setTextInput('')
        setParsedTask(null)
        setIsOpen(false)
        window.location.reload()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const handleOverride = (field: string, value: string) => {
    if (!parsedTask) return
    const updated = { ...parsedTask }
    if (field === 'agent') {
      const agent = agents.find(a => a.id === value)
      updated.agentId = value || null
      updated.agentName = agent?.name || null
    } else if (field === 'priority') {
      updated.priority = value as 'high' | 'medium' | 'low'
    } else if (field === 'project') {
      const project = projects.find(p => p.id === value)
      updated.projectId = value || null
      updated.projectName = project?.name || null
    } else if (field === 'title') {
      updated.title = value
    }
    setParsedTask(updated)
  }

  const reset = () => {
    setTranscript('')
    setTextInput('')
    setParsedTask(null)
    setError(null)
    setCreated(false)
  }

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    if (c >= 0.5) return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
    return 'text-red-400 bg-red-500/15 border-red-500/30'
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 z-50"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
        }}
        title="Voice/Smart Task Creator"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg animate-fade-in-scale overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Smart Task Creator</h2>
              <p className="text-xs text-gray-500">Voice or text → auto-parsed task</p>
            </div>
          </div>
          <button onClick={() => { setIsOpen(false); reset() }} className="text-gray-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-4 pb-0">
          <button
            onClick={() => { setMode('text'); reset() }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              mode === 'text'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'bg-gray-800/50 text-gray-500 border border-gray-700 hover:text-gray-300'
            }`}
          >
            <Keyboard className="w-4 h-4" /> Type Command
          </button>
          <button
            onClick={() => { setMode('voice'); reset() }}
            disabled={!speechSupported}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              mode === 'voice'
                ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                : 'bg-gray-800/50 text-gray-500 border border-gray-700 hover:text-gray-300'
            } ${!speechSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Mic className="w-4 h-4" /> Voice Input
          </button>
        </div>

        {/* Input Area */}
        <div className="p-4">
          {mode === 'text' ? (
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && parsedTask) handleCreate()
                }}
                placeholder='Try: "Marketer: create 5 social posts" or "urgent fix the homepage bug"'
                className="w-full px-4 py-3.5 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 text-sm pr-10"
              />
              {textInput && (
                <button
                  onClick={() => { setTextInput(''); setParsedTask(null) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500/20 border-2 border-red-500 animate-pulse-dot'
                    : 'bg-violet-500/15 border-2 border-violet-500/40 hover:border-violet-500 hover:bg-violet-500/25'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8 text-red-400" />
                ) : (
                  <Mic className="w-8 h-8 text-violet-400" />
                )}
              </button>
              <p className="text-sm text-gray-500">
                {isListening ? (
                  <span className="text-red-400 font-medium">Listening... tap to stop</span>
                ) : (
                  'Tap to speak your task'
                )}
              </p>
              {transcript && (
                <div className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-xl">
                  <p className="text-sm text-gray-300 italic">&quot;{transcript}&quot;</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Parsed Result */}
        {parsedTask && (
          <div className="px-4 pb-4 animate-fade-in">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
              {/* Confidence Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Parsed Result</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${confidenceColor(parsedTask.confidence)}`}>
                  {Math.round(parsedTask.confidence * 100)}% confidence
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">Task</label>
                <input
                  type="text"
                  value={parsedTask.title}
                  onChange={(e) => handleOverride('title', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Agent + Priority Row */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">
                    Agent
                    {parsedTask.agentName && (
                      <span className="text-violet-400 ml-1">• auto-detected</span>
                    )}
                  </label>
                  <select
                    value={parsedTask.agentId || ''}
                    onChange={(e) => handleOverride('agent', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-xs text-gray-500 block mb-1">Priority</label>
                  <select
                    value={parsedTask.priority}
                    onChange={(e) => handleOverride('priority', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>

              {/* Expandable Details */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? 'Less' : 'More options'}
              </button>

              {showDetails && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Project</label>
                    <select
                      value={parsedTask.projectId || ''}
                      onChange={(e) => handleOverride('project', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="">No project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-gray-600 bg-gray-900/40 rounded-lg p-2.5">
                    <span className="text-gray-500 font-medium">Raw input:</span> {parsedTask.rawInput}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 pt-0">
          {created ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 font-medium animate-fade-in">
              <Check className="w-5 h-5" /> Task Created!
            </div>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating || !parsedTask?.title}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: parsedTask?.title
                  ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
                  : undefined,
                backgroundColor: parsedTask?.title ? undefined : 'rgb(31, 41, 55)',
                color: parsedTask?.title ? 'white' : 'rgb(107, 114, 128)',
              }}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Create Task
                </>
              )}
            </button>
          )}
        </div>

        {/* Hints */}
        <div className="px-4 pb-4">
          <div className="text-xs text-gray-600 space-y-0.5">
            <p>💡 <strong>Examples:</strong></p>
            <p className="text-gray-500">&quot;Marketer: create 5 social posts for launch&quot;</p>
            <p className="text-gray-500">&quot;urgent fix the payment bug assign to developer&quot;</p>
            <p className="text-gray-500">&quot;designer mockup new landing page low priority&quot;</p>
          </div>
        </div>
      </div>
    </div>
  )
}
