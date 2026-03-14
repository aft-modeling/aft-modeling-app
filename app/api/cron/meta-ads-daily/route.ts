import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Daily cron: Scrape @realkatiemae followers, create account log,
 * compute 24h gain + CPF.
 * Replaces AirTable "Auto Scraper 2" automation.
 * Schedule: Daily at 1:00 PM PDT via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const today = new Date().toISOString().split('T')[0]

    // ── Step 1: Scrape Instagram follower count for @realkatiemae ──
    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 })
    }

    const igResponse = await fetch(
      'https://instagram-scraper-20251.p.rapidapi.com/userinfo/?username_or_id=realkatiemae',
      {
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'instagram-scraper-20251.p.rapidapi.com',
        },
      }
    )

    if (!igResponse.ok) {
      const text = await igResponse.text()
      return NextResponse.json(
        { error: `Instagram API error: ${igResponse.status}`, detail: text },
        { status: 502 }
      )
    }

    const igData = await igResponse.json()
    const followers = findFollowerCount(igData)

    if (followers == null) {
      return NextResponse.json(
        { error: 'Could not extract follower_count from API response', raw: igData },
        { status: 502 }
      )
    }

    // ── Step 2: Get previous day's follower count for 24h gain ──
    const { data: prevLog } = await supabase
      .from('meta_ads_account_logs')
      .select('followers')
      .lt('date', today)
      .not('followers', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    const twentyFourHrGain = prevLog?.followers != null ? followers - prevLog.followers : null

    // ── Step 3: Compute All-Time CPF ──
    // all_time_followers_gained is a generated column = followers - 1200
    const allTimeGained = followers - 1200

    // Sum all Paid expenses
    const { data: paidExpenses } = await supabase
      .from('meta_ads_expenses')
      .select('amount')
      .eq('type', 'Paid')

    const paidTotal = (paidExpenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)
    const cpf = allTimeGained > 0 ? paidTotal / allTimeGained : null

    // ── Step 4: Upsert today's account log ──
    // Check if today's record already exists
    const { data: existingLog } = await supabase
      .from('meta_ads_account_logs')
      .select('id')
      .eq('date', today)
      .limit(1)
      .single()

    if (existingLog) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('meta_ads_account_logs')
        .update({
          followers,
          twenty_four_hr_gain: twentyFourHrGain,
          cpf: cpf != null ? parseFloat(cpf.toFixed(4)) : null,
        })
        .eq('id', existingLog.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('meta_ads_account_logs')
        .insert({
          date: today,
          followers,
          twenty_four_hr_gain: twentyFourHrGain,
          cpf: cpf != null ? parseFloat(cpf.toFixed(4)) : null,
        })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      followers,
      twenty_four_hr_gain: twentyFourHrGain,
      cpf: cpf != null ? parseFloat(cpf.toFixed(4)) : null,
    })
  } catch (err: any) {
    console.error('Meta ads daily cron error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

/**
 * Recursively search JSON response for follower_count field.
 * The Instagram API response structure can vary, so we search recursively.
 */
function findFollowerCount(obj: any): number | null {
  if (obj == null || typeof obj !== 'object') return null

  if ('follower_count' in obj && typeof obj.follower_count === 'number') {
    return obj.follower_count
  }

  for (const key of Object.keys(obj)) {
    const result = findFollowerCount(obj[key])
    if (result != null) return result
  }

  return null
}
