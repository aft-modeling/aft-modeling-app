import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VideoEditingSidebar from '@/components/portal/VideoEditingSidebar'

export default async function VideoEditingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  // Admins always have access; others need portal access
  if (profile.role !== 'admin') {
    const { data: access } = await supabase
      .from('employee_portal_access')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('portal_id', 'video-editing')
      .single()

    if (!access) redirect('/dashboard')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <VideoEditingSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
