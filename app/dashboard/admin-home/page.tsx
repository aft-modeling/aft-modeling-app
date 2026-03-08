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

  return (
    <AdminHomepage
      employeeCount={employeeCount || 0}
      portalAccessCounts={portalAccessCounts}
    />
  )
}
