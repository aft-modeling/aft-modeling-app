import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PayrollPortalPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // Admin-only portal — redirect directly to admin page
  redirect('/portal/payroll/admin')
}
