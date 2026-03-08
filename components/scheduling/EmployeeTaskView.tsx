'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyTask, DailyTaskCompletion, OneTimeTask } from '@/lib/types'
import {
  CheckSquare, CheckCircle2, Circle, AlertTriangle,
  Calendar as CalIcon, Clock
} from 'lucide-react'
import clsx from 'clsx'

interface Props {
  userId: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600',
}

export default function EmployeeTaskView({ userId }: Props) {
  const supabase = createClient()

  // Daily tasks
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [todayCompletions, setTodayCompletions] = useState<Set<string>>(new Set())

  // One-time tasks
  const [oneTimeTasks, setOneTimeTasks] = useState<OneTimeTask[]>([])

  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const loadDailyTasks = useCallback(async () => {
    // Fetch active daily tasks for this user or everyone
    const { data: tasks } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('is_active', true)
      .or(`assigned_to.is.null,assigned_to.eq.${userId}`)
      .order('created_at')

    setDailyTasks(tasks || [])

    // Fetch today's completions
    const { data: completions } = await supabase
      .from('daily_task_completions')
      .select('task_id')
      .eq('user_id', userId)
      .eq('completed_on', today)

    const completedIds = new Set((completions || []).map(c => c.task_id))
    setTodayCompletions(completedIds)
  }, [supabase, userId, today])

  const loadOneTimeTasks = useCallback(async () => {
    const { data } = await supabase
      .from('one_time_tasks')
      .select('*')
      .eq('assigned_to', userId)
      .eq('is_complete', false)
      .order('due_date', { ascending: true, nullsFirst: false })

    setOneTimeTasks(data || [])
  }, [supabase, userId])

  useEffect(() => {
    Promise.all([loadDailyTasks(), loadOneTimeTasks()]).then(() => setLoading(false))
  }, [loadDailyTasks, loadOneTimeTasks])

  async function toggleDailyCompletion(taskId: string) {
    if (todayCompletions.has(taskId)) {
      // Can't un-complete (simplicity) â or optionally we could delete the completion
      return
    }

    const { error } = await supabase.from('daily_task_completions').insert({
      task_id: taskId,
      user_id: userId,
      completed_on: today,
    })

    if (!error) {
      setTodayCompletions(new Set([...todayCompletions, taskId]))
    }
  }

  async function completeOneTimeTask(taskId: string) {
    const { error } = await supabase
      .from('one_time_tasks')
      .update({ is_complete: true, completed_at: new Date().toISOString() })
      .eq('id', taskId)

    if (!error) {
      setOneTimeTasks(oneTimeTasks.filter(t => t.id !== taskId))
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading tasks...</div>
      </div>
    )
  }

  const completedCount = dailyTasks.filter(t => todayCompletions.has(t.id)).length
  const totalDaily = dailyTasks.length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-brand-600" />
          My Tasks
        </h1>
        <p className="text-gray-500 mt-1">Your daily checklist and assigned tasks</p>
      </div>

      {/* Daily Tasks Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Daily Tasks</h2>
          {totalDaily > 0 && (
            <span className={clsx(
              'text-sm font-medium px-2.5 py-0.5 rounded-full',
              completedCount === totalDaily
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            )}>
              {completedCount}/{totalDaily} done
            </span>
          )}
        </div>

        {dailyTasks.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            No daily tasks assigned to you
          </div>
        ) : (
          <div className="space-y-2">
            {dailyTasks.map((task) => {
              const isComplete = todayCompletions.has(task.id)
              return (
                <button
                  key={task.id}
                  onClick={() => toggleDailyCompletion(task.id)}
                  className={clsx(
                    'w-full bg-white border rounded-lg p-4 flex items-center gap-3 text-left transition-all hover:shadow-sm',
                    isComplete ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  )}
                  <span className={clsx(
                    'text-sm font-medium',
                    isComplete ? 'text-gray-400 line-through' : 'text-gray-900'
                  )}>
                    {task.title}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* One-Time Tasks Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">One-Time Tasks</h2>

        {oneTimeTasks.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
            No pending one-time tasks
          </div>
        ) : (
          <div className="space-y-2">
            {oneTimeTasks.map((task) => {
              const isOverdue = task.due_date && task.due_date < today
              return (
                <div
                  key={task.id}
                  className={clsx(
                    'bg-white border rounded-lg p-4 flex items-center gap-3',
                    isOverdue ? 'border-red-200' : 'border-gray-200'
                  )}
                >
                  <button
                    onClick={() => completeOneTimeTask(task.id)}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                  >
                    <Circle className="w-5 h-5 text-gray-300 hover:text-green-400" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {task.due_date && (
                        <span className={clsx(
                          'text-xs flex items-center gap-1',
                          isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'
                        )}>
                          <CalIcon className="w-3 h-3" />
                          {isOverdue ? 'Overdue: ' : 'Due: '}{task.due_date}
                        </span>
                      )}
                      <span className={clsx('text-xs font-medium', PRIORITY_COLORS[task.priority])}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </div>
                    {task.notes && <p className="text-xs text-gray-400 mt-1">{task.notes}</p>}
                  </div>
                  <AlertTriangle className={clsx('w-4 h-4 flex-shrink-0', PRIORITY_COLORS[task.priority])} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
