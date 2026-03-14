import type { PortalConfig } from './types'

export const ALL_PORTALS: PortalConfig[] = [
  {
    id: 'video-editing',
    name: 'Video Editing',
    description: 'Content production pipeline — clip assignment, editing, QA review',
    icon: 'Film',
    href: '/portal/video-editing',
    active: true,
  },
  {
    id: 'scheduling',
    name: 'Scheduling & To-Dos',
    description: 'Weekly schedules, daily tasks, and one-time assignments',
    icon: 'Calendar',
    href: '/portal/scheduling',
    active: true,
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Employee compensation, pay periods, and payment tracking',
    icon: 'DollarSign',
    href: '/portal/payroll',
    active: true,
    adminOnly: true,
  },
  {
    id: 'chatting',
    name: 'Chatting',
    description: 'Internal team messaging and communication',
    icon: 'MessageSquare',
    href: '/portal/chatting',
    active: false,
  },
  {
    id: 'client-portal',
    name: 'Client Portal',
    description: 'Creator-facing portal for content delivery and feedback',
    icon: 'Users',
    href: '/portal/client-portal',
    active: false,
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads',
    description: 'Meta advertising campaign management — reels, expenses, follower tracking',
    icon: 'BarChart3',
    href: '/portal/meta-ads',
    active: true,
    adminOnly: true,
  },
]
