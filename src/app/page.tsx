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
  speed_read: { icon: '⚡', color: '#f59e0b', label: '速读提炼', desc: '30秒了解核心' },
  deep_analysis: { icon: '📖', color: '#3b82f6', label: '深度解读', desc: '逐章精华分析' },
  topic_research: { icon: '🔍', color: '#8b5cf6', label: '主题研究', desc: '知识体系构建' },
  dialogue: { icon: '💬', color: '#10b981', label: '对话共读', desc: '问答深度理解' },
}

function getBookCoverUrl(bookId: string, title: string): string {
  const seed = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)
  return `https://picsum.photos/seed/${seed}/400/600`
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed': return { label: '已完成', bg: '#10b981', text: 'white' }
    case 'processing': return { label: '处理中', bg: '#f59e0b', text: 'white' }
    default: return { label: '待处理', bg: '#6b7280', text: 'white' }
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
  const [dragOver, setDragOver] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchBooks = useCallback(async () => {
    try {
      const db = getDb()
      const result = await db`SELECT * FROM books ORDER BY created_at DESC`
      const booksData = result as Book[]
      setAllBooks(booksData)
      setBooks(booksData)
      if (booksData.length > 0) setSelectedBook(booksData[0])
    } catch (e) { console.error('Fetch books error:', e) }
  }, [])

  const fetchModes = useCallback(async (bookId: string) => {
    try {
      const db = getDb()
      const result = await db`SELECT * FROM reading_modes WHERE book_id = ${bookId}`
      setModes(result as ReadingMode[])
    } catch (e) { console.error(e) }
  }, [])

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

  useEffect(() => { if (user) fetchBooks() }, [user, fetchBooks])
  useEffect(() => { if (selectedBook) fetchModes(selectedBook.id) }, [selectedBook])

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
      const title = file.name.replace('.pdf', '')
      const db = getDb()
      
      await db`
        INSERT INTO books (title, author, source_type, file_path, status, user_id)
        VALUES (${title}, '未知作者', 'pdf', ${file.name}, 'pending', ${user.id})
      `
      
      await fetchBooks()
      setShowUploadModal(false)
      alert('上传成功！点击"开始处理"来生成阅读笔记。')

    } catch (e: any) {
      alert('上传失败: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleProcessBook() {
    if (!selectedBook) return
    if (!confirm(`开始处理《${selectedBook.title}》？\n\n处理完成后会生成 4 种阅读笔记，并在飞书通知你。`)) return

    try {
      const db = getDb()
      await db`UPDATE books SET status = 'processing' WHERE id = ${selectedBook.id}`
      await fetchBooks()
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
      if (selectedBook?.id === updatedBook.id) setSelectedBook(updatedBook)

      setEditingBook(null)
      alert('保存成功')
    } catch (e) {
      alert('保存失败')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8', fontSize: 14 }}>加载中...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const completedCount = books.filter(b => b.status === 'completed').length
  const processingCount = books.filter(b => b.status === 'processing').length

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover { opacity: 0.9; transform: scale(1.02); }
        button { transition: all 0.2s ease; }
        input:focus { outline: none; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3); }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .mode-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* Header */}
      <header style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)' }}>
              📚
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>妙读</h1>
              <p style={{ fontSize: 12, color: '#64748b' }}>AI 智能阅读助手</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'white' }}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>{user.name}</span>
                </div>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', borderRadius: 100, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                >
                  + 上传书籍
                </button>
                <button 
                  onClick={handleLogout}
                  style={{ padding: '10px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, color: '#94a3b8', fontSize: 14, cursor: 'pointer' }}
                >
                  退出
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', borderRadius: 100, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
              >
                开始使用
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      {user ? (
        <main style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
            {[
              { label: '我的书籍', value: books.length, icon: '📚', color: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
              { label: '已完成', value: completedCount, icon: '✅', color: 'linear-gradient(135deg, #10b981, #14b8a6)' },
              { label: '处理中', value: processingCount, icon: '⏳', color: 'linear-gradient(135deg, #f59e0b, #f97316)' },
            ].map((stat, i) => (
              <div key={i} className="card-hover" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 28, animation: 'fadeIn 0.5s ease forwards', animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                    {stat.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: 'white' }}>{stat.value}</div>
                    <div style={{ fontSize: 14, color: '#64748b' }}>{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32 }}>
            {/* Book List */}
            <div>
              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="搜索书籍..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, color: 'white', fontSize: 14 }}
                />
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0' }}>我的书籍</h2>
                {books.length > 0 && <span style={{ fontSize: 13, color: '#64748b' }}>{books.length} 本</span>}
              </div>

              {books.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📭</div>
                  <p style={{ color: '#64748b', marginBottom: 20 }}>{searchQuery ? '没有找到匹配的书籍' : '还没有书籍'}</p>
                  {!searchQuery && (
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', borderRadius: 100, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    >
                      上传第一本
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {books.map((book, idx) => {
                    const badge = getStatusBadge(book.status)
                    const isSelected = selectedBook?.id === book.id
                    return (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBook(book)}
                        className="card-hover"
                        style={{ 
                          display: 'flex', 
                          gap: 16, 
                          padding: 16, 
                          background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', 
                          border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: 16, 
                          cursor: 'pointer',
                          animation: 'fadeIn 0.4s ease forwards',
                          animationDelay: `${idx * 0.05}s`,
                          opacity: 0
                        }}
                      >
                        {/* Cover */}
                        <div style={{ width: 64, height: 80, borderRadius: 12, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                          <img src={getBookCoverUrl(book.id, book.title)} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                          <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 16 }}>{getCoverEmoji(book.title)}</span>
                        </div>
                        
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h3>
                          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
                          <span style={{ display: 'inline-block', padding: '4px 10px', background: badge.bg, borderRadius: 100, fontSize: 12, fontWeight: 500, color: badge.text }}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, opacity: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditBook(book); }}
                            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', fontSize: 12 }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteBook(book); }}
                            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239, 68, 68, 0.2)', border: 'none', cursor: 'pointer', fontSize: 12 }}
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
            <div>
              {selectedBook ? (
                <>
                  {/* Book Hero */}
                  <div style={{ position: 'relative', height: 220, borderRadius: 24, overflow: 'hidden', marginBottom: 28 }}>
                    <img src={getBookCoverUrl(selectedBook.id, selectedBook.title)} alt={selectedBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.5) 50%, transparent 100%)' }} />
                    <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                          {getCoverEmoji(selectedBook.title)}
                        </div>
                        <div>
                          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'white', marginBottom: 4 }}>{selectedBook.title}</h2>
                          <p style={{ fontSize: 14, color: '#94a3b8' }}>{selectedBook.author || '未知作者'}</p>
                        </div>
                      </div>
                      {(() => {
                        const badge = getStatusBadge(selectedBook.status)
                        return (
                          <span style={{ padding: '8px 16px', background: badge.bg, borderRadius: 100, fontSize: 13, fontWeight: 600, color: badge.text }}>
                            {badge.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📖</span> 阅读模式
                    </h3>
                    {selectedBook.status !== 'completed' && (
                      <button
                        onClick={handleProcessBook}
                        style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', borderRadius: 100, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}
                      >
                        <span>🚀</span> 开始处理
                      </button>
                    )}
                  </div>

                  {/* Mode Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {Object.entries(modeConfigs).map(([key, config]) => {
                      const mode = modes.find(m => m.mode_type === key)
                      
                      return (
                        <a
                          key={key}
                          href={mode?.feishu_doc_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mode-card"
                          style={{ 
                            display: 'block',
                            padding: 24, 
                            background: mode?.feishu_doc_url ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', 
                            border: `1px solid ${mode?.feishu_doc_url ? config.color + '30' : 'rgba(255,255,255,0.08)'}`, 
                            borderRadius: 20, 
                            textDecoration: 'none',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: config.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                              {config.icon}
                            </div>
                            <div>
                              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{config.label}</h4>
                              <p style={{ fontSize: 12, color: '#64748b' }}>{config.desc}</p>
                            </div>
                          </div>
                          
                          {mode?.feishu_doc_url ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: config.color, fontWeight: 500 }}>
                              <span>打开文档</span>
                              <span style={{ transition: 'transform 0.2s' }}>→</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 13, color: '#475569' }}>
                              {selectedBook.status === 'completed' ? '等待生成...' : '未处理'}
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '2px dashed rgba(255,255,255,0.1)', minHeight: 400 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>📖</div>
                    <p style={{ color: '#475569', fontSize: 15 }}>从左侧选择一本书开始阅读</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      ) : (
        /* Landing Page */
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '100px 32px', textAlign: 'center' }}>
          <div style={{ marginBottom: 60 }}>
            <div style={{ width: 100, height: 100, margin: '0 auto 32px', borderRadius: 28, background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '0 8px 40px rgba(16, 185, 129, 0.4)' }}>
              📚
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-2px', background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              妙读
            </h1>
            <p style={{ fontSize: 22, color: '#64748b', maxWidth: 500, margin: '0 auto' }}>
              AI 驱动的智能阅读助手，让阅读更高效
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 60 }}>
            {[
              { icon: '⚡', title: '快速提炼', desc: '30秒了解一本书的核心要点' },
              { icon: '📖', title: '深度解读', desc: '逐章分析，洞见章节精华' },
              { icon: '🔍', title: '主题研究', desc: '横向对比，构建知识体系' },
              { icon: '💬', title: '对话共读', desc: '问答互动，加深理解记忆' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, textAlign: 'left', animation: 'fadeIn 0.5s ease forwards', animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {item.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleLogin} 
            style={{ padding: '18px 48px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', borderRadius: 100, color: 'white', fontSize: 18, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)' }}
          >
            开始使用 →
          </button>
        </main>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div 
          onClick={() => !uploading && setShowUploadModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: '#1e293b', borderRadius: 24, maxWidth: 480, width: '100%', padding: 40, border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>上传书籍</h2>
              {!uploading && (
                <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 28, cursor: 'pointer' }}>×</button>
              )}
            </div>

            <div
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                border: `2px dashed ${dragOver ? '#10b981' : '#334155'}`, 
                borderRadius: 20, 
                padding: '60px 40px', 
                textAlign: 'center', 
                cursor: 'pointer',
                background: dragOver ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              
              {uploading ? (
                <div>
                  <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1s infinite' }}>⏳</div>
                  <p style={{ fontSize: 16, color: '#94a3b8' }}>上传中...</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>拖拽 PDF 文件到这里</p>
                  <p style={{ fontSize: 14, color: '#64748b' }}>或点击选择文件</p>
                </div>
              )}
            </div>

            <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 20 }}>
              支持 PDF 格式，单文件最大 50MB
            </p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBook && (
        <div 
          onClick={() => setEditingBook(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: '#1e293b', borderRadius: 24, maxWidth: 480, width: '100%', padding: 40, border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>编辑书籍信息</h2>
              <button onClick={() => setEditingBook(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 28, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 8 }}>书名</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px', background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: 'white', fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 8 }}>作者</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px', background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: 'white', fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button
                onClick={() => setEditingBook(null)}
                style={{ flex: 1, padding: '14px', background: '#334155', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 0', marginTop: 80 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px', textAlign: 'center', color: '#475569' }}>
          <p style={{ marginBottom: 8 }}>© 2026 妙读 · AI 智能阅读助手</p>
          <p style={{ fontSize: 13 }}>
            <span style={{ opacity: 0.5 }}>Powered by </span>
            <span style={{ color: '#10b981' }}>OpenClaw</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
