import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  // V2: Route to homepage based on role
  if (profile.role === 'admin') redirect('/dashboard/admin-home')

  // All employee roles go to the employee homepage
  redirect('/dashboard/employee-home')
}
