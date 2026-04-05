import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '📚 妙读 - AI智能阅读助手',
  description: 'AI驱动的智能阅读助手，让阅读更高效',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
