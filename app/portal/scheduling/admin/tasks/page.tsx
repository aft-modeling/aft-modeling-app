import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminTaskManagement from '@/components/scheduling/AdminTaskManagement'

export default async function AdminTasksPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  return <AdminTaskManagement employees={employees || []} />
}
