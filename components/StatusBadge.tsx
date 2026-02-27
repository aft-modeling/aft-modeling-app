import clsx from 'clsx'
import type { ClipStatus } from '@/lib/types'

const config: Record<string, { label: string; classes: string }> = {
  assigned:       { label: 'Assigned',        classes: 'bg-blue-50 text-blue-700' },
  in_progress:    { label: 'In Progress',     classes: 'bg-amber-50 text-amber-700' },
  submitted:      { label: 'Submitted',       classes: 'bg-purple-50 text-purple-700' },
  in_qa:          { label: 'In QA',           classes: 'bg-orange-50 text-orange-700' },
  needs_revision: { label: 'Needs Revision',  classes: 'bg-red-50 text-red-700' },
  approved:       { label: 'Approved',        classes: 'bg-emerald-50 text-emerald-700' },
  finished:       { label: 'Finished',        classes: 'bg-gray-100 text-gray-600' },
  pending_qa:     { label: 'Pending QA',      classes: 'bg-orange-50 text-orange-700' },
}

export default function StatusBadge({ status }: { status: string }) {
  const { label, classes } = config[status] || { label: status, classes: 'bg-gray-100 text-gray-600' }
  return <span className={clsx('badge', classes)}>{label}</span>
}
