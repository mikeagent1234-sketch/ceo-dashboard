import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import QuickActionBar from '@/components/QuickActionBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CEO Dashboard | Agent Command Center',
  description: 'Task management and coordination for AI agent team',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} text-slate-200`} style={{ background: '#0a0f1e' }}>
        <Sidebar />
        <main className="md:ml-64 min-h-screen p-4 md:p-8 pt-16 md:pt-8">
          {children}
        </main>
        <QuickActionBar />
      </body>
    </html>
  )
}
