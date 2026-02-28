import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// This route checks for overdue clips and notifies editors + QA
// Can be called by Vercel Cron or manually via GET /api/check-overdue
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Find all clips that are overdue (due_date < today) and not yet finished
    const { data: overdueClips, error } = await supabase
      .from('clips')
      .select('id, name, due_date, assigned_editor_id, status')
      .lt('due_date', todayStr)
      .not('status', 'eq', 'finished')
      .not('due_date', 'is', null)

    if (error) {
      console.error('Error fetching overdue clips:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!overdueClips || overdueClips.length === 0) {
      return NextResponse.json({ message: 'No overdue clips found', notified: 0 })
    }

    // Get all QA users (to notify them about overdue editors)
    const { data: qaUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'qa')

    const notifications: any[] = []

    for (const clip of overdueClips) {
      // Notify the assigned editor about their overdue clip
      if (clip.assigned_editor_id) {
        notifications.push({
          user_id: clip.assigned_editor_id,
          message: `Clip "${clip.name}" is overdue (was due ${clip.due_date}). Please submit ASAP.`,
          type: 'clip_assigned',
          clip_id: clip.id,
        })
      }
    }

    // Notify QA users about all overdue clips (summary)
    if (qaUsers && qaUsers.length > 0 && overdueClips.length > 0) {
      const overdueCount = overdueClips.length
      for (const qa of qaUsers) {
        notifications.push({
          user_id: qa.id,
          message: `There are ${overdueCount} overdue clip(s) from editors that need attention.`,
          type: 'revision_needed',
        })
      }
    }

    // Don't create duplicate notifications - check if already notified today
    const startOfDay = new Date(todayStr + 'T00:00:00Z').toISOString()
    const { data: existingToday } = await supabase
      .from('notifications')
      .select('id')
      .gte('created_at', startOfDay)
      .like('message', '%overdue%')
      .limit(1)

    if (existingToday && existingToday.length > 0) {
      return NextResponse.json({ message: 'Already notified today', notified: 0 })
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (insertError) {
        console.error('Error inserting overdue notifications:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: `Notified about ${overdueClips.length} overdue clips`,
      notified: notifications.length,
      overdueClips: overdueClips.length,
    })
  } catch (err: any) {
    console.error('Check overdue error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
