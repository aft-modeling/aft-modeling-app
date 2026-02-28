'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import clsx from 'clsx'
import {
  LayoutDashboard, Film, CheckSquare, Trophy,
  LogOut, User, ChevronRight, Shield, Users
} from 'lucide-react'

interface SidebarProps { profile: Profile }

export default function Sidebar({ profile }: SidebarProps) {
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
        { href: '/dashboard/admin',              icon: LayoutDashboard, label: 'Pipeline Overview' },
        { href: '/dashboard/admin?tab=editors',  icon: Users,           label: 'Editor Portals' },
        { href: '/dashboard/admin?tab=manage',   icon: Shield,          label: 'Manage Editors' },
      ]
    : profile.role === 'creative_director'
    ? [
        { href: '/dashboard/cd',            icon: LayoutDashboard, label: 'Pipeline Overview' },
        { href: '/dashboard/cd/clips',      icon: Film,            label: 'Manage Clips' },
        { href: '/dashboard/cd/finished',   icon: Trophy,          label: 'Finished Clips' },
      ]
    : profile.role === 'editor'
    ? [
        { href: '/dashboard/editor',            icon: LayoutDashboard, label: 'My Assignments' },
        { href: '/dashboard/editor/history',    icon: Film,            label: 'Submission History' },
      ]
    : [
        { href: '/dashboard/qa',            icon: LayoutDashboard, label: 'Review Queue' },
        { href: '/dashboard/qa/history',    icon: CheckSquare,     label: 'Review History' },
      ]

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">AFT</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">AFT Modeling</p>
            <p className="text-xs text-gray-500">Content Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className={clsx(
              'w-4 h-4 shrink-0',
              pathname === href || pathname.startsWith(href + '/')
                ? 'text-brand-600'
                : 'text-gray-400 group-hover:text-gray-600'
            )} />
            <span className="flex-1">{label}</span>
            <ChevronRight className={clsx(
              'w-3.5 h-3.5',
              pathname === href || pathname.startsWith(href + '/')
                ? 'text-brand-400'
                : 'text-gray-300 group-hover:text-gray-400'
            )} />
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut className="w-4 h-4 text-gray-400" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
