import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmployeeScheduleView from '@/components/scheduling/EmployeeScheduleView'

export default async function EmployeeSchedulingPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return <EmployeeScheduleView userId={session.user.id} />
}
