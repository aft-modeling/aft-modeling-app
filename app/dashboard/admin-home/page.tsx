import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminHomepage from '@/components/admin/AdminHomepage'

export default async function AdminHomePage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Get employee count (non-admin profiles)
  const { count: employeeCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('role', 'admin')

  // Get portal access counts
  const { data: portalCounts } = await supabase
    .from('employee_portal_access')
    .select('portal_id')

  // Count per portal
  const portalAccessCounts: Record<string, number> = {}
  ;(portalCounts || []).forEach(row => {
    portalAccessCounts[row.portal_id] = (portalAccessCounts[row.portal_id] || 0) + 1
  })

  // Get total estimated payroll for open pay period
  let totalEstimatedPayroll = 0
  let hasOpenPayPeriod = false

  const { data: openPeriod } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('status', 'open')
    .limit(1)
    .maybeSingle()

  if (openPeriod) {
    hasOpenPayPeriod = true

    // Get editors
    const { data: editors } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'editor')

    if (editors && editors.length > 0) {
      // Get finished clips in period
      const { data: finishedClips } = await supabase
        .from('finished_clips')
        .select('editor_id')
        .gte('finished_at', openPeriod.start_date)
        .lte('finished_at', openPeriod.end_date + 'T23:59:59.999Z')

      // Get commissions for period
      const { data: commissions } = await supabase
        .from('editor_commissions')
        .select('editor_id, commission_amount')
        .eq('pay_period_id', openPeriod.id)

      // Calculate total
      editors.forEach(editor => {
        const clipCount = (finishedClips || []).filter(c => c.editor_id === editor.id).length
        const basePay = clipCount * 1.0
        const commission = (commissions || []).find(c => c.editor_id === editor.id)
        const commissionAmt = commission ? Number(commission.commission_amount) : 0
        totalEstimatedPayroll += basePay + commissionAmt
      })
    }
  }

  return (
    <AdminHomepage
      employeeCount={employeeCount || 0}
      portalAccessCounts={portalAccessCounts}
      totalEstimatedPayroll={totalEstimatedPayroll}
      hasOpenPayPeriod={hasOpenPayPeriod}
    />
  )
}
