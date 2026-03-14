import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpensesTable from '@/components/meta-ads/ExpensesTable'

export default async function ExpensesPage() {
  const supabase = createServerClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: expenses } = await supabase
    .from('meta_ads_expenses')
    .select('*')
    .order('date', { ascending: false })

  return <ExpensesTable initialExpenses={expenses || []} />
}
