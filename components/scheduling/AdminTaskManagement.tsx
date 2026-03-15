'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, DailyTask, OneTimeTask } from '@/lib/types'
import {
  ListTodo, Plus, Trash2, CheckCircle2, Circle,
  AlertTriangle, Calendar as CalIcon, Users, User as UserIcon,
  BarChart3
} from 'lucide-react'
import clsx from 'clsx'

interface Props {
  employees: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[]
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-600',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

interface CompletionStatus {
  userId: string
  name: string
  completed: number
  total: number
}

export default function AdminTaskManagement({ employees }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'daily' | 'onetime' | 'dashboard'>('daily')

  // Daily tasks state
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [newDailyTitle, setNewDailyTitle] = useState('')
  const [newDailyAssignee, setNewDailyAssignee] = useState<string>('')
  const [bulkAssignMode, setBulkAssignMode] = useState(false)
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState<Set<string>>(new Set())

  // One-time tasks state
  const [oneTimeTasks, setOneTimeTasks] = useState<OneTimeTask[]>([])
  const [newOTTitle, setNewOTTitle] = useState('')
  const [newOTAssignee, setNewOTAssignee] = useState<string>('')
  const [newOTDueDate, setNewOTDueDate] = useState('')
  const [newOTPriority, setNewOTPriority] = useState<string>('normal')
  const [newOTNotes, setNewOTNotes] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  // Dashboard state
  const [completionStatuses, setCompletionStatuses] = useState<CompletionStatus[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadDailyTasks = useCallback(async () => {
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setDailyTasks(data || [])
  }, [supabase])

  const loadOneTimeTasks = useCallback(async () => {
    let query = supabase.from('one_time_tasks').select('*')
    if (!showCompleted) {
      query = query.eq('is_complete', false)
    }
    const { data } = await query.order('created_at', { ascending: false })
    setOneTimeTasks(data || [])
  }, [supabase, showCompleted])

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    // Use PST date (UTC-8) to match business timezone
    const now = new Date()
    const pstOffset = -8 * 60 // PST is UTC-8
    const pstTime = new Date(now.getTime() + (pstOffset + now.getTimezoneOffset()) * 60000)
    const today = pstTime.toISOString().split('T')[0]

    // Get all active daily tasks
    const { data: tasks } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('is_active', true)

    // Get today's completions for all users
    const { data: completions } = await supabase
      .from('daily_task_completions')
      .select('task_id, user_id')
      .eq('completed_on', today)

    const statuses: CompletionStatus[] = employees.map(emp => {
      const assignedTasks = (tasks || []).filter(
        t => t.assigned_to === null || t.assigned_to === emp.id
      )
      const empCompletions = (completions || []).filter(c => c.user_id === emp.id)
      return {
        userId: emp.id,
        name: emp.full_name,
        completed: empCompletions.length,
        total: assignedTasks.length,
      }
    })

    setCompletionStatuses(statuses)
    setDashboardLoading(false)
  }, [supabase, employees])

  useEffect(() => {
    loadDailyTasks()
    loadOneTimeTasks()
  }, [loadDailyTasks, loadOneTimeTasks])

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard()
    }
  }, [activeTab, loadDashboard])

  // ---- Daily Task Actions ----
  async function addDailyTask() {
    if (!newDailyTitle.trim()) return
    setMessage(null)
    const { data: { session } } = await supabase.auth.getSession()

    if (bulkAssignMode && bulkSelectedEmployees.size > 0) {
      // Bulk assignment: create one task per selected employee
      let successCount = 0
      for (const empId of bulkSelectedEmployees) {
        const { error } = await supabase.from('daily_tasks').insert({
          title: newDailyTitle.trim(),
          assigned_to: empId,
          created_by: session?.user.id,
        })
        if (!error) successCount++
      }
      setNewDailyTitle('')
      setBulkSelectedEmployees(new Set())
      setBulkAssignMode(false)
      loadDailyTasks()
      setMessage({ type: 'success', text: `Task assigned to ${successCount} employee${successCount !== 1 ? 's' : ''}!` })
    } else {
      const { error } = await supabase.from('daily_tasks').insert({
        title: newDailyTitle.trim(),
        assigned_to: newDailyAssignee || null,
        created_by: session?.user.id,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setNewDailyTitle('')
        setNewDailyAssignee('')
        loadDailyTasks()
        setMessage({ type: 'success', text: 'Daily task created!' })
      }
    }
  }

  function toggleBulkEmployee(empId: string) {
    const updated = new Set(bulkSelectedEmployees)
    if (updated.has(empId)) {
      updated.delete(empId)
    } else {
      updated.add(empId)
    }
    setBulkSelectedEmployees(updated)
  }

  function selectAllEmployees() {
    if (bulkSelectedEmployees.size === employees.length) {
      setBulkSelectedEmployees(new Set())
    } else {
      setBulkSelectedEmployees(new Set(employees.map(e => e.id)))
    }
  }

  async function toggleDailyActive(task: DailyTask) {
    await supabase
      .from('daily_tasks')
      .update({ is_active: !task.is_active })
      .eq('id', task.id)
    loadDailyTasks()
  }

  async function deleteDailyTask(id: string) {
    await supabase.from('daily_tasks').delete().eq('id', id)
    loadDailyTasks()
  }

  // ---- One-Time Task Actions ----
  async function addOneTimeTask() {
    if (!newOTTitle.trim() || !newOTAssignee) return
    setMessage(null)
    const { data: { session } } = await supabase.auth.getSession()

    const { error } = await supabase.from('one_time_tasks').insert({
      title: newOTTitle.trim(),
      notes: newOTNotes,
      assigned_to: newOTAssignee,
      due_date: newOTDueDate || null,
      priority: newOTPriority,
      created_by: session?.user.id,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setNewOTTitle('')
      setNewOTAssignee('')
      setNewOTDueDate('')
      setNewOTPriority('normal')
      setNewOTNotes('')
      loadOneTimeTasks()
      setMessage({ type: 'success', text: 'One-time task created!' })
    }
  }

  async function deleteOneTimeTask(id: string) {
    await supabase.from('one_time_tasks').delete().eq('id', id)
    loadOneTimeTasks()
  }

  function getEmployeeName(id: string | null) {
    if (!id) return 'Everyone'
    return employees.find(e => e.id === id)?.full_name || 'Unknown'
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-brand-600" />
          Task Management
        </h1>
        <p className="text-gray-500 mt-1">Create and manage daily recurring tasks and one-time assignments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 max-w-lg">
        <button
          onClick={() => setActiveTab('daily')}
          className={clsx(
            'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
            activeTab === 'daily' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Daily Tasks
        </button>
        <button
          onClick={() => setActiveTab('onetime')}
          className={clsx(
            'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
            activeTab === 'onetime' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          One-Time Tasks
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={clsx(
            'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1',
            activeTab === 'dashboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Dashboard
        </button>
      </div>

      {message && (
        <div className={clsx(
          'mb-4 px-4 py-2 rounded-lg text-sm',
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {message.text}
        </div>
      )}

      {/* DAILY TASKS TAB */}
      {activeTab === 'daily' && (
        <div>
          {/* Add Daily Task */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Add Daily Task</h3>
              <button
                onClick={() => {
                  setBulkAssignMode(!bulkAssignMode)
                  setBulkSelectedEmployees(new Set())
                }}
                className={clsx(
                  'text-xs font-medium px-2 py-1 rounded',
                  bulkAssignMode
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-brand-600 hover:bg-brand-50'
                )}
              >
                <Users className="w-3 h-3 inline mr-1" />
                {bulkAssignMode ? 'Cancel Bulk' : 'Bulk Assign'}
              </button>
            </div>

            {bulkAssignMode ? (
              <div>
                <input
                  type="text"
                  value={newDailyTitle}
                  onChange={(e) => setNewDailyTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 mb-3"
                />
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Select employees:</span>
                    <button
                      onClick={selectAllEmployees}
                      className="text-xs text-brand-600 hover:text-brand-700"
                    >
                      {bulkSelectedEmployees.size === employees.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {employees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => toggleBulkEmployee(emp.id)}
                        className={clsx(
                          'px-3 py-1.5 text-xs rounded-full border transition-colors',
                          bulkSelectedEmployees.has(emp.id)
                            ? 'bg-brand-100 border-brand-300 text-brand-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        {emp.full_name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addDailyTask}
                  disabled={!newDailyTitle.trim() || bulkSelectedEmployees.size === 0}
                  className="flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Assign to {bulkSelectedEmployees.size} Employee{bulkSelectedEmployees.size !== 1 ? 's' : ''}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newDailyTitle}
                  onChange={(e) => setNewDailyTitle(e.target.value)}
                  placeholder="Task title..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  onKeyDown={(e) => e.key === 'Enter' && addDailyTask()}
                />
                <select
                  value={newDailyAssignee}
                  onChange={(e) => setNewDailyAssignee(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Everyone</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
                <button
                  onClick={addDailyTask}
                  disabled={!newDailyTitle.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Daily Task List */}
          <div className="space-y-2">
            {dailyTasks.map((task) => (
              <div
                key={task.id}
                className={clsx(
                  'bg-white border rounded-lg p-4 flex items-center gap-3 transition-opacity',
                  task.is_active ? 'border-gray-200' : 'border-gray-100 opacity-50'
                )}
              >
                <button onClick={() => toggleDailyActive(task)} className="flex-shrink-0">
                  {task.is_active ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium', task.is_active ? 'text-gray-900' : 'text-gray-400 line-through')}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    {task.assigned_to ? (
                      <><UserIcon className="w-3 h-3" /> {getEmployeeName(task.assigned_to)}</>
                    ) : (
                      <><Users className="w-3 h-3" /> Everyone</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => deleteDailyTask(task.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {dailyTasks.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No daily tasks yet</div>
            )}
          </div>
        </div>
      )}

      {/* ONE-TIME TASKS TAB */}
      {activeTab === 'onetime' && (
        <div>
          {/* Add One-Time Task */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add One-Time Task</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={newOTTitle}
                onChange={(e) => setNewOTTitle(e.target.value)}
                placeholder="Task title..."
                className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <select
                value={newOTAssignee}
                onChange={(e) => setNewOTAssignee(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
              <input
                type="date"
                value={newOTDueDate}
                onChange={(e) => setNewOTDueDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={newOTPriority}
                onChange={(e) => setNewOTPriority(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                type="text"
                value={newOTNotes}
                onChange={(e) => setNewOTNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={addOneTimeTask}
              disabled={!newOTTitle.trim() || !newOTAssignee}
              className="flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>

          {/* Filter */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Show completed tasks
            </label>
          </div>

          {/* One-Time Task List */}
          <div className="space-y-2">
            {oneTimeTasks.map((task) => (
              <div
                key={task.id}
                className={clsx(
                  'bg-white border rounded-lg p-4 flex items-center gap-3',
                  task.is_complete ? 'border-gray-100 opacity-50' : 'border-gray-200'
                )}
              >
                {task.is_complete ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className={clsx('w-5 h-5 flex-shrink-0', PRIORITY_COLORS[task.priority])} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium', task.is_complete ? 'text-gray-400 line-through' : 'text-gray-900')}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" /> {getEmployeeName(task.assigned_to)}
                    </span>
                    {task.due_date && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CalIcon className="w-3 h-3" /> {task.due_date}
                      </span>
                    )}
                    <span className={clsx('text-xs font-medium', PRIORITY_COLORS[task.priority])}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  {task.notes && <p className="text-xs text-gray-400 mt-1">{task.notes}</p>}
                </div>
                <button
                  onClick={() => deleteOneTimeTask(task.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {oneTimeTasks.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                {showCompleted ? 'No tasks found' : 'No pending tasks'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Today&apos;s Task Completion</h3>
              <button
                onClick={loadDashboard}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Refresh
              </button>
            </div>

            {dashboardLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading dashboard...</div>
            ) : (
              <div className="space-y-3">
                {completionStatuses.map((status) => {
                  const pct = status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0
                  const isAllDone = status.completed === status.total && status.total > 0

                  return (
                    <div key={status.userId} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-32 truncate">{status.name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all',
                            isAllDone ? 'bg-green-500' : pct > 0 ? 'bg-brand-500' : 'bg-gray-200'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={clsx(
                        'text-xs font-medium w-20 text-right',
                        isAllDone ? 'text-green-600' : 'text-gray-500'
                      )}>
                        {status.completed}/{status.total} ({pct}%)
                      </span>
                    </div>
                  )
                })}
                {completionStatuses.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">No employees found</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
