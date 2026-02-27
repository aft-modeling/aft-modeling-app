import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AFT Modeling | Content Workflow',
  description: 'Internal content workflow management for AFT Modeling',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
