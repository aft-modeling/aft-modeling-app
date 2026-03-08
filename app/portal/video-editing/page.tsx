import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function VideoEditingPortalPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  // Route to appropriate role dashboard within the portal
  if (profile.role === 'admin') redirect('/portal/video-editing/admin')
  if (profile.role === 'creative_director') redirect('/portal/video-editing/cd')
  if (profile.role === 'editor') redirect('/portal/video-editing/editor')
  if (profile.role === 'qa') redirect('/portal/video-editing/qa')

  redirect('/dashboard')
}
