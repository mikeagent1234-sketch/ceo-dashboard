import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Seed default delegation rules
  const defaultRules = [
    {
      name: 'Small purchases under $100',
      category: 'budget',
      threshold: 100,
      auto_proceed: true,
      escalation_condition: 'Over $100 or recurring subscription commitments',
    },
    {
      name: 'Design system component choices',
      category: 'design',
      threshold: null,
      auto_proceed: true,
      escalation_condition: 'Brand identity changes, logo modifications, or public-facing redesigns',
    },
    {
      name: 'Tech stack minor decisions',
      category: 'tech',
      threshold: null,
      auto_proceed: true,
      escalation_condition: 'Major framework changes, paid service integrations, or architecture overhauls',
    },
    {
      name: 'Bug fixes and hotfixes',
      category: 'tech',
      threshold: null,
      auto_proceed: true,
      escalation_condition: 'Data loss risk, breaking API changes, or security vulnerabilities',
    },
    {
      name: 'Content and copy updates',
      category: 'design',
      threshold: null,
      auto_proceed: true,
      escalation_condition: 'Legal text, pricing changes, or public announcements',
    },
    {
      name: 'Infrastructure scaling',
      category: 'budget',
      threshold: 50,
      auto_proceed: false,
      escalation_condition: 'Any cost increase over $50/month or new service subscriptions',
    },
  ]

  // Seed sample decision log entries
  const { data: rulesData, error: rulesError } = await supabase
    .from('delegation_rules')
    .upsert(defaultRules, { onConflict: 'name' })
    .select()

  if (rulesError) {
    // If upsert fails (no unique constraint on name), try insert
    const { data: insertedRules } = await supabase
      .from('delegation_rules')
      .insert(defaultRules)
      .select()

    if (insertedRules && insertedRules.length > 0) {
      // Add sample decision log
      const sampleDecisions = [
        {
          rule_id: insertedRules[0].id,
          decision: 'Purchased Vercel Pro plan for staging',
          context: '$20/month - within budget threshold',
          outcome: 'auto_approved',
        },
        {
          rule_id: insertedRules[2].id,
          decision: 'Switched from Axios to native fetch',
          context: 'Minor tech decision, no breaking changes',
          outcome: 'auto_approved',
        },
        {
          rule_id: insertedRules[3].id,
          decision: 'Fixed auth token refresh race condition',
          context: 'Critical bug, no data loss risk',
          outcome: 'auto_approved',
        },
        {
          rule_id: insertedRules[0].id,
          decision: 'Annual domain renewal for 3 domains',
          context: '$156 total - exceeds $100 threshold',
          outcome: 'escalated',
        },
        {
          rule_id: null,
          decision: 'Hired freelance designer for landing page',
          context: 'No matching rule - required manual review',
          outcome: 'manual',
        },
      ]

      await supabase.from('decision_log').insert(sampleDecisions)
    }
  } else if (rulesData && rulesData.length > 0) {
    const sampleDecisions = [
      {
        rule_id: rulesData[0].id,
        decision: 'Purchased Vercel Pro plan for staging',
        context: '$20/month - within budget threshold',
        outcome: 'auto_approved',
      },
      {
        rule_id: rulesData[2].id,
        decision: 'Switched from Axios to native fetch',
        context: 'Minor tech decision, no breaking changes',
        outcome: 'auto_approved',
      },
      {
        rule_id: rulesData[3].id,
        decision: 'Fixed auth token refresh race condition',
        context: 'Critical bug, no data loss risk',
        outcome: 'auto_approved',
      },
      {
        rule_id: rulesData[0].id,
        decision: 'Annual domain renewal for 3 domains',
        context: '$156 total - exceeds $100 threshold',
        outcome: 'escalated',
      },
      {
        rule_id: null,
        decision: 'Hired freelance designer for landing page',
        context: 'No matching rule - required manual review',
        outcome: 'manual',
      },
    ]

    await supabase.from('decision_log').insert(sampleDecisions)
  }

  return NextResponse.json({ success: true, message: 'Delegation rules and decision log seeded' })
}
