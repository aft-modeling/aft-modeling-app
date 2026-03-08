import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PayrollDashboard from '@/components/payroll/PayrollDashboard'

export default async function PayrollAdminPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Fetch editors (role = 'editor' only)
  const { data: editors } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'editor')
    .order('full_name')

  // Fetch all pay periods
  const { data: payPeriods } = await supabase
    .from('pay_periods')
    .select('*')
    .order('created_at', { ascending: false })

  // Find the currently open pay period
  const openPeriod = (payPeriods || []).find(p => p.status === 'open') || null

  // Fetch finished clips (for current open period)
  let finishedClips: any[] = []
  if (openPeriod) {
    const { data } = await supabase
      .from('finished_clips')
      .select('id, editor_id, finished_at')
      .gte('finished_at', openPeriod.start_date)
      .lte('finished_at', openPeriod.end_date + 'T23:59:59.999Z')
    finishedClips = data || []
  }

  // Fetch commissions for open period
  let commissions: any[] = []
  if (openPeriod) {
    const { data } = await supabase
      .from('editor_commissions')
      .select('*')
      .eq('pay_period_id', openPeriod.id)
    commissions = data || []
  }

  // Fetch snapshots for closed periods
  const closedPeriods = (payPeriods || []).filter(p => p.status === 'closed')
  let snapshots: any[] = []
  if (closedPeriods.length > 0) {
    const closedIds = closedPeriods.map(p => p.id)
    const { data } = await supabase
      .from('payroll_snapshots')
      .select('*')
      .in('pay_period_id', closedIds)
    snapshots = data || []
  }

  return (
    <PayrollDashboard
      editors={editors || []}
      payPeriods={payPeriods || []}
      openPeriod={openPeriod}
      finishedClips={finishedClips}
      commissions={commissions}
      snapshots={snapshots}
      adminId={session.user.id}
    />
  )
}
