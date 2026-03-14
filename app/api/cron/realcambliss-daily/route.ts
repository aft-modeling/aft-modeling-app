import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Daily cron: Scrape @realcambliss followers, create/update log, compute 24h gain.
 * Replaces AirTable "Realcambliss Follower Tracker" automation.
 * Schedule: Daily at 1:00 PM PDT via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const today = new Date().toISOString().split('T')[0]

    // ── Step 1: Scrape Instagram follower count for @realcambliss ──
    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 })
    }

    const igResponse = await fetch(
      'https://instagram-scraper-20251.p.rapidapi.com/userinfo/?username_or_id=realcambliss',
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
      .from('meta_ads_realcambliss')
      .select('followers')
      .lt('date', today)
      .not('followers', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    const twentyFourHrGain = prevLog?.followers != null ? followers - prevLog.followers : null

    // ── Step 3: Upsert today's record ──
    const { data: existingLog } = await supabase
      .from('meta_ads_realcambliss')
      .select('id')
      .eq('date', today)
      .limit(1)
      .single()

    if (existingLog) {
      const { error: updateError } = await supabase
        .from('meta_ads_realcambliss')
        .update({
          followers,
          twenty_four_hr_gain: twentyFourHrGain,
        })
        .eq('id', existingLog.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('meta_ads_realcambliss')
        .insert({
          date: today,
          followers,
          twenty_four_hr_gain: twentyFourHrGain,
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
    })
  } catch (err: any) {
    console.error('Realcambliss daily cron error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

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
