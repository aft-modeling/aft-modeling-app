import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Scrape views/likes for all reels where scrape = 'YES'.
 * Replaces AirTable "Like / View Data" automation.
 * Can be triggered manually from the dashboard or via daily cron.
 * Processes up to 50 reels per run to respect API rate limits.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) {
      return NextResponse.json({ error: 'RAPIDAPI_KEY not configured' }, { status: 500 })
    }

    // Get all reels where scrape = 'YES' and they have a reel link
    const { data: reels, error: fetchError } = await supabase
      .from('meta_ads_reels')
      .select('id, link_to_reel, name')
      .eq('scrape', 'YES')
      .not('link_to_reel', 'is', null)
      .limit(50)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!reels || reels.length === 0) {
      return NextResponse.json({ message: 'No reels to scrape', processed: 0 })
    }

    const results: { id: string; name: string | null; views: number | null; likes: number | null; error?: string }[] = []

    for (const reel of reels) {
      try {
        // Extract reel code/URL for the API
        const reelUrl = reel.link_to_reel!

        const response = await fetch(
          `https://instagram-scraper-20251.p.rapidapi.com/postdetail/?code_or_url=${encodeURIComponent(reelUrl)}`,
          {
            headers: {
              'x-rapidapi-key': rapidApiKey,
              'x-rapidapi-host': 'instagram-scraper-20251.p.rapidapi.com',
            },
          }
        )

        if (!response.ok) {
          results.push({ id: reel.id, name: reel.name, views: null, likes: null, error: `API ${response.status}` })
          continue
        }

        const data = await response.json()
        const views = findField(data, ['play_count', 'view_count', 'video_view_count'])
        const likes = findField(data, ['like_count'])

        // Update the reel record
        const updatePayload: Record<string, any> = {}
        if (views != null) updatePayload.total_views = views
        if (likes != null) updatePayload.total_likes = likes

        if (Object.keys(updatePayload).length > 0) {
          await supabase
            .from('meta_ads_reels')
            .update(updatePayload)
            .eq('id', reel.id)
        }

        results.push({ id: reel.id, name: reel.name, views, likes })

        // Small delay to avoid hitting rate limits
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (reelErr: any) {
        results.push({ id: reel.id, name: reel.name, views: null, likes: null, error: reelErr.message })
      }
    }

    const successCount = results.filter((r) => !r.error).length

    return NextResponse.json({
      success: true,
      processed: reels.length,
      updated: successCount,
      results,
    })
  } catch (err: any) {
    console.error('Scrape reel metrics error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

/**
 * Recursively search JSON for any of the given field names, returning the first number found.
 */
function findField(obj: any, fieldNames: string[]): number | null {
  if (obj == null || typeof obj !== 'object') return null

  for (const name of fieldNames) {
    if (name in obj && typeof obj[name] === 'number') {
      return obj[name]
    }
  }

  for (const key of Object.keys(obj)) {
    const result = findField(obj[key], fieldNames)
    if (result != null) return result
  }

  return null
}
