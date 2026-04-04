'use client'

import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://nfjzfyxmtuquptbwqlxa.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5manpmeXhtdHVxdXB0YndxbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTAyOTEsImV4cCI6MjA5MDg2NjI5MX0.aB6jVdoTnMBYYl980dI4yyDYB3hC9FP98_WLvhTXfPg'

interface Book {
  id: string
  title: string
  author: string
  description: string
  status: string
  created_at: string
}

interface ReadingMode {
  id: string
  mode_type: string
  title: string
  description: string
  feishu_doc_url: string | null
  status: string
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [modes, setModes] = useState<ReadingMode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMode, setSelectedMode] = useState<ReadingMode | null>(null)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle')

  useEffect(() => {
    fetchBooks()
  }, [])

  useEffect(() => {
    if (selectedBook) {
      fetchModes(selectedBook.id)
    }
  }, [selectedBook])

  async function fetchBooks() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/books?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      })
      const data = await res.json()
      setBooks(data)
      if (data.length > 0) {
        setSelectedBook(data[0])
      }
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchModes(bookId: string) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/reading_modes?book_id=eq.${bookId}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      })
      const data = await res.json()
      setModes(data)
    } catch (error) {
      console.error('Error fetching modes:', error)
    }
  }

  const modeLabels: Record<string, { icon: string; color: string }> = {
    speed_read: { icon: '⚡', color: 'bg-yellow-500' },
    deep_analysis: { icon: '📖', color: 'bg-blue-500' },
    topic_research: { icon: '🔍', color: 'bg-purple-500' },
    dialogue: { icon: '💬', color: 'bg-green-500' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            📚 全能读书<span className="text-purple-400">Agent</span>
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            上传书籍，选择阅读模式，AI 帮你深度解读
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <a href="https://reading-agent-auwxue8zb-echoic24s-projects.vercel.app" 
               className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition">
              🌐 访问网站
            </a>
            <a href="https://github.com/echoic24/reading-agent"
               className="px-6 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition">
              📦 GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Upload Section */}
      <section className="max-w-4xl mx-auto px-6 -mt-10 relative z-10">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">📤 上传书籍开始阅读</h2>
          
          <div className="border-2 border-dashed border-purple-400/50 rounded-xl p-12 text-center hover:border-purple-400 transition cursor-pointer"
               onClick={() => document.getElementById('fileInput')?.click()}>
            <input type="file" id="fileInput" className="hidden" accept=".pdf" />
            <div className="text-6xl mb-4">📄</div>
            <p className="text-xl text-white mb-2">拖拽 PDF 或点击上传</p>
            <p className="text-purple-300">支持 PDF、网页链接、飞书文档</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <span className="text-3xl">⚡</span>
              <h3 className="text-white font-medium mt-2">速读提炼</h3>
              <p className="text-purple-300 text-sm mt-1">5分钟掌握核心</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <span className="text-3xl">📖</span>
              <h3 className="text-white font-medium mt-2">深度解读</h3>
              <p className="text-purple-300 text-sm mt-1">逐章详细分析</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <span className="text-3xl">🔍</span>
              <h3 className="text-white font-medium mt-2">主题研究</h3>
              <p className="text-purple-300 text-sm mt-1">深入主题探索</p>
            </div>
          </div>
        </div>
      </section>

      {/* Library Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">📚 我的书库</h2>
        
        {loading ? (
          <div className="text-purple-300">加载中...</div>
        ) : books.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
            <span className="text-6xl">📭</span>
            <p className="text-purple-300 mt-4">书库是空的，上传第一本书吧！</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map(book => (
              <div 
                key={book.id}
                className={`bg-white/5 rounded-xl overflow-hidden border transition cursor-pointer ${
                  selectedBook?.id === book.id 
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                    : 'border-white/10 hover:border-purple-400'
                }`}
                onClick={() => setSelectedBook(book)}
              >
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 h-40 flex items-center justify-center">
                  <span className="text-6xl">📖</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white">{book.title}</h3>
                  <p className="text-purple-300 mt-1">{book.author}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      book.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : book.status === 'processing' 
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {book.status === 'completed' ? '✓ 已完成' : book.status === 'processing' ? '⏳ 处理中' : '📥 待处理'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reading Modes Section */}
      {selectedBook && modes.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="text-3xl font-bold text-white mb-8">
            🎯 {selectedBook.title} - 阅读模式
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {modes.map(mode => {
              const config = modeLabels[mode.mode_type] || { icon: '📄', color: 'bg-gray-500' }
              return (
                <a 
                  key={mode.id}
                  href={mode.feishu_doc_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-400 transition group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`${config.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                      {config.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition">
                        {mode.title}
                      </h3>
                      <p className="text-purple-300 mt-1">{mode.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          mode.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : mode.status === 'ready'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {mode.status === 'completed' ? '✓ 已完成' 
                           : mode.status === 'ready' ? '🚀 就绪'
                           : '⏳ 处理中'}
                        </span>
                        {mode.feishu_doc_url && (
                          <span className="text-purple-400 text-sm">→ 查看文档</span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-purple-300">
          <p>🦞 Powered by Clawster & OpenClaw</p>
          <p className="mt-2 text-sm opacity-70">
            飞书 × Supabase × Vercel
          </p>
        </div>
      </footer>
    </div>
  )
}
