'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { neon } from '@neondatabase/serverless'

// Safe localStorage
const safeLocalStorage = {
  get: (key: string) => {
    if (typeof window === 'undefined') return null
    try { return localStorage.getItem(key) } catch { return null }
  },
  set: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(key, value) } catch {}
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return
    try { localStorage.removeItem(key) } catch {}
  }
}

// 获取数据库连接
function getDb() {
  const connectionString = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_DATABASE_URL || 'postgresql://neondb_owner:npg_q5xcygQjBv3z@ep-billowing-lab-a1s2uxlv-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require')
    : 'postgresql://neondb_owner:npg_q5xcygQjBv3z@ep-billowing-lab-a1s2uxlv-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
  return neon(connectionString)
}

interface Book {
  id: string
  title: string
  author: string
  status: string
  file_path: string | null
  created_at: string
}

interface ReadingMode {
  id: string
  mode_type: string
  title: string
  feishu_doc_url: string | null
  status: string
}

const modeConfigs = {
  speed_read: { icon: '⚡', color: 'amber', label: '速读提炼', desc: '快速提炼核心要点' },
  deep_analysis: { icon: '📖', color: 'blue', label: '深度解读', desc: '深入分析章节精华' },
  topic_research: { icon: '🔍', color: 'purple', label: '主题研究', desc: '横向对比关联分析' },
  dialogue: { icon: '💬', color: 'green', label: '对话共读', desc: '问答互动深度理解' },
}

const colorClasses: Record<string, { bg: string, text: string, border: string, light: string }> = {
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', light: 'bg-amber-500' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', light: 'bg-blue-500' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', light: 'bg-purple-500' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', light: 'bg-green-500' },
}

function getBookCoverUrl(bookId: string, title: string): string {
  const seed = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)
  return `https://picsum.photos/seed/${seed}/400/300`
}

function getCoverEmoji(title: string): string {
  const keywords: Record<string, string> = {
    'wisdom': '✨', 'lamp': '💡', 'light': '💡',
    'mind': '🧠', 'brain': '🧠', 'think': '💭',
    'love': '❤️', 'heart': '❤️', 'feel': '❤️',
    'life': '🌱', 'grow': '🌱', 'nature': '🌿',
    'science': '🔬', 'tech': '💻', 'code': '💻',
    'art': '🎨', 'design': '🎨', 'creative': '🎨',
    'business': '💼', 'money': '💰', 'work': '💼',
    'health': '💚', 'body': '💪', 'fit': '💪',
    'food': '🍽️', 'cook': '👨‍🍳', 'eat': '🍽️',
    'travel': '✈️', 'world': '🌍', 'adventure': '🗺️',
  }
  const lower = title.toLowerCase()
  for (const [key, emoji] of Object.entries(keywords)) {
    if (lower.includes(key)) return emoji
  }
  return '📚'
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'completed': return { label: '已完成', icon: '✓', bg: 'bg-emerald-500', text: 'text-emerald-400' }
    case 'processing': return { label: '处理中', icon: '⏳', bg: 'bg-amber-500', text: 'text-amber-400' }
    default: return { label: '待处理', icon: '○', bg: 'bg-slate-500', text: 'text-slate-400' }
  }
}

export default function Home() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [modes, setModes] = useState<ReadingMode[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fetchBooksRef = useRef<() => Promise<void>>()
  const fetchModesRef = useRef<(bookId: string) => Promise<void>>()

  // 获取书籍列表
  const fetchBooks = useCallback(async () => {
    try {
      const db = getDb()
      const result = await db`SELECT * FROM books ORDER BY created_at DESC`
      const booksData = result as Book[]
      setAllBooks(booksData)
      setBooks(booksData)
      console.log('Fetched books:', booksData.length)
      if (booksData.length > 0) {
        setSelectedBook(booksData[0])
      }
    } catch (e) { console.error('Fetch books error:', e) }
  }, [])

  // 获取阅读模式
  const fetchModes = useCallback(async (bookId: string) => {
    try {
      const db = getDb()
      const result = await db`SELECT * FROM reading_modes WHERE book_id = ${bookId}`
      setModes(result as ReadingMode[])
    } catch (e) { console.error(e) }
  }, [])

  // Check user session
  useEffect(() => {
    const savedUser = safeLocalStorage.get('reading_agent_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        fetchBooks()
      } catch {
        safeLocalStorage.remove('reading_agent_user')
      }
    } else {
      const savedId = safeLocalStorage.get('reading_agent_id')
      if (savedId) {
        const name = prompt('欢迎回来！请输入你的名字:')
        if (name?.trim()) {
          const newUser = { id: savedId, name: name.trim() }
          safeLocalStorage.set('reading_agent_user', JSON.stringify(newUser))
          setUser(newUser)
          fetchBooks()
        }
      }
    }
    setLoading(false)
  }, [fetchBooks])

  // Search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setBooks(allBooks)
    } else {
      const query = searchQuery.toLowerCase()
      setBooks(allBooks.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query)
      ))
    }
  }, [searchQuery, allBooks])

  useEffect(() => { fetchBooksRef.current = fetchBooks }, [fetchBooks])
  useEffect(() => { fetchModesRef.current = fetchModes }, [fetchModes])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  useEffect(() => {
    if (selectedBook) fetchModesRef.current?.(selectedBook.id)
  }, [selectedBook])

  function handleLogin() {
    const name = prompt('请输入你的名字:')
    if (!name?.trim()) return
    
    let userId = safeLocalStorage.get('reading_agent_id')
    if (!userId) {
      userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
      safeLocalStorage.set('reading_agent_id', userId)
    }
    
    const newUser = { id: userId, name: name.trim() }
    safeLocalStorage.set('reading_agent_user', JSON.stringify(newUser))
    setUser(newUser)
    fetchBooks()
  }

  function handleLogout() {
    if (confirm('确定退出?')) {
      safeLocalStorage.remove('reading_agent_user')
      setUser(null)
      setBooks([])
      setSelectedBook(null)
    }
  }

  async function uploadFile(file: File) {
    if (!user) return

    try {
      setUploading(true)
      setUploadProgress(10)
      
      const title = file.name.replace('.pdf', '')
      const db = getDb()
      
      await db`
        INSERT INTO books (title, author, source_type, file_path, status, user_id)
        VALUES (${title}, '未知作者', 'pdf', ${file.name}, 'pending', ${user.id})
      `
      
      setUploadProgress(100)
      await fetchBooksRef.current?.()
      setShowUploadModal(false)
      alert('上传成功！点击"开始处理"来生成阅读笔记。')

    } catch (e: any) {
      alert('上传失败: ' + e.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleProcessBook() {
    if (!selectedBook) return
    if (!confirm(`开始处理《${selectedBook.title}》？\n\n处理完成后会生成 4 种阅读笔记，并在飞书通知你。`)) return

    try {
      const db = getDb()
      await db`UPDATE books SET status = 'processing' WHERE id = ${selectedBook.id}`
      await fetchBooksRef.current?.()
      alert('已提交处理！请在飞书告诉我"处理书籍"，我会自动生成阅读笔记。')
    } catch (e) {
      alert('提交失败')
    }
  }

  async function handleDeleteBook(book: Book) {
    if (!confirm(`确定删除《${book.title}》？此操作不可恢复。`)) return

    try {
      const db = getDb()
      await db`DELETE FROM reading_modes WHERE book_id = ${book.id}`
      await db`DELETE FROM books WHERE id = ${book.id}`

      if (selectedBook?.id === book.id) {
        setSelectedBook(null)
        setModes([])
      }

      setBooks(prev => prev.filter(b => b.id !== book.id))
      setAllBooks(prev => prev.filter(b => b.id !== book.id))
      alert('删除成功')
    } catch (e) {
      alert('删除失败')
    }
  }

  function handleEditBook(book: Book) {
    setEditingBook(book)
    setEditTitle(book.title)
    setEditAuthor(book.author || '')
  }

  async function handleSaveEdit() {
    if (!editingBook || !editTitle.trim()) {
      alert('请输入书名')
      return
    }

    try {
      const db = getDb()
      await db`UPDATE books SET title = ${editTitle.trim()}, author = ${editAuthor.trim() || '未知作者'} WHERE id = ${editingBook.id}`

      const updatedBook = { ...editingBook, title: editTitle.trim(), author: editAuthor.trim() || '未知作者' }
      setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b))
      setAllBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b))
      if (selectedBook?.id === updatedBook.id) {
        setSelectedBook(updatedBook)
      }

      setEditingBook(null)
      alert('保存成功')
    } catch (e) {
      alert('保存失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    )
  }

  const completedCount = books.filter(b => b.status === 'completed').length
  const processingCount = books.filter(b => b.status === 'processing').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">妙读</h1>
                <p className="text-xs text-slate-500">AI 智能阅读助手</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-medium">
                      {user.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-300">{user.name}</span>
                  </div>
                  <button onClick={() => setShowUploadModal(true)} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-full font-medium transition-all shadow-lg shadow-emerald-500/20">
                    + 上传书籍
                  </button>
                  <button onClick={handleLogout} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition">
                    退出
                  </button>
                </>
              ) : (
                <button onClick={handleLogin} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-full font-medium transition-all shadow-lg shadow-emerald-500/20">
                  开始使用
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {user ? (
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: '我的书籍', value: books.length, icon: '📚', color: 'from-blue-500 to-purple-500' },
              { label: '已完成', value: completedCount, icon: '✅', color: 'from-emerald-500 to-teal-500' },
              { label: '处理中', value: processingCount, icon: '⏳', color: 'from-amber-500 to-orange-500' },
            ].map((stat, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5 group hover:border-slate-600/50 transition-all">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <div className="relative flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <span className="text-xl">{stat.icon}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Books Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Book List */}
            <div className="lg:col-span-1">
              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="搜索书籍..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-200">我的书籍</h2>
                {books.length > 0 && <span className="text-sm text-slate-500">{books.length} 本</span>}
              </div>

              {books.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-slate-800/30 border border-slate-700/30">
                  <div className="text-5xl mb-4 opacity-50">📭</div>
                  <p className="text-slate-400 mb-4">{searchQuery ? '没有找到匹配的书籍' : '还没有书籍'}</p>
                  {!searchQuery && (
                    <button onClick={() => setShowUploadModal(true)} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all">
                      上传第一本
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {books.map(book => {
                    const statusInfo = getStatusInfo(book.status)
                    return (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBook(book)}
                        className={`group relative overflow-hidden rounded-xl border cursor-pointer transition-all ${
                          selectedBook?.id === book.id
                            ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
                            : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex gap-3 p-3">
                          {/* Cover */}
                          <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                            <img 
                              src={getBookCoverUrl(book.id, book.title)} 
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            <span className="absolute bottom-1 left-1 text-sm">{getCoverEmoji(book.title)}</span>
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0 py-0.5">
                            <h3 className="font-medium text-sm text-slate-200 truncate">{book.title}</h3>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{book.author}</p>
                            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs ${statusInfo.bg}/20 ${statusInfo.text}`}>
                              <span>{statusInfo.icon}</span>
                              <span>{statusInfo.label}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditBook(book); }}
                            className="w-7 h-7 rounded-lg bg-slate-900/80 hover:bg-slate-800 flex items-center justify-center text-xs transition"
                            title="编辑"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteBook(book); }}
                            className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-xs transition"
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Reading Modes */}
            <div className="lg:col-span-2">
              {selectedBook ? (
                <>
                  {/* Selected Book Hero */}
                  <div className="relative h-56 rounded-2xl overflow-hidden mb-6">
                    <img 
                      src={getBookCoverUrl(selectedBook.id, selectedBook.title)} 
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                    <div className="absolute inset-0 flex items-end p-6">
                      <div className="flex items-end gap-4">
                        <div className="w-16 h-16 rounded-xl bg-slate-800/80 backdrop-blur flex items-center justify-center text-4xl shadow-lg">
                          {getCoverEmoji(selectedBook.title)}
                        </div>
                        <div className="flex-1 pb-1">
                          <h2 className="text-2xl font-bold text-white mb-1">{selectedBook.title}</h2>
                          <p className="text-slate-400 text-sm">{selectedBook.author || '未知作者'}</p>
                        </div>
                        {(() => {
                          const s = getStatusInfo(selectedBook.status)
                          return (
                            <div className={`px-4 py-1.5 rounded-full ${s.bg}/20 border ${s.bg}/30 text-sm ${s.text} mb-1`}>
                              {s.icon} {s.label}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                      <span>📖</span> 阅读模式
                    </h3>
                    {selectedBook.status !== 'completed' && (
                      <button
                        onClick={handleProcessBook}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-full font-medium transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                      >
                        <span>🚀</span> 开始处理
                      </button>
                    )}
                  </div>

                  {/* Mode Cards */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(modeConfigs).map(([key, config]) => {
                      const mode = modes.find(m => m.mode_type === key)
                      const colors = colorClasses[config.color]
                      
                      return (
                        <a
                          key={key}
                          href={mode?.feishu_doc_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group relative overflow-hidden rounded-xl border ${colors.border} ${mode?.feishu_doc_url ? 'bg-slate-800/50 hover:bg-slate-800 cursor-pointer' : 'bg-slate-800/30 cursor-default opacity-70'} p-5 transition-all hover:shadow-lg hover:-translate-y-0.5`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-10`} />
                          <div className="relative">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center text-xl`}>
                                {config.icon}
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-200">{config.label}</h4>
                                <p className="text-xs text-slate-500">{config.desc}</p>
                              </div>
                            </div>
                            
                            {mode?.feishu_doc_url ? (
                              <div className={`flex items-center gap-2 text-sm ${colors.text}`}>
                                <span>打开文档</span>
                                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">
                                {selectedBook.status === 'completed' ? '等待生成...' : '未处理'}
                              </div>
                            )}
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center rounded-2xl bg-slate-800/30 border border-slate-700/30 border-dashed">
                  <div className="text-center">
                    <div className="text-5xl mb-4 opacity-30">📖</div>
                    <p className="text-slate-500">从左侧选择一本书开始阅读</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        /* Landing Page */
        <main className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <span className="text-5xl">📚</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              妙读
            </h1>
            <p className="text-xl text-slate-400 mb-8 max-w-md mx-auto">
              AI 驱动的智能阅读助手，让阅读更高效
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {[
              { icon: '⚡', title: '快速提炼', desc: '30秒了解一本书的核心要点' },
              { icon: '📖', title: '深度解读', desc: '逐章分析，洞见章节精华' },
              { icon: '🔍', title: '主题研究', desc: '横向对比，构建知识体系' },
              { icon: '💬', title: '对话共读', desc: '问答互动，加深理解记忆' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left">
                <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleLogin} className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-full font-semibold text-lg transition-all shadow-xl shadow-emerald-500/30">
            开始使用 →
          </button>
        </main>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-8 border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">上传书籍</h2>
              {!uploading && (
                <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white text-2xl">×</button>
              )}
            </div>

            <div
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                dragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              
              {uploading ? (
                <div>
                  <div className="text-4xl mb-4 animate-pulse">⏳</div>
                  <p className="text-lg mb-4">上传中...</p>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden max-w-xs mx-auto">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all" style={{ width: uploadProgress + '%' }} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-4">📄</div>
                  <p className="text-lg font-medium">拖拽 PDF 文件到这里</p>
                  <p className="text-slate-500 mt-2">或点击选择文件</p>
                </div>
              )}
            </div>

            <p className="text-center text-slate-500 text-sm mt-4">
              支持 PDF 格式，单文件最大 50MB
            </p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setEditingBook(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-8 border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">编辑书籍信息</h2>
              <button onClick={() => setEditingBook(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">书名</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">作者</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingBook(null)}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl font-medium transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500">
          <p>© 2026 妙读 · AI 智能阅读助手</p>
          <p className="mt-2 text-sm">
            <span className="opacity-50">Powered by </span>
            <span className="text-emerald-500">OpenClaw</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
