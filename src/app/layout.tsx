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
      <body className={`${inter.className} bg-[#0a0a0f] text-gray-200`}>
        <Sidebar />
        <main className="ml-64 min-h-screen p-8">
          {children}
        </main>
        <QuickActionBar />
      </body>
    </html>
  )
}
