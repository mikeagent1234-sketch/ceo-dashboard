import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const agents = [
  { name: 'Coder', role: 'Builds apps, websites, SaaS tools, fixes bugs', avatar_color: '#6366f1' },
  { name: 'UI/UX Designer', role: 'Makes products look premium and professional', avatar_color: '#ec4899' },
  { name: 'Marketer', role: 'Daily social media content and videos', avatar_color: '#f59e0b' },
  { name: 'SEO & Ads', role: 'Google traffic, paid ad campaigns', avatar_color: '#10b981' },
  { name: 'Data Gatherer', role: 'Market research, trends, competitors', avatar_color: '#3b82f6' },
  { name: 'Business Analyst', role: 'Performance analysis, idea validation', avatar_color: '#8b5cf6' },
  { name: 'Sales & Outreach', role: 'Leads, cold outreach, closing deals', avatar_color: '#ef4444' },
  { name: 'Customer Support', role: 'Customer inquiries and complaints 24/7', avatar_color: '#14b8a6' },
  { name: 'Finance Tracker', role: 'Revenue, expenses, cash flow', avatar_color: '#f97316' },
  { name: 'Automation Builder', role: 'Connects tools, eliminates manual work', avatar_color: '#06b6d4' },
  { name: 'Legal', role: 'Contracts, NDAs, ToS, agreement reviews', avatar_color: '#64748b' },
]

export async function POST() {
  try {
    // Check if agents already seeded
    const { data: existing } = await supabase.from('agents').select('id').limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Already seeded', agents: existing.length })
    }

    // Seed agents
    const { data, error } = await supabase.from('agents').insert(agents).select()
    if (error) throw error

    // Create welcome notification
    await supabase.from('notifications').insert({
      message: 'CEO Dashboard is live! All 11 agents have been initialized.',
      type: 'success',
    })

    return NextResponse.json({ message: 'Setup complete', agents: data?.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
