import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminScheduleView from '@/components/scheduling/AdminScheduleView'

export default async function AdminSchedulingPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Fetch all employees
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  return <AdminScheduleView employees={employees || []} />
}
