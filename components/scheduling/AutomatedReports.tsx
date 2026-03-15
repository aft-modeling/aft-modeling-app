'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Mail, Clock, Bell, BellOff, Plus, Trash2, Save,
  CheckCircle, AlertCircle, Loader2, Send
} from 'lucide-react'

interface ReportSettings {
  id: string
  daily_enabled: boolean
  weekly_enabled: boolean
  daily_send_hour: number
  daily_send_minute: number
  recipients: string[]
  updated_at: string
}

export default function AutomatedReports() {
  const supabase = createClient()

  const [settings, setSettings] = useState<ReportSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [newRecipient, setNewRecipient] = useState('')
  const [recipientError, setRecipientError] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('report_settings')
      .select('*')
      .eq('id', 'default')
      .single()

    if (error) {
      console.error('Failed to load report settings:', error.message)
    } else if (data) {
      setSettings({
        ...data,
        recipients: Array.isArray(data.recipients) ? data.recipients : JSON.parse(data.recipients),
      })
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    setSaveStatus('idle')

    const { error } = await supabase
      .from('report_settings')
      .update({
        daily_enabled: settings.daily_enabled,
        weekly_enabled: settings.weekly_enabled,
        daily_send_hour: settings.daily_send_hour,
        daily_send_minute: settings.daily_send_minute,
        recipients: settings.recipients,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default')

    setSaving(false)
    if (error) {
      console.error('Failed to save report settings:', error.message)
      setSaveStatus('error')
    } else {
      setSaveStatus('success')
    }

    setTimeout(() => setSaveStatus('idle'), 3000)
  }

  function addRecipient() {
    if (!settings) return
    setRecipientError('')

    const email = newRecipient.trim().toLowerCase()
    if (!email) return

    // Basic email validation
    if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
      setRecipientError('Please enter a valid email address')
      return
    }

    if (settings.recipients.includes(email)) {
      setRecipientError('This email is already in the list')
      return
    }

    setSettings({ ...settings, recipients: [...settings.recipients, email] })
    setNewRecipient('')
  }

  function removeRecipient(email: string) {
    if (!settings) return
    setSettings({
      ...settings,
      recipients: settings.recipients.filter(r => r !== email),
    })
  }

  function formatTime(hour: number, minute: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = minute.toString().padStart(2, '0')
    return `${displayHour}:${displayMinute} ${ampm}`
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-gray-600">Failed to load report settings.</p>
          <button
            onClick={fetchSettings}
            className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Automated Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure automated daily and weekly task report emails.
          </p>
        </div>

        {/* Report Toggles */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Report Types</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Daily Reports Toggle */}
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  settings.daily_enabled ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  {settings.daily_enabled
                    ? <Bell className="w-5 h-5 text-green-600" />
                    : <BellOff className="w-5 h-5 text-gray-400" />
                  }
                </div>
                <div>
                  <p className="font-medium text-gray-900">Daily Task Reports</p>
                  <p className="text-sm text-gray-500">
                    A summary of each employee&apos;s completed and missed tasks, sent every day.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, daily_enabled: !settings.daily_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.daily_enabled ? 'bg-brand-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  settings.daily_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Weekly Reports Toggle */}
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  settings.weekly_enabled ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  {settings.weekly_enabled
                    ? <Bell className="w-5 h-5 text-green-600" />
                    : <BellOff className="w-5 h-5 text-gray-400" />
                  }
                </div>
                <div>
                  <p className="font-medium text-gray-900">Weekly Summary Reports</p>
                  <p className="text-sm text-gray-500">
                    A weekly rollup of all task completion across the team, sent every Monday.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, weekly_enabled: !settings.weekly_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.weekly_enabled ? 'bg-brand-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  settings.weekly_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Send Time */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Send Time</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center gap-4 mb-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600">
                Daily reports are sent at this time each day (Pacific Standard Time).
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <select
                value={settings.daily_send_hour}
                onChange={(e) => setSettings({ ...settings, daily_send_hour: parseInt(e.target.value) })}
                className="block w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                  </option>
                ))}
              </select>
              <span className="text-gray-400 font-medium">:</span>
              <select
                value={settings.daily_send_minute}
                onChange={(e) => setSettings({ ...settings, daily_send_minute: parseInt(e.target.value) })}
                className="block w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">PST</span>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Currently set to {formatTime(settings.daily_send_hour, settings.daily_send_minute)} PST
            </p>
          </div>
        </div>

        {/* Recipients */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Recipients</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center gap-4 mb-4">
              <Mail className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600">
                Report emails will be sent to the following addresses.
              </p>
            </div>

            {/* Recipient List */}
            <div className="space-y-2 mb-4">
              {settings.recipients.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                      <Send className="w-3.5 h-3.5 text-brand-600" />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{email}</span>
                  </div>
                  <button
                    onClick={() => removeRecipient(email)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remove recipient"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {settings.recipients.length === 0 && (
                <p className="text-sm text-gray-400 italic py-2">No recipients added yet.</p>
              )}
            </div>

            {/* Add Recipient */}
            <div className="flex gap-2">
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => {
                  setNewRecipient(e.target.value)
                  setRecipientError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                placeholder="Enter email address"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-gray-400"
              />
              <button
                onClick={addRecipient}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {recipientError && (
              <p className="mt-2 text-sm text-red-500">{recipientError}</p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center gap-2">
            {saveStatus === 'success' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Settings saved successfully</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 font-medium">Failed to save settings</span>
              </>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl px-6 py-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Changing the send time here updates when the daily report runs.
            The cron schedule on Vercel will need to match this setting for the new time to take effect.
            Contact your developer if you change the time from the default 6:00 PM PST.
          </p>
        </div>
      </div>
    </div>
  )
}
