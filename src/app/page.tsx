'use client'

import { useState, useEffect, useRef } from 'react'

const SUPABASE_URL = 'https://nfjzfyxmtuquptbwqlxa.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hanpmeXhtdHVxdXB0YndxbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTAyOTEsImV4cCI6MjA5MDg2NjI5MX0.aB6jVdoTnMBYYl980dI4yyDYB3hC9FP98_WLvhTXfPg'

// Safe localStorage access
const safeLocalStorage = {
  get: (key: string) => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch { return null }
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

interface User {
  id: string
  name: string
  email: string
  created_at: string
}

interface Book {
  id: string
  title: string
  author: string
  description: string
  status: string
  source_type: string
  file_path: string | null
  created_at: string
  user_id: string | null
}

interface ReadingMode {
  id: string
  mode_type: string
  title: string
  description: string
  feishu_doc_url: string | null
  status: string
}

const modeLabels: Record<string, { icon: string; color: string }> = {
  speed_read: { icon: '⚡', color: 'bg-yellow-500' },
  deep_analysis: { icon: '📖', color: 'bg-blue-500' },
  topic_research: { icon: '🔍', color: 'bg-purple-500' },
  dialogue: { icon: '💬', color: 'bg-green-500' }
}

const modeDescriptions: Record<string, string> = {
  speed_read: '快速提炼书籍核心要点',
  deep_analysis: '深入分析每章核心内容',
  topic_research: '围绕核心主题深入研究',
  dialogue: '与AI对话，深入探讨书籍内容'
}

function generateUserId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginName, setLoginName] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [modes, setModes] = useState<ReadingMode[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadSource, setUploadSource] = useState<'pdf' | 'url' | 'feishu'>('pdf')
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookDescription, setBookDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [feishuUrl, setFeishuUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchBooks()
    }
  }, [user])

  useEffect(() => {
    if (selectedBook) {
      fetchModes(selectedBook.id)
    }
  }, [selectedBook])

  function checkUser() {
    try {
      const savedUser = safeLocalStorage.get('reading_agent_user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          // User already logged in - skip login modal
          setUser(parsedUser)
          setShowLoginModal(false)
        } catch {
          // Invalid data in localStorage - clear it
          safeLocalStorage.remove('reading_agent_user')
          setShowLoginModal(true)
        }
      } else {
        setShowLoginModal(true)
      }
    } catch (e) {
      console.error('Error checking user:', e)
      setShowLoginModal(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin() {
    if (!loginName.trim()) {
      alert('请输入名字')
      return
    }

    const existingUser = safeLocalStorage.get('reading_agent_user')
    if (existingUser) {
      try {
        const parsed = JSON.parse(existingUser)
        // Update name if changed
        if (parsed.name !== loginName.trim()) {
          parsed.name = loginName.trim()
          parsed.email = loginEmail.trim() || parsed.email
          safeLocalStorage.set('reading_agent_user', JSON.stringify(parsed))
          setUser(parsed)
        } else {
          setUser(parsed)
        }
        setShowLoginModal(false)
        return
      } catch {}
    }

    const newUser: User = {
      id: generateUserId(),
      name: loginName.trim(),
      email: loginEmail.trim() || '',
      created_at: new Date().toISOString()
    }

    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/users', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newUser)
      })

      let savedUser = newUser
      if (res.ok) {
        const result = await res.json()
        savedUser = result[0] || newUser
      }

      safeLocalStorage.set('reading_agent_user', JSON.stringify(savedUser))
      setUser(savedUser)
      setShowLoginModal(false)
    } catch (e) {
      console.error('Login error:', e)
      safeLocalStorage.set('reading_agent_user', JSON.stringify(newUser))
      setUser(newUser)
      setShowLoginModal(false)
    }
  }

  function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
      safeLocalStorage.remove('reading_agent_user')
      setUser(null)
      setShowLoginModal(true)
      setBooks([])
      setSelectedBook(null)
    }
  }

  async function fetchBooks() {
    if (!user) return
    
    try {
      setLoading(true)
      let url = SUPABASE_URL + '/rest/v1/books?select=*&order=created_at.desc&user_id=eq.' + user.id

      const res = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        }
      })
      
      if (!res.ok) {
        console.error('Fetch books failed:', res.status)
        setBooks([])
        return
      }
      
      const data = await res.json()
      setBooks(Array.isArray(data) ? data : [])
      
      if (Array.isArray(data) && data.length > 0 && !selectedBook) {
        setSelectedBook(data[0])
      }
    } catch (error) {
      console.error('Error fetching books:', error)
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchModes(bookId: string) {
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/reading_modes?book_id=eq.' + bookId + '&select=*', {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        }
      })
      
      if (!res.ok) {
        console.error('Fetch modes failed:', res.status)
        setModes([])
        return
      }
      
      const data = await res.json()
      setModes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching modes:', error)
      setModes([])
    }
  }

  async function uploadFile(file: File) {
    if (!user) {
      alert('请先登录')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = Date.now() + '-' + Math.random().toString(36).substring(7) + '.' + fileExt
      
      setUploadProgress(20)
      
      // Use FormData for upload
      const formData = new FormData()
      formData.append('file', file)
      
      setUploadProgress(40)

      const storageRes = await fetch(SUPABASE_URL + '/storage/v1/object/books/' + fileName, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: file
      })

      setUploadProgress(60)

      if (!storageRes.ok) {
        const errorText = await storageRes.text()
        console.error('Storage error:', storageRes.status, errorText)
        throw new Error('文件上传失败: ' + storageRes.status)
      }

      setUploadProgress(80)
      const filePath = 'books/' + fileName

      const bookRes = await fetch(SUPABASE_URL + '/rest/v1/books', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: bookTitle || file.name.replace(/\.[^/.]+$/, ''),
          author: bookAuthor || '未知作者',
          description: bookDescription || '暂无描述',
          source_type: 'pdf',
          file_path: filePath,
          status: 'pending',
          user_id: user?.id
        })
      })

      if (!bookRes.ok) {
        throw new Error('保存书籍信息失败')
      }

      const newBook = await bookRes.json()
      const bookId = newBook[0]?.id
      
      setUploadProgress(90)
      
      // 创建阅读模式
      if (bookId) {
        await createReadingModes(bookId)
      }
      
      setUploadProgress(100)
      await fetchBooks()
      setShowUploadModal(false)
      resetForm()
      
      alert('📚 书籍上传成功！\n\n接下来你可以：\n1. 点击"处理书籍"让我开始分析\n2. 或先查看其他内容，稍后再处理')

    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败: ' + (error as Error).message + '\n请重试')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function createReadingModes(bookId: string) {
    const modeTypes = ['speed_read', 'deep_analysis', 'topic_research', 'dialogue']
    
    for (const modeType of modeTypes) {
      await fetch(SUPABASE_URL + '/rest/v1/reading_modes', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode_type: modeType,
          title: modeType === 'speed_read' ? '速读提炼' 
               : modeType === 'deep_analysis' ? '深度解读'
               : modeType === 'topic_research' ? '主题研究'
               : '对话共读',
          description: modeDescriptions[modeType],
          status: 'pending',
          book_id: bookId
        })
      })
    }
  }

  async function handleProcessBook() {
    if (!selectedBook) return
    
    const confirmed = confirm('📖 开始处理《' + selectedBook.title + '》？\n\n处理步骤：\n1. 解析书籍内容\n2. 生成速读提炼\n3. 生成深度解读\n4. 生成主题研究\n\n处理完成后会自动创建飞书文档。')
    
    if (!confirmed) return

    // 更新状态为处理中
    await fetch(SUPABASE_URL + '/rest/v1/books?id=eq.' + selectedBook.id, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'processing' })
    })

    // 更新模式状态
    for (const mode of modes) {
      await fetch(SUPABASE_URL + '/rest/v1/reading_modes?id=eq.' + mode.id, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'processing' })
      })
    }

    await fetchBooks()
    await fetchModes(selectedBook.id)

    alert('📚 正在处理《' + selectedBook.title + '》...\n\n请在飞书中告诉我：\n"帮我处理《' + selectedBook.title + '》"\n\n我会自动开始解析和处理！')
  }

  async function handleUrlUpload() {
    if (!sourceUrl) {
      alert('请输入链接')
      return
    }

    setUploading(true)

    try {
      const bookRes = await fetch(SUPABASE_URL + '/rest/v1/books', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: bookTitle || '链接书籍',
          author: bookAuthor || '未知作者',
          description: bookDescription || '暂无描述',
          source_type: 'url',
          source_url: sourceUrl,
          status: 'pending',
          user_id: user?.id
        })
      })

      const newBook = await bookRes.json()
      await createReadingModes(newBook[0].id)
      await fetchBooks()
      setShowUploadModal(false)
      resetForm()
      alert('🔗 链接添加成功！\n\n在飞书中告诉我："帮我处理这本书"')

    } catch (error) {
      console.error('URL upload error:', error)
      alert('添加失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  async function handleFeishuUpload() {
    if (!feishuUrl) {
      alert('请输入飞书文档链接')
      return
    }

    setUploading(true)

    try {
      const bookRes = await fetch(SUPABASE_URL + '/rest/v1/books', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: bookTitle || '飞书文档',
          author: bookAuthor || '未知作者',
          description: bookDescription || '暂无描述',
          source_type: 'feishu_doc',
          feishu_token: feishuUrl,
          status: 'pending',
          user_id: user?.id
        })
      })

      const newBook = await bookRes.json()
      await createReadingModes(newBook[0].id)
      await fetchBooks()
      setShowUploadModal(false)
      resetForm()
      alert('📄 飞书文档添加成功！')

    } catch (error) {
      console.error('Feishu upload error:', error)
      alert('添加失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  function resetForm() {
    setBookTitle('')
    setBookAuthor('')
    setBookDescription('')
    setSourceUrl('')
    setFeishuUrl('')
    setUploadSource('pdf')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      uploadFile(file)
    } else {
      alert('请上传 PDF 文件')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-8 border border-white/10">
            <div className="text-center mb-8">
              <span className="text-6xl">🦞</span>
              <h2 className="text-2xl font-bold text-white mt-4">欢迎使用</h2>
              <p className="text-purple-300 mt-2">全能读书Agent</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="你的名字"
                value={loginName}
                onChange={e => setLoginName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                autoFocus
              />
              <input
                type="email"
                placeholder="邮箱（可选）"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleLogin}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition text-lg"
              >
                开始使用 →
              </button>
            </div>

            <p className="text-slate-500 text-sm text-center mt-6">
              你的数据将安全存储，仅限你自己访问
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">📚 全能读书<span className="text-purple-400">Agent</span></h1>
              <p className="text-purple-200 text-sm mt-1">Hi, {user?.name}！</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2"
              >
                📤 上传书籍
              </button>
              <button 
                onClick={handleLogout}
                className="px-3 py-2 bg-red-600/80 text-white text-sm rounded-lg hover:bg-red-600 transition"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">📤 上传书籍</h2>
              <button 
                onClick={() => { setShowUploadModal(false); resetForm(); }}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Source Type Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'pdf', label: 'PDF', icon: '📄' },
                { id: 'url', label: '链接', icon: '🔗' },
                { id: 'feishu', label: '飞书', icon: '📝' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setUploadSource(tab.id as any)}
                  className={'flex-1 py-2 rounded-lg font-medium transition ' + (
                    uploadSource === tab.id 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Book Info */}
            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="书名（可选）"
                value={bookTitle}
                onChange={e => setBookTitle(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="作者（可选）"
                value={bookAuthor}
                onChange={e => setBookAuthor(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Upload Area */}
            {uploadSource === 'pdf' && (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ' + (
                  dragOver 
                    ? 'border-purple-400 bg-purple-500/20' 
                    : 'border-slate-600 hover:border-purple-400'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f) }}
                  className="hidden"
                />
                <div className="text-5xl mb-3">📄</div>
                <p className="text-white font-medium">
                  {uploading ? '上传中...' : '点击或拖拽 PDF 文件'}
                </p>
                {uploading && (
                  <div className="mt-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all" style={{width: uploadProgress + '%'}} />
                    </div>
                    <p className="text-purple-400 text-sm mt-2">{uploadProgress}%</p>
                  </div>
                )}
              </div>
            )}

            {uploadSource === 'url' && (
              <div>
                <input
                  type="url"
                  placeholder="输入网页链接"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                />
                <button
                  onClick={handleUrlUpload}
                  disabled={uploading}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {uploading ? '处理中...' : '添加链接'}
                </button>
              </div>
            )}

            {uploadSource === 'feishu' && (
              <div>
                <input
                  type="url"
                  placeholder="输入飞书文档链接"
                  value={feishuUrl}
                  onChange={e => setFeishuUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                />
                <button
                  onClick={handleFeishuUpload}
                  disabled={uploading}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {uploading ? '处理中...' : '添加文档'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Library */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">📚 我的书库</h2>
        
        {books.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
            <span className="text-6xl">📭</span>
            <p className="text-purple-300 mt-4">还没有书籍，上传第一本吧！</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              📤 上传书籍
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map(book => (
              <div 
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className={'bg-white/5 rounded-xl overflow-hidden border transition cursor-pointer ' + (
                  selectedBook?.id === book.id 
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                    : 'border-white/10 hover:border-purple-400'
                )}
              >
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 h-32 flex items-center justify-center">
                  <span className="text-5xl">📖</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white truncate">{book.title}</h3>
                  <p className="text-purple-300 text-sm mt-1 truncate">{book.author}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={'px-2 py-1 rounded text-xs ' + (
                      book.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : book.status === 'processing' 
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                    )}>
                      {book.status === 'completed' ? '✓ 已完成' : book.status === 'processing' ? '⏳ 处理中' : '📥 待处理'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reading Modes */}
      {selectedBook && (
        <section className="max-w-6xl mx-auto px-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">🎯 {selectedBook.title}</h2>
            <button
              onClick={handleProcessBook}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
            >
              🤖 处理书籍
            </button>
          </div>
          
          {modes.length === 0 ? (
            <p className="text-purple-300">加载中...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {modes.map(mode => {
                const config = modeLabels[mode.mode_type] || { icon: '📄', color: 'bg-gray-500' }
                return (
                  <a 
                    key={mode.id}
                    href={mode.feishu_doc_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-purple-400 transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={config.color + ' w-12 h-12 rounded-lg flex items-center justify-center text-2xl'}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition">{mode.title}</h3>
                        <p className="text-purple-300 text-sm mt-1">{mode.description}</p>
                        <span className={'inline-block px-2 py-1 rounded text-xs mt-2 ' + (
                          mode.status === 'completed' ? 'bg-green-500/20 text-green-400' 
                          : mode.status === 'ready' ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                        )}>
                          {mode.status === 'completed' ? '✓ 已完成' : mode.status === 'ready' ? '🚀 就绪' : '⏳ 待处理'}
                        </span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Help Section */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-3">💡 使用提示</h3>
          <ul className="text-purple-300 text-sm space-y-2">
            <li>• 上传 PDF 后，点击"🤖 处理书籍"按钮</li>
            <li>• 或在飞书告诉我："帮我处理《书名》"</li>
            <li>• 我会自动解析内容并生成阅读笔记</li>
            <li>• 处理完成后，点击各模式查看飞书文档</li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-purple-300">
          <p>🦞 Powered by Clawster & OpenClaw</p>
        </div>
      </footer>
    </div>
  )
}
