import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmployeeHomepage from '@/components/EmployeeHomepage'

export default async function EmployeeHomePage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/dashboard/admin-home')

  // Get this employee's portal access
  const { data: portalAccess } = await supabase
    .from('employee_portal_access')
    .select('portal_id')
    .eq('user_id', session.user.id)

  const grantedPortalIds = (portalAccess || []).map(pa => pa.portal_id)

  return (
    <EmployeeHomepage
      profile={profile}
      grantedPortalIds={grantedPortalIds}
    />
  )
}
