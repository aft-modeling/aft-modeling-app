'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Schedule, ScheduleBlock } from '@/lib/types'
import { Calendar, Plus, Trash2, Save, Clock, Coffee, Sun, Copy, ClipboardPaste, Zap } from 'lucide-react'
import clsx from 'clsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const ROLE_LABELS: Record<string, string> = {
  creative_director: 'Creative Director',
  editor: 'Editor',
  qa: 'QA Reviewer',
  admin: 'Admin',
}

interface Props {
  employees: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'>[]
}

interface BlockForm {
  id?: string
  start_time: string
  end_time: string
  label: string
  is_break: boolean
  notes: string
}

const STANDARD_PRESETS = [
  {
    name: '9-5 Standard',
    blocks: [
      { start_time: '09:00', end_time: '12:00', label: 'Morning Block', is_break: false, notes: '' },
      { start_time: '12:00', end_time: '13:00', label: 'Lunch Break', is_break: true, notes: '' },
      { start_time: '13:00', end_time: '17:00', label: 'Afternoon Block', is_break: false, notes: '' },
    ],
  },
  {
    name: '8-4 Early',
    blocks: [
      { start_time: '08:00', end_time: '12:00', label: 'Morning Block', is_break: false, notes: '' },
      { start_time: '12:00', end_time: '12:30', label: 'Lunch Break', is_break: true, notes: '' },
      { start_time: '12:30', end_time: '16:00', label: 'Afternoon Block', is_break: false, notes: '' },
    ],
  },
  {
    name: '10-6 Late',
    blocks: [
      { start_time: '10:00', end_time: '13:00', label: 'Morning Block', is_break: false, notes: '' },
      { start_time: '13:00', end_time: '14:00', label: 'Lunch Break', is_break: true, notes: '' },
      { start_time: '14:00', end_time: '18:00', label: 'Afternoon Block', is_break: false, notes: '' },
    ],
  },
]

export default function AdminScheduleView({ employees }: Props) {
  const supabase = createClient()
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDay, setSelectedDay] = useState<number>(1) // Monday
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [blocks, setBlocks] = useState<BlockForm[]>([])
  const [isOffDay, setIsOffDay] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [weekSchedules, setWeekSchedules] = useState<Record<number, { schedule: Schedule; blocks: ScheduleBlock[] }>>({})
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [showCopyWeekMenu, setShowCopyWeekMenu] = useState(false)
  const [showPresetMenu, setShowPresetMenu] = useState(false)

  // Load full week overview for selected employee
  const loadWeekOverview = useCallback(async (userId: string) => {
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)

    if (!schedules) return

    const overview: Record<number, { schedule: Schedule; blocks: ScheduleBlock[] }> = {}
    for (const s of schedules) {
      const { data: sBlocks } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('schedule_id', s.id)
        .order('start_time')
      overview[s.day_of_week] = { schedule: s, blocks: sBlocks || [] }
    }
    setWeekSchedules(overview)
  }, [supabase])

  // Load schedule for selected employee + day
  const loadSchedule = useCallback(async (userId: string, day: number) => {
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('day_of_week', day)
      .single()

    if (data) {
      setSchedule(data)
      setIsOffDay(data.is_off_day)

      const { data: blockData } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('schedule_id', data.id)
        .order('start_time')

      setBlocks(
        (blockData || []).map((b) => ({
          id: b.id,
          start_time: b.start_time.substring(0, 5),
          end_time: b.end_time.substring(0, 5),
          label: b.label,
          is_break: b.is_break,
          notes: b.notes,
        }))
      )
    } else {
      setSchedule(null)
      setIsOffDay(false)
      setBlocks([])
    }
  }, [supabase])

  useEffect(() => {
    if (selectedEmployee) {
      loadSchedule(selectedEmployee, selectedDay)
      loadWeekOverview(selectedEmployee)
    }
  }, [selectedEmployee, selectedDay, loadSchedule, loadWeekOverview])

  function addBlock() {
    setBlocks([...blocks, {
      start_time: '09:00',
      end_time: '17:00',
      label: '',
      is_break: false,
      notes: '',
    }])
  }

  function removeBlock(index: number) {
    setBlocks(blocks.filter((_, i) => i !== index))
  }

  function updateBlock(index: number, field: keyof BlockForm, value: string | boolean) {
    const updated = [...blocks]
    updated[index] = { ...updated[index], [field]: value }
    setBlocks(updated)
  }

  function applyPreset(preset: typeof STANDARD_PRESETS[0]) {
    setBlocks(preset.blocks.map(b => ({ ...b })))
    setIsOffDay(false)
    setShowPresetMenu(false)
    setMessage({ type: 'success', text: `Applied "${preset.name}" preset. Click Save to confirm.` })
  }

  async function copyDayTo(targetDay: number) {
    if (!selectedEmployee) return
    setSaving(true)
    setMessage(null)
    setShowCopyMenu(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Check if target day already has a schedule
      const { data: existingSchedule } = await supabase
        .from('schedules')
        .select('id')
        .eq('user_id', selectedEmployee)
        .eq('day_of_week', targetDay)
        .single()

      let targetScheduleId: string

      if (existingSchedule) {
        // Update existing
        await supabase
          .from('schedules')
          .update({ is_off_day: isOffDay, updated_at: new Date().toISOString() })
          .eq('id', existingSchedule.id)
        targetScheduleId = existingSchedule.id

        // Delete existing blocks
        await supabase
          .from('schedule_blocks')
          .delete()
          .eq('schedule_id', existingSchedule.id)
      } else {
        // Create new schedule for target day
        const { data: newSchedule, error } = await supabase
          .from('schedules')
          .insert({
            user_id: selectedEmployee,
            day_of_week: targetDay,
            is_off_day: isOffDay,
            created_by: session.user.id,
          })
          .select()
          .single()

        if (error) throw error
        targetScheduleId = newSchedule.id
      }

      // Copy blocks
      if (!isOffDay && blocks.length > 0) {
        const blockInserts = blocks.map((b) => ({
          schedule_id: targetScheduleId,
          start_time: b.start_time + ':00',
          end_time: b.end_time + ':00',
          label: b.label,
          is_break: b.is_break,
          notes: b.notes,
          created_by: session.user.id,
        }))

        const { error: blockError } = await supabase
          .from('schedule_blocks')
          .insert(blockInserts)

        if (blockError) throw blockError
      }

      setMessage({ type: 'success', text: `Schedule copied to ${DAYS[targetDay]}!` })
      loadWeekOverview(selectedEmployee)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to copy schedule' })
    } finally {
      setSaving(false)
    }
  }

  async function copyWeekToEmployee(targetEmployeeId: string) {
    if (!selectedEmployee || targetEmployeeId === selectedEmployee) return
    setSaving(true)
    setMessage(null)
    setShowCopyWeekMenu(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      for (let day = 0; day < 7; day++) {
        const sourceDay = weekSchedules[day]
        if (!sourceDay) continue

        // Check if target already has schedule for this day
        const { data: existing } = await supabase
          .from('schedules')
          .select('id')
          .eq('user_id', targetEmployeeId)
          .eq('day_of_week', day)
          .single()

        let targetScheduleId: string

        if (existing) {
          await supabase
            .from('schedules')
            .update({ is_off_day: sourceDay.schedule.is_off_day, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          await supabase.from('schedule_blocks').delete().eq('schedule_id', existing.id)
          targetScheduleId = existing.id
        } else {
          const { data: newSched, error } = await supabase
            .from('schedules')
            .insert({
              user_id: targetEmployeeId,
              day_of_week: day,
              is_off_day: sourceDay.schedule.is_off_day,
              created_by: session.user.id,
            })
            .select()
            .single()

          if (error) throw error
          targetScheduleId = newSched.id
        }

        // Copy blocks
        if (!sourceDay.schedule.is_off_day && sourceDay.blocks.length > 0) {
          const blockInserts = sourceDay.blocks.map((b) => ({
            schedule_id: targetScheduleId,
            start_time: b.start_time,
            end_time: b.end_time,
            label: b.label,
            is_break: b.is_break,
            notes: b.notes,
            created_by: session.user.id,
          }))

          await supabase.from('schedule_blocks').insert(blockInserts)
        }
      }

      const targetName = employees.find(e => e.id === targetEmployeeId)?.full_name || 'employee'
      setMessage({ type: 'success', text: `Full week copied to ${targetName}!` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to copy week' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!selectedEmployee) return
    setSaving(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      let scheduleId = schedule?.id

      if (scheduleId) {
        // Update existing schedule
        await supabase
          .from('schedules')
          .update({ is_off_day: isOffDay, updated_at: new Date().toISOString() })
          .eq('id', scheduleId)
      } else {
        // Create new schedule
        const { data: newSchedule, error } = await supabase
          .from('schedules')
          .insert({
            user_id: selectedEmployee,
            day_of_week: selectedDay,
            is_off_day: isOffDay,
            created_by: session.user.id,
          })
          .select()
          .single()

        if (error) throw error
        scheduleId = newSchedule.id
        setSchedule(newSchedule)
      }

      // Delete existing blocks and re-create
      await supabase
        .from('schedule_blocks')
        .delete()
        .eq('schedule_id', scheduleId)

      if (!isOffDay && blocks.length > 0) {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const blockInserts = blocks.map((b) => ({
          schedule_id: scheduleId,
          start_time: b.start_time + ':00',
          end_time: b.end_time + ':00',
          label: b.label,
          is_break: b.is_break,
          notes: b.notes,
          created_by: currentSession?.user.id,
        }))

        const { error: blockError } = await supabase
          .from('schedule_blocks')
          .insert(blockInserts)

        if (blockError) throw blockError
      }

      setMessage({ type: 'success', text: 'Schedule saved!' })
      loadWeekOverview(selectedEmployee)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const selectedEmployeeName = employees.find(e => e.id === selectedEmployee)?.full_name || ''

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-brand-600" />
          Weekly Schedule Editor
        </h1>
        <p className="text-gray-500 mt-1">Set weekly schedules for each employee</p>
      </div>

      {/* Employee Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        >
          <option value="">Choose an employee...</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name} ({ROLE_LABELS[emp.role] || emp.role})
            </option>
          ))}
        </select>
      </div>

      {selectedEmployee && (
        <>
          {/* Week Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">
                Week Overview for {selectedEmployeeName}
              </h2>
              <div className="relative">
                <button
                  onClick={() => setShowCopyWeekMenu(!showCopyWeekMenu)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  Copy Week To...
                </button>
                {showCopyWeekMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[200px]">
                    {employees
                      .filter(e => e.id !== selectedEmployee)
                      .map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => copyWeekToEmployee(emp.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          {emp.full_name} ({ROLE_LABELS[emp.role] || emp.role})
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, i) => {
                const dayData = weekSchedules[i]
                const isSelected = selectedDay === i
                const isOff = dayData?.schedule?.is_off_day
                const blockCount = dayData?.blocks?.length || 0

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    className={clsx(
                      'p-3 rounded-lg text-center transition-all border-2',
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-transparent hover:border-gray-200 bg-gray-50',
                      isOff && !isSelected && 'opacity-50'
                    )}
                  >
                    <div className="text-xs font-medium text-gray-500">{DAY_SHORT[i]}</div>
                    {dayData ? (
                      isOff ? (
                        <Sun className="w-4 h-4 mx-auto mt-1 text-amber-500" />
                      ) : (
                        <div className="text-xs mt-1 text-gray-600">{blockCount} block{blockCount !== 1 ? 's' : ''}</div>
                      )
                    ) : (
                      <div className="text-xs mt-1 text-gray-300">Not set</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day Editor */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {DAYS[selectedDay]}
              </h2>
              <div className="flex items-center gap-3">
                {/* Quick Preset Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowPresetMenu(!showPresetMenu)}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 rounded hover:bg-amber-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Quick Preset
                  </button>
                  {showPresetMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                      {STANDARD_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => applyPreset(preset)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Copy Day Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowCopyMenu(!showCopyMenu)}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Day To...
                  </button>
                  {showCopyMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                      {DAYS.map((dayName, i) => (
                        i !== selectedDay && (
                          <button
                            key={i}
                            onClick={() => copyDayTo(i)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                          >
                            {dayName}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOffDay}
                    onChange={(e) => setIsOffDay(e.target.checked)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-600">Day Off</span>
                </label>
              </div>
            </div>

            {isOffDay ? (
              <div className="text-center py-8 text-gray-400">
                <Sun className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p>This is a day off - no schedule blocks needed.</p>
              </div>
            ) : (
              <>
                {/* Schedule Blocks */}
                <div className="space-y-3 mb-4">
                  {blocks.map((block, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'border rounded-lg p-4',
                        block.is_break ? 'border-amber-200 bg-amber-50' : 'border-gray-200'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                            <input
                              type="time"
                              value={block.start_time}
                              onChange={(e) => updateBlock(i, 'start_time', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                            <input
                              type="time"
                              value={block.end_time}
                              onChange={(e) => updateBlock(i, 'end_time', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                            <input
                              type="text"
                              value={block.label}
                              onChange={(e) => updateBlock(i, 'label', e.target.value)}
                              placeholder="e.g. Editing, Meeting..."
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div className="flex items-end gap-3">
                            <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                              <input
                                type="checkbox"
                                checked={block.is_break}
                                onChange={(e) => updateBlock(i, 'is_break', e.target.checked)}
                                className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                              />
                              <Coffee className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-sm text-gray-600">Break</span>
                            </label>
                          </div>
                        </div>
                        <button
                          onClick={() => removeBlock(i)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2">
                        <input
                          type="text"
                          value={block.notes}
                          onChange={(e) => updateBlock(i, 'notes', e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addBlock}
                  className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Time Block
                </button>
              </>
            )}

            {/* Save */}
            <div className="mt-6 flex items-center gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
              {message && (
                <p className={clsx(
                  'text-sm',
                  message.type === 'success' ? 'text-green-600' : 'text-red-600'
                )}>
                  {message.text}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
