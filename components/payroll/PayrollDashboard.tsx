'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Calendar,
  Plus,
  Lock,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Check,
  AlertCircle,
  Clock,
  Users,
  FileText,
  MessageSquare,
} from 'lucide-react'

interface Editor {
  id: string
  full_name: string
  email: string
  role: string
}

interface PayPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  created_by: string
  created_at: string
}

interface FinishedClip {
  id: string
  editor_id: string
  finished_at: string
}

interface Commission {
  id: string
  pay_period_id: string
  editor_id: string
  commission_amount: number
  commission_notes: string | null
  added_by: string
  added_at: string
}

interface Snapshot {
  id: string
  pay_period_id: string
  editor_id: string
  finished_clips_count: number
  base_pay: number
  commission_amount: number
  total_pay: number
  snapshot_taken_at: string
}

interface PayrollDashboardProps {
  editors: Editor[]
  payPeriods: PayPeriod[]
  openPeriod: PayPeriod | null
  finishedClips: FinishedClip[]
  commissions: Commission[]
  snapshots: Snapshot[]
  adminId: string
}

const RATE_PER_CLIP = 1.0

export default function PayrollDashboard({
  editors,
  payPeriods: initialPayPeriods,
  openPeriod: initialOpenPeriod,
  finishedClips: initialFinishedClips,
  commissions: initialCommissions,
  snapshots: initialSnapshots,
  adminId,
}: PayrollDashboardProps) {
  const supabase = createClient()
  const router = useRouter()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPeriodName, setNewPeriodName] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [editingCommission, setEditingCommission] = useState<string | null>(null)
  const [commissionAmount, setCommissionAmount] = useState('')
  const [commissionNotes, setCommissionNotes] = useState('')
  const [savingCommission, setSavingCommission] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'chatter'>('editor')
  const [error, setError] = useState<string | null>(null)

  const openPeriod = initialOpenPeriod
  const finishedClips = initialFinishedClips
  const commissions = initialCommissions
  const closedPeriods = initialPayPeriods.filter(p => p.status === 'closed')

  const editorPayroll = useMemo(() => {
    return editors.map(editor => {
      const clipCount = finishedClips.filter(c => c.editor_id === editor.id).length
      const basePay = clipCount * RATE_PER_CLIP
      const commission = commissions.find(c => c.editor_id === editor.id)
      const commissionAmt = commission ? Number(commission.commission_amount) : 0
      const totalPay = basePay + commissionAmt
      return {
        editor, clipCount, basePay, commissionAmt,
        commissionNotes: commission?.commission_notes || null,
        commissionId: commission?.id || null, totalPay,
      }
    })
  }, [editors, finishedClips, commissions])

  const totalEstimatedPayroll = editorPayroll.reduce((sum, row) => sum + row.totalPay, 0)

  async function handleCreatePeriod() {
    if (!newPeriodName || !newStartDate || !newEndDate) { setError('Please fill in all fields'); return }
    if (openPeriod) { setError('There is already an open pay period. Close it before creating a new one.'); return }
    setCreating(true); setError(null)
    const { error: insertError } = await supabase.from('pay_periods').insert({
      name: newPeriodName, start_date: newStartDate, end_date: newEndDate, status: 'open', created_by: adminId,
    })
    if (insertError) { setError(insertError.message); setCreating(false); return }
    setNewPeriodName(''); setNewStartDate(''); setNewEndDate(''); setShowCreateForm(false); setCreating(false); router.refresh()
  }

  async function handleClosePeriod() {
    if (!openPeriod) return
    setClosing(true); setError(null)
    const snapshotRows = editorPayroll.map(row => ({
      pay_period_id: openPeriod.id, editor_id: row.editor.id,
      finished_clips_count: row.clipCount, base_pay: row.basePay,
      commission_amount: row.commissionAmt, total_pay: row.totalPay,
    }))
    const { error: snapError } = await supabase.from('payroll_snapshots').insert(snapshotRows)
    if (snapError) { setError('Failed to create snapshots: ' + snapError.message); setClosing(false); return }
    const { error: closeError } = await supabase.from('pay_periods').update({ status: 'closed' }).eq('id', openPeriod.id)
    if (closeError) { setError('Failed to close pay period: ' + closeError.message); setClosing(false); return }
    setShowCloseConfirm(false); setClosing(false); router.refresh()
  }

  async function handleSaveCommission(editorId: string) {
    if (!openPeriod) return
    setSavingCommission(true); setError(null)
    const amount = parseFloat(commissionAmount) || 0
    const existingCommission = commissions.find(c => c.editor_id === editorId)
    if (existingCommission) {
      const { error: updateError } = await supabase.from('editor_commissions').update({
        commission_amount: amount, commission_notes: commissionNotes || null,
      }).eq('id', existingCommission.id)
      if (updateError) { setError(updateError.message); setSavingCommission(false); return }
    } else {
      const { error: insertError } = await supabase.from('editor_commissions').insert({
        pay_period_id: openPeriod.id, editor_id: editorId,
        commission_amount: amount, commission_notes: commissionNotes || null, added_by: adminId,
      })
      if (insertError) { setError(insertError.message); setSavingCommission(false); return }
    }
    setEditingCommission(null); setCommissionAmount(''); setCommissionNotes(''); setSavingCommission(false); router.refresh()
  }

  function startEditCommission(editorId: string, currentAmount: number, currentNotes: string | null) {
    setEditingCommission(editorId)
    setCommissionAmount(currentAmount > 0 ? currentAmount.toString() : '')
    setCommissionNotes(currentNotes || '')
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function getSnapshotsForPeriod(periodId: string) {
    return initialSnapshots.filter(s => s.pay_period_id === periodId).map(s => {
      const editor = editors.find(e => e.id === s.editor_id)
      return { ...s, editorName: editor?.full_name || 'Unknown' }
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
        <p className="text-gray-600 mt-1">Manage pay periods, editor earnings, and commissions</p>
        <div className="flex gap-1 mt-4 border-b border-gray-200">
          <button onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'editor' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Editor Payroll</div>
          </button>
          <button onClick={() => setActiveTab('chatter')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chatter' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Chatter Payroll</div>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {activeTab === 'editor' ? (
        <>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-600" />Pay Period
              </h2>
              <div className="flex gap-2">
                {openPeriod && (
                  <button onClick={() => setShowCloseConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                    <Lock className="w-3.5 h-3.5" />Close Pay Period
                  </button>
                )}
                <button onClick={() => { if (openPeriod) { setError('There is already an open pay period. Close it before creating a new one.') } else { setShowCreateForm(true) } }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors">
                  <Plus className="w-3.5 h-3.5" />New Pay Period
                </button>
              </div>
            </div>

            {openPeriod ? (
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{openPeriod.name}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Open</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{formatDate(openPeriod.start_date)} — {formatDate(openPeriod.end_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEstimatedPayroll)}</p>
                  <p className="text-sm text-gray-500">total estimated payroll</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <Clock className="w-5 h-5 text-gray-400" />
                <p className="text-gray-600">No active pay period. Create one to start tracking payroll.</p>
              </div>
            )}

            {showCreateForm && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                <h3 className="font-medium text-gray-900">Create New Pay Period</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm text-gray-600 mb-1">Period Name</label>
                    <input type="text" value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)} placeholder="e.g. March 1–15, 2026"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">Start Date</label>
                    <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" /></div>
                  <div><label className="block text-sm text-gray-600 mb-1">End Date</label>
                    <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500" /></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCreatePeriod} disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                    {creating ? 'Creating...' : 'Create Pay Period'}</button>
                  <button onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </div>
            )}

            {showCloseConfirm && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium mb-3">This will lock the pay period and take a final snapshot. Are you sure?</p>
                <div className="flex gap-2">
                  <button onClick={handleClosePeriod} disabled={closing}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors">
                    {closing ? 'Closing...' : 'Yes, Close Pay Period'}</button>
                  <button onClick={() => setShowCloseConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />Editor Breakdown
              {openPeriod && (<span className="text-sm font-normal text-gray-500">— {openPeriod.name}</span>)}
            </h2>
            {!openPeriod ? (
              <p className="text-gray-500 text-sm py-4">No active pay period. Create one to see editor earnings.</p>
            ) : editors.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No editors found in the system.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-600">Employee</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600">Finished Clips</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600">Base Pay</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600">Commission</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600">Total Estimated Pay</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600">Actions</th>
                  </tr></thead>
                  <tbody>
                    {editorPayroll.map((row) => (
                      <tr key={row.editor.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-900">{row.editor.full_name}</p>
                          <p className="text-xs text-gray-500">{row.editor.email}</p>
                        </td>
                        <td className="text-right py-3 px-3 font-mono">{row.clipCount}</td>
                        <td className="text-right py-3 px-3 font-mono">{formatCurrency(row.basePay)}</td>
                        <td className="text-right py-3 px-3">
                          {editingCommission === row.editor.id ? (
                            <div className="flex flex-col items-end gap-1">
                              <input type="number" step="0.01" min="0" value={commissionAmount} onChange={e => setCommissionAmount(e.target.value)}
                                placeholder="0.00" className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-brand-500" />
                              <input type="text" value={commissionNotes} onChange={e => setCommissionNotes(e.target.value)}
                                placeholder="Note (optional)" className="w-40 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-brand-500" />
                              <div className="flex gap-1 mt-1">
                                <button onClick={() => handleSaveCommission(row.editor.id)} disabled={savingCommission}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingCommission(null)}
                                  className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono">{formatCurrency(row.commissionAmt)}</span>
                              {row.commissionNotes && (<p className="text-xs text-gray-400 mt-0.5">{row.commissionNotes}</p>)}
                            </div>
                          )}
                        </td>
                        <td className="text-right py-3 px-3 font-mono font-semibold">{formatCurrency(row.totalPay)}</td>
                        <td className="text-right py-3 px-3">
                          {editingCommission !== row.editor.id && (
                            <button onClick={() => startEditCommission(row.editor.id, row.commissionAmt, row.commissionNotes)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 rounded hover:bg-brand-100 transition-colors">
                              <Edit3 className="w-3 h-3" />{row.commissionAmt > 0 ? 'Edit' : 'Add'} Commission
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className="py-3 px-3 font-semibold text-gray-900">Total</td>
                    <td className="text-right py-3 px-3 font-mono font-semibold">{editorPayroll.reduce((s, r) => s + r.clipCount, 0)}</td>
                    <td className="text-right py-3 px-3 font-mono font-semibold">{formatCurrency(editorPayroll.reduce((s, r) => s + r.basePay, 0))}</td>
                    <td className="text-right py-3 px-3 font-mono font-semibold">{formatCurrency(editorPayroll.reduce((s, r) => s + r.commissionAmt, 0))}</td>
                    <td className="text-right py-3 px-3 font-mono font-bold text-brand-700">{formatCurrency(totalEstimatedPayroll)}</td>
                    <td></td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <button onClick={() => setHistoryExpanded(!historyExpanded)} className="w-full flex items-center justify-between p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />Pay Period History
                <span className="text-sm font-normal text-gray-500">({closedPeriods.length} closed period{closedPeriods.length !== 1 ? 's' : ''})</span>
              </h2>
              {historyExpanded ? (<ChevronUp className="w-5 h-5 text-gray-400" />) : (<ChevronDown className="w-5 h-5 text-gray-400" />)}
            </button>
            {historyExpanded && (
              <div className="px-6 pb-6 space-y-3">
                {closedPeriods.length === 0 ? (
                  <p className="text-gray-500 text-sm">No closed pay periods yet.</p>
                ) : (
                  closedPeriods.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()).map(period => {
                    const periodSnapshots = getSnapshotsForPeriod(period.id)
                    const periodTotal = periodSnapshots.reduce((s, snap) => s + Number(snap.total_pay), 0)
                    const isExpanded = expandedHistoryId === period.id
                    return (
                      <div key={period.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => setExpandedHistoryId(isExpanded ? null : period.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{period.name}</p>
                            <p className="text-sm text-gray-500">{formatDate(period.start_date)} — {formatDate(period.end_date)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">{formatCurrency(periodTotal)}</p>
                              <p className="text-xs text-gray-500">{periodSnapshots.length} editor{periodSnapshots.length !== 1 ? 's' : ''}</p>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <Lock className="w-3 h-3 mr-1" />Closed
                            </span>
                            {isExpanded ? (<ChevronUp className="w-4 h-4 text-gray-400" />) : (<ChevronDown className="w-4 h-4 text-gray-400" />)}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4">
                            <table className="w-full text-sm">
                              <thead><tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-medium text-gray-600">Employee</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Finished Clips</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Base Pay</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Commission</th>
                                <th className="text-right py-2 px-3 font-medium text-gray-600">Total Pay</th>
                              </tr></thead>
                              <tbody>
                                {periodSnapshots.map(snap => (
                                  <tr key={snap.id} className="border-b border-gray-100">
                                    <td className="py-2 px-3 text-gray-900">{snap.editorName}</td>
                                    <td className="text-right py-2 px-3 font-mono">{snap.finished_clips_count}</td>
                                    <td className="text-right py-2 px-3 font-mono">{formatCurrency(Number(snap.base_pay))}</td>
                                    <td className="text-right py-2 px-3 font-mono">{formatCurrency(Number(snap.commission_amount))}</td>
                                    <td className="text-right py-2 px-3 font-mono font-semibold">{formatCurrency(Number(snap.total_pay))}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot><tr className="border-t-2 border-gray-300 bg-gray-50">
                                <td className="py-2 px-3 font-semibold">Total</td>
                                <td className="text-right py-2 px-3 font-mono font-semibold">{periodSnapshots.reduce((s, snap) => s + snap.finished_clips_count, 0)}</td>
                                <td className="text-right py-2 px-3 font-mono font-semibold">{formatCurrency(periodSnapshots.reduce((s, snap) => s + Number(snap.base_pay), 0))}</td>
                                <td className="text-right py-2 px-3 font-mono font-semibold">{formatCurrency(periodSnapshots.reduce((s, snap) => s + Number(snap.commission_amount), 0))}</td>
                                <td className="text-right py-2 px-3 font-mono font-bold">{formatCurrency(periodTotal)}</td>
                              </tr></tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chatter Payroll</h3>
            <p className="text-gray-500 text-sm mb-4">
              Chatter payroll tracking is coming soon. This section will allow you to manage
              compensation for chatters once the Chatting portal is live.
            </p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Coming Soon</span>
          </div>
        </div>
      )}
    </div>
  )
}
