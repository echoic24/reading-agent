import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '📚 全能读书Agent - AI帮你深度阅读',
  description: '上传书籍，AI自动生成速读提炼、深度解读、主题研究、对话共读',
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
