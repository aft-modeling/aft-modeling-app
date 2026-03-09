import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PayrollSidebar from '@/components/portal/PayrollSidebar'

export default async function PayrollPortalLayout({
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

  // Payroll is admin-only — redirect any non-admin
  if (profile.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <PayrollSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
