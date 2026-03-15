'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import clsx from 'clsx'
import {
  Calendar, Clock, CheckSquare, ListTodo, FileBarChart,
  LogOut, User, ArrowLeft, Shield
} from 'lucide-react'

interface SidebarProps { profile: Profile }

export default function SchedulingSidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel = {
    creative_director: 'Creative Director',
    editor: 'Editor',
    qa: 'QA Reviewer',
    admin: 'Admin',
  }[profile.role]

  const links = profile.role === 'admin'
    ? [
        { href: '/portal/scheduling/admin',           icon: Calendar,      label: 'Weekly Schedules' },
        { href: '/portal/scheduling/admin/tasks',     icon: ListTodo,      label: 'Task Management' },
        { href: '/portal/scheduling/admin/reports',   icon: FileBarChart,  label: 'Automated Reports' },
      ]
    : [
        { href: '/portal/scheduling/employee',       icon: Clock,       label: 'My Schedule' },
        { href: '/portal/scheduling/employee/tasks',  icon: CheckSquare, label: 'My Tasks' },
      ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Portal Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Scheduling & To-Dos</h2>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-brand-600' : 'text-gray-400')} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {profile.role === 'admin' && <Shield className="w-3 h-3" />}
              {roleLabel}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
