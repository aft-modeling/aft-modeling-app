'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { MetaAdsExpense, ExpenseType } from '@/lib/types'
import { DollarSign, Plus, X } from 'lucide-react'

function AddExpenseModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'Funded' as ExpenseType,
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('meta_ads_expenses').insert({
      date: form.date,
      amount: form.amount ? parseFloat(form.amount) : null,
      type: form.type,
      notes: form.notes || null,
    })
    setSaving(false)
    if (!error) {
      onSaved()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 50.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ExpenseType })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="Funded">Funded</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ExpensesTable({
  initialExpenses,
}: {
  initialExpenses: MetaAdsExpense[]
}) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function refreshData() {
    router.refresh()
    supabase
      .from('meta_ads_expenses')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        if (data) setExpenses(data)
      })
  }

  const funded = expenses.filter((e) => e.type === 'Funded')
  const paid = expenses.filter((e) => e.type === 'Paid')

  const fundedTotal = funded.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const paidTotal = paid.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const grandTotal = fundedTotal + paidTotal

  function renderGroup(label: string, items: MetaAdsExpense[], subtotal: number, color: string) {
    return (
      <div className="mb-6">
        <div className={`flex items-center justify-between px-4 py-2 ${color} rounded-t-lg`}>
          <span className="font-semibold text-sm">{label}</span>
          <span className="font-semibold text-sm">
            Subtotal: ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-white border border-gray-200 rounded-b-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                    No {label.toLowerCase()} expenses yet.
                  </td>
                </tr>
              ) : (
                items.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900 font-medium">{expense.date}</td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      {expense.amount != null
                        ? `$${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{expense.notes ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-600" />
            Expenses
          </h1>
          <p className="text-gray-500 mt-1">Track funded and paid ad expenses</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Grand Total Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="text-gray-600 font-medium">Grand Total (All Expenses)</span>
        <span className="text-xl font-bold text-gray-900">
          ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {renderGroup('Funded', funded, fundedTotal, 'bg-blue-50 text-blue-800')}
      {renderGroup('Paid', paid, paidTotal, 'bg-green-50 text-green-800')}

      {showAddModal && (
        <AddExpenseModal onClose={() => setShowAddModal(false)} onSaved={refreshData} />
      )}
    </div>
  )
}
