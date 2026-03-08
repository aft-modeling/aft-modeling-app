'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Schedule, ScheduleBlock } from '@/lib/types'
import { Clock, Sun, Coffee } from 'lucide-react'
import clsx from 'clsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Props {
  userId: string
}

interface DaySchedule {
  schedule: Schedule
  blocks: ScheduleBlock[]
}

export default function EmployeeScheduleView({ userId }: Props) {
  const supabase = createClient()
  const [weekSchedules, setWeekSchedules] = useState<Record<number, DaySchedule>>({})
  const [loading, setLoading] = useState(true)

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', userId)

    if (!schedules) {
      setLoading(false)
      return
    }

    const overview: Record<number, DaySchedule> = {}
    for (const s of schedules) {
      const { data: blocks } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('schedule_id', s.id)
        .order('start_time')
      overview[s.day_of_week] = { schedule: s, blocks: blocks || [] }
    }
    setWeekSchedules(overview)
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const today = new Date().getDay()

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Loading schedule...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-6 h-6 text-brand-600" />
          My Weekly Schedule
        </h1>
        <p className="text-gray-500 mt-1">Your assigned schedule for the week</p>
      </div>

      {Object.keys(weekSchedules).length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No schedule has been set for you yet.</p>
          <p className="text-xs mt-1">Contact your admin to set up your weekly schedule.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map((dayName, i) => {
            const dayData = weekSchedules[i]
            const isToday = i === today

            if (!dayData) {
              return (
                <div
                  key={i}
                  className={clsx(
                    'bg-white border rounded-lg p-4 opacity-40',
                    isToday ? 'border-brand-300' : 'border-gray-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'text-sm font-semibold w-24',
                      isToday ? 'text-brand-600' : 'text-gray-400'
                    )}>
                      {dayName}
                    </span>
                    <span className="text-sm text-gray-300">No schedule set</span>
                    {isToday && (
                      <span className="ml-auto text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        Today
                      </span>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={i}
                className={clsx(
                  'bg-white border rounded-lg p-4',
                  isToday ? 'border-brand-300 ring-1 ring-brand-100' : 'border-gray-200',
                  dayData.schedule.is_off_day && 'bg-amber-50 border-amber-200'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={clsx(
                    'text-sm font-semibold w-24',
                    isToday ? 'text-brand-600' : 'text-gray-700'
                  )}>
                    {dayName}
                  </span>
                  {dayData.schedule.is_off_day && (
                    <span className="flex items-center gap-1 text-sm text-amber-600">
                      <Sun className="w-4 h-4" /> Day Off
                    </span>
                  )}
                  {isToday && (
                    <span className="ml-auto text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                      Today
                    </span>
                  )}
                </div>

                {!dayData.schedule.is_off_day && dayData.blocks.length > 0 && (
                  <div className="ml-24 space-y-1.5">
                    {dayData.blocks.map((block) => (
                      <div
                        key={block.id}
                        className={clsx(
                          'flex items-center gap-3 text-sm px-3 py-2 rounded',
                          block.is_break ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
                        )}
                      >
                        {block.is_break ? (
                          <Coffee className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="font-medium">
                          {block.start_time.substring(0, 5)} â {block.end_time.substring(0, 5)}
                        </span>
                        {block.label && <span className="text-gray-500">{block.label}</span>}
                        {block.notes && <span className="text-gray-400 text-xs">({block.notes})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
