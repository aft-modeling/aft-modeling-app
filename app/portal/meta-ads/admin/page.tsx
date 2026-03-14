import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MetaAdsDashboard from '@/components/meta-ads/MetaAdsDashboard'

export default async function MetaAdsDashboardPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Fetch all data in parallel
  const [reelsResult, logsResult, expensesResult] = await Promise.all([
    supabase.from('meta_ads_reels').select('*').order('date_reel_posted', { ascending: false }),
    supabase.from('meta_ads_account_logs').select('*').order('date', { ascending: false }),
    supabase.from('meta_ads_expenses').select('*').order('date', { ascending: false }),
  ])

  return (
    <MetaAdsDashboard
      reels={reelsResult.data || []}
      accountLogs={logsResult.data || []}
      expenses={expensesResult.data || []}
    />
  )
}
