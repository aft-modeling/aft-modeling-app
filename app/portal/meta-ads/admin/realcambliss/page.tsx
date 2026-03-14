import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RealcamblissTable from '@/components/meta-ads/RealcamblissTable'

export default async function RealcamblissPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: entries } = await supabase
    .from('meta_ads_realcambliss')
    .select('*')
    .order('date', { ascending: false })

  return <RealcamblissTable initialEntries={entries || []} />
}
