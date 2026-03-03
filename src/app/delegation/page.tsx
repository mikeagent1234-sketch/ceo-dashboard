'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DelegationRule, DecisionLog } from '@/types'
import {
  Shield,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Zap,
  AlertTriangle,
  DollarSign,
  Palette,
  Code,
  Settings,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Lightbulb,
  History,
} from 'lucide-react'

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; description: string }> = {
  budget: {
    label: 'Budget',
    icon: DollarSign,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    description: 'Financial decisions up to threshold amount',
  },
  design: {
    label: 'Design',
    icon: Palette,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    description: 'UI/UX and visual design choices',
  },
  tech: {
    label: 'Tech',
    icon: Code,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    description: 'Technical architecture and tooling decisions',
  },
  custom: {
    label: 'Custom',
    icon: Settings,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    description: 'Custom delegation rules',
  },
}

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  auto_approved: { label: 'Auto-approved', color: 'text-emerald-400', icon: CheckCircle2 },
  escalated: { label: 'Escalated', color: 'text-yellow-400', icon: ArrowUpRight },
  manual: { label: 'Manual', color: 'text-blue-400', icon: FileText },
}

// Recommended rules that can be one-click added
const RECOMMENDED_RULES = [
  {
    name: 'Small purchases under $50',
    category: 'budget' as const,
    threshold: 50,
    auto_proceed: true,
    escalation_condition: 'Over $50 or recurring subscription',
  },
  {
    name: 'Color and font choices',
    category: 'design' as const,
    threshold: null,
    auto_proceed: true,
    escalation_condition: 'Brand identity changes or logo modifications',
  },
  {
    name: 'Library/package selection',
    category: 'tech' as const,
    threshold: null,
    auto_proceed: true,
    escalation_condition: 'Major framework changes or paid services',
  },
  {
    name: 'Bug fixes and hotfixes',
    category: 'tech' as const,
    threshold: null,
    auto_proceed: true,
    escalation_condition: 'Data loss risk or breaking changes to API',
  },
  {
    name: 'Copy and content edits',
    category: 'design' as const,
    threshold: null,
    auto_proceed: true,
    escalation_condition: 'Legal text, pricing pages, or public announcements',
  },
]

interface RuleFormData {
  name: string
  category: 'budget' | 'design' | 'tech' | 'custom'
  threshold: string
  auto_proceed: boolean
  escalation_condition: string
}

const emptyForm: RuleFormData = {
  name: '',
  category: 'custom',
  threshold: '',
  auto_proceed: false,
  escalation_condition: '',
}

export default function DelegationPage() {
  const [rules, setRules] = useState<DelegationRule[]>([])
  const [decisions, setDecisions] = useState<DecisionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RuleFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [showLog, setShowLog] = useState(true)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [tab, setTab] = useState<'rules' | 'log'>('rules')

  const fetchData = useCallback(async () => {
    const [rulesRes, decisionsRes] = await Promise.all([
      supabase.from('delegation_rules').select('*').order('created_at', { ascending: false }),
      supabase.from('decision_log').select('*, rule:delegation_rules(*)').order('created_at', { ascending: false }).limit(50),
    ])
    setRules(rulesRes.data || [])
    setDecisions(decisionsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      category: form.category,
      threshold: form.threshold ? parseFloat(form.threshold) : null,
      auto_proceed: form.auto_proceed,
      escalation_condition: form.escalation_condition.trim() || null,
    }

    if (editingId) {
      await supabase.from('delegation_rules').update(payload).eq('id', editingId)
    } else {
      await supabase.from('delegation_rules').insert(payload)
    }

    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
    setSaving(false)
    fetchData()
  }

  const handleEdit = (rule: DelegationRule) => {
    setForm({
      name: rule.name,
      category: rule.category,
      threshold: rule.threshold?.toString() || '',
      auto_proceed: rule.auto_proceed,
      escalation_condition: rule.escalation_condition || '',
    })
    setEditingId(rule.id)
    setShowForm(true)
    setTab('rules')
  }

  const handleDelete = async (id: string) => {
    await supabase.from('delegation_rules').delete().eq('id', id)
    fetchData()
  }

  const handleToggleAutoProceed = async (rule: DelegationRule) => {
    await supabase.from('delegation_rules').update({ auto_proceed: !rule.auto_proceed }).eq('id', rule.id)
    fetchData()
  }

  const handleAddRecommended = async (rec: typeof RECOMMENDED_RULES[0]) => {
    // Check if already exists
    const existing = rules.find(r => r.name === rec.name)
    if (existing) return

    await supabase.from('delegation_rules').insert({
      name: rec.name,
      category: rec.category,
      threshold: rec.threshold,
      auto_proceed: rec.auto_proceed,
      escalation_condition: rec.escalation_condition,
    })
    fetchData()
  }

  const handleLogDecision = async (ruleId: string | null, decision: string, context: string, outcome: string) => {
    await supabase.from('decision_log').insert({
      rule_id: ruleId,
      decision,
      context,
      outcome,
    })
    fetchData()
  }

  // Stats
  const autoApprovedCount = decisions.filter(d => d.outcome === 'auto_approved').length
  const escalatedCount = decisions.filter(d => d.outcome === 'escalated').length
  const activeRules = rules.filter(r => r.auto_proceed).length
  const totalRules = rules.length

  // Group rules by category
  const rulesByCategory = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = []
    acc[rule.category].push(rule)
    return acc
  }, {} as Record<string, DelegationRule[]>)

  // Recommendations not yet added
  const availableRecommendations = RECOMMENDED_RULES.filter(
    rec => !rules.find(r => r.name === rec.name)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Delegation Rules</h1>
            <p className="text-gray-500">Configure decision thresholds and auto-proceed logic</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900/80 border border-indigo-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-gray-500">Total Rules</span>
          </div>
          <p className="text-2xl font-bold text-indigo-400">{totalRules}</p>
        </div>
        <div className="bg-gray-900/80 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500">Auto-proceed</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{activeRules}</p>
        </div>
        <div className="bg-gray-900/80 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500">Auto-approved</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{autoApprovedCount}</p>
        </div>
        <div className="bg-gray-900/80 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-500">Escalated</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{escalatedCount}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'rules'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Rules Configuration
          </div>
        </button>
        <button
          onClick={() => setTab('log')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'log'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Decision Audit Log
            {decisions.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
                {decisions.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Rules Tab */}
      {tab === 'rules' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setForm(emptyForm)
                setEditingId(null)
                setShowForm(!showForm)
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
            {availableRecommendations.length > 0 && (
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
              >
                <Lightbulb className="w-4 h-4" />
                Recommendations ({availableRecommendations.length})
              </button>
            )}
          </div>

          {/* Recommendations Panel */}
          {showRecommendations && availableRecommendations.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-300">Context-Aware Recommendations</h3>
                <span className="text-xs text-gray-500 ml-2">Based on CEO workflow patterns</span>
              </div>
              <div className="space-y-2">
                {availableRecommendations.map((rec, idx) => {
                  const catConfig = CATEGORY_CONFIG[rec.category]
                  const CatIcon = catConfig.icon
                  return (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg border border-gray-800/50 hover:border-amber-500/20 transition-all">
                      <CatIcon className={`w-4 h-4 ${catConfig.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{rec.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          Escalate: {rec.escalation_condition}
                          {rec.threshold && <span className="ml-2 text-emerald-400">(${rec.threshold} limit)</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddRecommended(rec)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all flex-shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Create/Edit Form */}
          {showForm && (
            <div className="bg-gray-900/80 border border-indigo-500/20 rounded-xl p-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-white mb-4">
                {editingId ? 'Edit Rule' : 'New Delegation Rule'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">Rule Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Small purchases under $100"
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                      const Icon = config.icon
                      const isActive = form.category === key
                      return (
                        <button
                          key={key}
                          onClick={() => setForm({ ...form, category: key as any })}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                            isActive
                              ? `${config.bg} ${config.color}`
                              : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {config.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Threshold */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Decision Threshold {form.category === 'budget' ? '($)' : '(optional)'}
                  </label>
                  <input
                    type="number"
                    value={form.threshold}
                    onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                    placeholder={form.category === 'budget' ? '100' : 'Leave empty if N/A'}
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {form.category === 'budget'
                      ? 'Max dollar amount for auto-approval'
                      : 'Numeric threshold for this rule type'}
                  </p>
                </div>

                {/* Escalation Condition */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">Escalation Condition</label>
                  <textarea
                    value={form.escalation_condition}
                    onChange={(e) => setForm({ ...form, escalation_condition: e.target.value })}
                    placeholder="When should this be escalated to Sebastian? e.g., 'Over $100 or involves recurring subscription'"
                    rows={2}
                    className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                {/* Auto-proceed toggle */}
                <div className="md:col-span-2 flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-white">Auto-proceed</p>
                    <p className="text-xs text-gray-500">
                      When enabled, decisions matching this rule proceed without Sebastian&apos;s approval
                    </p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, auto_proceed: !form.auto_proceed })}
                    className={`transition-colors ${form.auto_proceed ? 'text-emerald-400' : 'text-gray-600'}`}
                  >
                    {form.auto_proceed ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-800">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? 'Update Rule' : 'Create Rule'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setForm(emptyForm)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rules by Category */}
          {totalRules === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No delegation rules yet</p>
              <p className="text-sm mt-1">Create rules to define what Mike can auto-approve</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(CATEGORY_CONFIG).map(([catKey, catConfig]) => {
                const catRules = rulesByCategory[catKey]
                if (!catRules || catRules.length === 0) return null
                const CatIcon = catConfig.icon

                return (
                  <div key={catKey} className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
                    {/* Category Header */}
                    <div className={`flex items-center gap-3 px-5 py-3 border-b border-gray-800 ${catConfig.bg}`}>
                      <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
                      <div>
                        <span className={`text-sm font-semibold ${catConfig.color}`}>{catConfig.label}</span>
                        <span className="text-xs text-gray-500 ml-2">{catConfig.description}</span>
                      </div>
                      <span className="ml-auto text-xs text-gray-500">{catRules.length} rule{catRules.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Rules */}
                    <div className="divide-y divide-gray-800/50">
                      {catRules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/20 transition-colors group">
                          {/* Auto-proceed toggle */}
                          <button
                            onClick={() => handleToggleAutoProceed(rule)}
                            className={`flex-shrink-0 transition-colors ${rule.auto_proceed ? 'text-emerald-400' : 'text-gray-700 hover:text-gray-500'}`}
                            title={rule.auto_proceed ? 'Auto-proceed ON' : 'Auto-proceed OFF'}
                          >
                            {rule.auto_proceed ? (
                              <ToggleRight className="w-6 h-6" />
                            ) : (
                              <ToggleLeft className="w-6 h-6" />
                            )}
                          </button>

                          {/* Rule info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{rule.name}</span>
                              {rule.auto_proceed && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                                  AUTO
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {rule.threshold !== null && (
                                <span className="text-xs text-emerald-400 font-medium">
                                  ${rule.threshold.toLocaleString()} threshold
                                </span>
                              )}
                              {rule.escalation_condition && (
                                <span className="text-xs text-gray-500 truncate">
                                  <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-500" />
                                  Escalate: {rule.escalation_condition}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => handleEdit(rule)}
                              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all"
                              title="Edit rule"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Decision Audit Log Tab */}
      {tab === 'log' && (
        <div>
          {decisions.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No decisions logged yet</p>
              <p className="text-sm mt-1">Decisions will appear here as rules are triggered</p>
            </div>
          ) : (
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Decision</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Rule</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Context</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Outcome</th>
                    <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d) => {
                    const outcome = OUTCOME_CONFIG[d.outcome] || OUTCOME_CONFIG.manual
                    const OutcomeIcon = outcome.icon
                    return (
                      <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-white max-w-[200px] truncate">{d.decision}</td>
                        <td className="px-4 py-3">
                          {d.rule ? (
                            <span className="text-xs text-indigo-400">{d.rule.name}</span>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                          {d.context || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-xs ${outcome.color}`}>
                            <OutcomeIcon className="w-3 h-3" />
                            {outcome.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(d.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
