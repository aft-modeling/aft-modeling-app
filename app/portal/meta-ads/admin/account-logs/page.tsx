import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountLogsTable from '@/components/meta-ads/AccountLogsTable'

export default async function AccountLogsPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: logs } = await supabase
    .from('meta_ads_account_logs')
    .select('*')
    .order('date', { ascending: false })

  return <AccountLogsTable initialLogs={logs || []} />
}
