import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmployeeManagement from '@/components/admin/EmployeeManagement'

export default async function EmployeeManagementPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Get all non-admin employees
  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .order('full_name')

  // Get all portal access records
  const { data: allAccess } = await supabase
    .from('employee_portal_access')
    .select('*')

  return (
    <EmployeeManagement
      employees={employees || []}
      portalAccess={allAccess || []}
      adminId={session.user.id}
    />
  )
}
