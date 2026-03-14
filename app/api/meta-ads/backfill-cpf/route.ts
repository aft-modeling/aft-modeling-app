import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * One-time CPF backfill: For each account log record, compute cumulative CPF
 * using all Paid expenses up to that record's date.
 * Replaces AirTable "Automation 1" (one-time CPF backfill).
 * Triggered manually from admin dashboard.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all account logs sorted chronologically
    const { data: logs, error: logsError } = await supabase
      .from('meta_ads_account_logs')
      .select('id, date, followers, all_time_followers_gained')
      .order('date', { ascending: true })

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ message: 'No account logs found', updated: 0 })
    }

    // Get all Paid expenses sorted chronologically
    const { data: expenses, error: expError } = await supabase
      .from('meta_ads_expenses')
      .select('date, amount')
      .eq('type', 'Paid')
      .order('date', { ascending: true })

    if (expError) {
      return NextResponse.json({ error: expError.message }, { status: 500 })
    }

    const paidExpenses = expenses ?? []
    let updatedCount = 0

    for (const log of logs) {
      const allTimeGained = log.all_time_followers_gained ?? (log.followers != null ? log.followers - 1200 : null)

      if (allTimeGained == null || allTimeGained <= 0) {
        // Can't compute CPF without follower data
        continue
      }

      // Sum all paid expenses up to and including this log's date
      const cumulativePaid = paidExpenses
        .filter((e) => e.date <= log.date)
        .reduce((sum, e) => sum + (e.amount ?? 0), 0)

      const cpf = cumulativePaid > 0 ? parseFloat((cumulativePaid / allTimeGained).toFixed(4)) : null

      const { error: updateError } = await supabase
        .from('meta_ads_account_logs')
        .update({ cpf })
        .eq('id', log.id)

      if (!updateError) {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      total_logs: logs.length,
      updated: updatedCount,
    })
  } catch (err: any) {
    console.error('Backfill CPF error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
