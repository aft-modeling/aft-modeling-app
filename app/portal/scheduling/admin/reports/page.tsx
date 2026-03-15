import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AutomatedReports from '@/components/scheduling/AutomatedReports'

export default async function AdminReportsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  return <AutomatedReports />
}
