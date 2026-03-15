import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Daily Task Report Cron
 *
 * Runs daily at 6 PM PST (2 AM UTC) via Vercel Cron.
 *
 * 1. For each employee with scheduling access:
 *    - Snapshots their daily task completions (with timestamps)
 *    - Records which tasks were missed
 *    - Saves to daily_task_reports table
 * 2. Sends a consolidated email to jay@aftmodeling.com
 *    with every employee's form for that day.
 * 3. Checkboxes reset automatically (the employee view queries
 *    by today's date, so a new day = fresh checkboxes).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Use PST date for the report (UTC-8)
    // At 2 AM UTC, it's 6 PM PST the previous day
    const now = new Date()
    const pstOffset = -8 * 60 // PST is UTC-8
    const pstTime = new Date(now.getTime() + (pstOffset + now.getTimezoneOffset()) * 60000)
    const reportDate = pstTime.toISOString().split('T')[0]

    // ── Step 1: Get all employees with scheduling portal access ──
    const { data: portalAccess, error: accessError } = await supabase
      .from('employee_portal_access')
      .select('user_id')
      .eq('portal_id', 'scheduling')

    if (accessError) {
      return NextResponse.json({ error: `Portal access query failed: ${accessError.message}` }, { status: 500 })
    }

    if (!portalAccess || portalAccess.length === 0) {
      return NextResponse.json({ success: true, message: 'No employees with scheduling access', reports: 0 })
    }

    const employeeIds = portalAccess.map(pa => pa.user_id)

    // ── Step 2: Get employee profiles ──
    const { data: employees } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', employeeIds)

    if (!employees || employees.length === 0) {
      return NextResponse.json({ success: true, message: 'No employee profiles found', reports: 0 })
    }

    // ── Step 3: Get all active daily tasks ──
    const { data: allTasks } = await supabase
      .from('daily_tasks')
      .select('id, title, assigned_to')
      .eq('is_active', true)

    if (!allTasks || allTasks.length === 0) {
      return NextResponse.json({ success: true, message: 'No active daily tasks', reports: 0 })
    }

    // ── Step 4: Get all completions for today ──
    const { data: allCompletions } = await supabase
      .from('daily_task_completions')
      .select('task_id, user_id, completed_at')
      .eq('completed_on', reportDate)

    const completionMap = new Map<string, Map<string, string>>()
    // Map<userId, Map<taskId, completed_at>>
    for (const c of (allCompletions || [])) {
      if (!completionMap.has(c.user_id)) {
        completionMap.set(c.user_id, new Map())
      }
      completionMap.get(c.user_id)!.set(c.task_id, c.completed_at)
    }

    // ── Step 5: Generate reports for each employee ──
    interface EmployeeReport {
      userId: string
      name: string
      reportDate: string
      tasksCompleted: { task_id: string; title: string; completed_at: string }[]
      tasksMissed: { task_id: string; title: string }[]
      totalAssigned: number
      totalCompleted: number
    }

    const reports: EmployeeReport[] = []

    for (const emp of employees) {
      // Skip admin role
      if (emp.role === 'admin') continue

      // Get tasks assigned to this employee (or to everyone)
      const assignedTasks = allTasks.filter(
        t => t.assigned_to === null || t.assigned_to === emp.id
      )

      if (assignedTasks.length === 0) continue

      const empCompletions = completionMap.get(emp.id) || new Map()

      const tasksCompleted: { task_id: string; title: string; completed_at: string }[] = []
      const tasksMissed: { task_id: string; title: string }[] = []

      for (const task of assignedTasks) {
        const completedAt = empCompletions.get(task.id)
        if (completedAt) {
          tasksCompleted.push({
            task_id: task.id,
            title: task.title,
            completed_at: completedAt,
          })
        } else {
          tasksMissed.push({
            task_id: task.id,
            title: task.title,
          })
        }
      }

      // Sort completed tasks by completion time
      tasksCompleted.sort((a, b) =>
        new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
      )

      const report: EmployeeReport = {
        userId: emp.id,
        name: emp.full_name,
        reportDate,
        tasksCompleted,
        tasksMissed,
        totalAssigned: assignedTasks.length,
        totalCompleted: tasksCompleted.length,
      }

      reports.push(report)

      // ── Save report to database ──
      const { error: upsertError } = await supabase
        .from('daily_task_reports')
        .upsert(
          {
            user_id: emp.id,
            report_date: reportDate,
            tasks_completed: tasksCompleted,
            tasks_missed: tasksMissed,
            total_assigned: assignedTasks.length,
            total_completed: tasksCompleted.length,
            email_sent: false,
          },
          { onConflict: 'user_id,report_date' }
        )

      if (upsertError) {
        console.error(`Failed to save report for ${emp.full_name}:`, upsertError.message)
      }
    }

    // ── Step 6: Send consolidated email ──
    let emailSent = false
    const resendKey = process.env.RESEND_API_KEY

    if (resendKey && reports.length > 0) {
      try {
        const resend = new Resend(resendKey)

        const emailHtml = buildEmailHtml(reports, reportDate)

        const { error: emailError } = await resend.emails.send({
          from: 'AFT Tasks <tasks@aftmodeling.com>',
          to: ['jay@aftmodeling.com'],
          subject: `AFT Daily Task Report — ${formatDateForDisplay(reportDate)}`,
          html: emailHtml,
        })

        if (emailError) {
          console.error('Email send error:', emailError)
        } else {
          emailSent = true

          // Mark reports as email_sent
          const reportUserIds = reports.map(r => r.userId)
          await supabase
            .from('daily_task_reports')
            .update({ email_sent: true })
            .eq('report_date', reportDate)
            .in('user_id', reportUserIds)
        }
      } catch (emailErr: any) {
        console.error('Email service error:', emailErr.message)
      }
    } else if (!resendKey) {
      console.warn('RESEND_API_KEY not configured — skipping email')
    }

    return NextResponse.json({
      success: true,
      report_date: reportDate,
      employees_reported: reports.length,
      email_sent: emailSent,
      summary: reports.map(r => ({
        name: r.name,
        completed: r.totalCompleted,
        total: r.totalAssigned,
        percentage: r.totalAssigned > 0
          ? Math.round((r.totalCompleted / r.totalAssigned) * 100)
          : 0,
      })),
    })
  } catch (err: any) {
    console.error('Daily task report cron error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}


// ── Email Builder ──────────────────────────────────────────────────────────

function buildEmailHtml(reports: any[], reportDate: string): string {
  const dateDisplay = formatDateForDisplay(reportDate)

  // Calculate overall stats
  const totalTasks = reports.reduce((sum, r) => sum + r.totalAssigned, 0)
  const totalDone = reports.reduce((sum, r) => sum + r.totalCompleted, 0)
  const overallPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AFT Daily Task Report</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:24px;">

    <!-- Header -->
    <div style="background-color:#111827; border-radius:12px 12px 0 0; padding:24px 32px; text-align:center;">
      <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">Daily Task Report</h1>
      <p style="margin:8px 0 0; color:#9ca3af; font-size:14px;">${dateDisplay}</p>
    </div>

    <!-- Overall Summary Bar -->
    <div style="background-color:#1f2937; padding:16px 32px; display:flex; justify-content:center;">
      <span style="color:#d1d5db; font-size:14px;">
        Team Total: <strong style="color:${overallPct === 100 ? '#34d399' : overallPct >= 75 ? '#fbbf24' : '#f87171'};">${totalDone}/${totalTasks}</strong> tasks completed (${overallPct}%)
      </span>
    </div>

    <!-- Employee Reports -->
    <div style="background-color:#ffffff; padding:8px 0;">
`

  for (const report of reports) {
    const pct = report.totalAssigned > 0
      ? Math.round((report.totalCompleted / report.totalAssigned) * 100)
      : 0
    const pctColor = pct === 100 ? '#059669' : pct >= 75 ? '#d97706' : '#dc2626'
    const statusEmoji = pct === 100 ? '🟢' : pct >= 75 ? '🟡' : '🔴'

    html += `
      <!-- ${report.name} -->
      <div style="border-bottom:1px solid #e5e7eb; padding:20px 32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h2 style="margin:0; font-size:16px; font-weight:700; color:#111827;">${statusEmoji} ${report.name}</h2>
          <span style="font-size:13px; font-weight:600; color:${pctColor};">${report.totalCompleted}/${report.totalAssigned} (${pct}%)</span>
        </div>
`

    // Completed tasks
    for (const task of report.tasksCompleted) {
      const time = formatTimeForDisplay(task.completed_at)
      html += `
        <div style="padding:6px 0; display:flex; align-items:center;">
          <span style="color:#059669; margin-right:8px; font-size:16px;">✅</span>
          <span style="flex:1; font-size:13px; color:#374151;">${escapeHtml(task.title)}</span>
          <span style="font-size:12px; color:#6b7280; white-space:nowrap; margin-left:12px;">done at ${time}</span>
        </div>
`
    }

    // Missed tasks
    for (const task of report.tasksMissed) {
      html += `
        <div style="padding:6px 0; display:flex; align-items:center;">
          <span style="color:#dc2626; margin-right:8px; font-size:16px;">❌</span>
          <span style="flex:1; font-size:13px; color:#9ca3af; text-decoration:none;">${escapeHtml(task.title)}</span>
          <span style="font-size:12px; color:#dc2626; white-space:nowrap; margin-left:12px;">NOT COMPLETED</span>
        </div>
`
    }

    html += `
      </div>
`
  }

  html += `
    </div>

    <!-- Footer -->
    <div style="background-color:#f9fafb; border-radius:0 0 12px 12px; padding:16px 32px; text-align:center; border-top:1px solid #e5e7eb;">
      <p style="margin:0; color:#9ca3af; font-size:12px;">
        Generated automatically by AFT Teams • ${dateDisplay} at 6:00 PM PST
      </p>
    </div>

  </div>
</body>
</html>
`

  return html
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTimeForDisplay(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  // Convert to PST (UTC-8)
  const pst = new Date(date.getTime() - 8 * 60 * 60 * 1000)
  const hours = pst.getUTCHours()
  const minutes = pst.getUTCMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${displayHours}:${displayMinutes} ${ampm}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
