import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmployeeTaskView from '@/components/scheduling/EmployeeTaskView'

export default async function EmployeeTasksPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return <EmployeeTaskView userId={session.user.id} />
}
