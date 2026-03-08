import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SchedulingSidebar from '@/components/portal/SchedulingSidebar'

export default async function SchedulingPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  // Admin always has access; others need portal access
  if (profile.role !== 'admin') {
    const { data: access } = await supabase
      .from('employee_portal_access')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('portal_id', 'scheduling')
      .single()

    if (!access) redirect('/dashboard')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SchedulingSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
