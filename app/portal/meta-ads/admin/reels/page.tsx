import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReelsTable from '@/components/meta-ads/ReelsTable'

export default async function ReelsPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: reels } = await supabase
    .from('meta_ads_reels')
    .select('*')
    .order('date_reel_posted', { ascending: false })

  return <ReelsTable initialReels={reels || []} />
}
