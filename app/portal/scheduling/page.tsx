import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SchedulingPortalPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  // Admin goes to admin view; everyone else goes to employee view
  if (profile.role === 'admin') redirect('/portal/scheduling/admin')
  redirect('/portal/scheduling/employee')
}
