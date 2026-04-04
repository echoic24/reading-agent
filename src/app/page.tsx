'use client'

import { useState, useEffect, useRef } from 'react'

const SUPABASE_URL = 'https://nfjzfyxmtuquptbwqlxa.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5manpmeXhtdHVxdXB0YndxbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTAyOTEsImV4cCI6MjA5MDg2NjI5MX0.aB6jVdoTnMBYYl980dI4yyDYB3hC9FP98_WLvhTXfPg'

interface Book {
  id: string
  title: string
  author: string
  description: string
  status: string
  source_type: string
  file_path: string | null
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

const modeLabels: Record<string, { icon: string; color: string }> = {
  speed_read: { icon: '⚡', color: 'bg-yellow-500' },
  deep_analysis: { icon: '📖', color: 'bg-blue-500' },
  topic_research: { icon: '🔍', color: 'bg-purple-500' },
  dialogue: { icon: '💬', color: 'bg-green-500' }
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [modes, setModes] = useState<ReadingMode[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadSource, setUploadSource] = useState<'pdf' | 'url' | 'feishu'>('pdf')
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookDescription, setBookDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [feishuUrl, setFeishuUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

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
      if (data.length > 0 && !selectedBook) {
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

  async function uploadFile(file: File) {
    setUploading(true)
    setUploadProgress(0)

    try {
      // 1. 上传到 Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      setUploadProgress(20)
      
      // 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      setUploadProgress(40)

      const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/object/books/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: uint8Array
      })

      if (!storageRes.ok) {
        throw new Error('文件上传失败')
      }

      setUploadProgress(70)

      const filePath = `${SUPABASE_URL}/storage/v1/object/public/books/${fileName}`

      // 2. 创建书籍记录
      const bookRes = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: bookTitle || file.name.replace(/\.[^/.]+$/, ''),
          author: bookAuthor || '未知作者',
          description: bookDescription || '暂无描述',
          source_type: 'pdf',
          file_path: filePath,
          status: 'processing'
        })
      })

      const newBook = await bookRes.json()
      setUploadProgress(90)

      // 3. 创建阅读模式
      await createReadingModes(newBook[0].id)

      setUploadProgress(100)

      // 4. 刷新书籍列表
      await fetchBooks()
      setShowUploadModal(false)
      resetForm()

      alert('📚 书籍上传成功！我开始处理了，处理完成后会通知你～')

    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function createReadingModes(bookId: string) {
    const modes = [
      { mode_type: 'speed_read', title: '速读提炼', description: '快速提炼书籍核心要点', status: 'pending' },
      { mode_type: 'deep_analysis', title: '深度解读', description: '深入分析每章核心内容', status: 'pending' },
      { mode_type: 'topic_research', title: '主题研究', description: '围绕核心主题深入研究', status: 'pending' },
      { mode_type: 'dialogue', title: '对话共读', description: '与AI对话，深入探讨书籍内容', status: 'ready' }
    ]

    for (const mode of modes) {
      await fetch(`${SUPABASE_URL}/rest/v1/reading_modes`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...mode, book_id: bookId })
      })
    }
  }

  async function handleUrlUpload() {
    if (!sourceUrl) {
      alert('请输入链接')
      return
    }

    setUploading(true)

    try {
      const bookRes = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: bookTitle || '链接书籍',
          author: bookAuthor || '未知作者',
          description: bookDescription || '暂无描述',
          source_type: 'url',
          source_url: sourceUrl,
          status: 'processing'
        })
      })

      const newBook = await bookRes.json()
      await createReadingModes(newBook[0].id)
      await fetchBooks()
      setShowUploadModal(false)
      resetForm()
      alert('🔗 链接添加成功！')

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
      const bookRes = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: bookTitle || '飞书文档',
          author: bookAuthor || '未知作者',
          description: bookDescription || '暂无描述',
          source_type: 'feishu_doc',
          feishu_token: feishuUrl,
          status: 'processing'
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
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
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center gap-2"
            >
              📤 上传书籍
            </button>
            <a href="https://github.com/echoic24/reading-agent"
               className="px-6 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition">
              📦 GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-lg w-full p-6 border border-white/10">
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
                { id: 'pdf', label: 'PDF文件', icon: '📄' },
                { id: 'url', label: '网页链接', icon: '🔗' },
                { id: 'feishu', label: '飞书文档', icon: '📝' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setUploadSource(tab.id as any)}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    uploadSource === tab.id 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Book Info */}
            <div className="space-y-4 mb-6">
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
              <textarea
                placeholder="书籍描述（可选）"
                value={bookDescription}
                onChange={e => setBookDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Upload Area */}
            {uploadSource === 'pdf' && (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  dragOver 
                    ? 'border-purple-400 bg-purple-500/20' 
                    : 'border-slate-600 hover:border-purple-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-5xl mb-3">📄</div>
                <p className="text-white font-medium">
                  {uploading ? '上传中...' : '点击或拖拽 PDF 文件到这里'}
                </p>
                <p className="text-slate-400 text-sm mt-1">支持 PDF 格式</p>
                
                {uploading && (
                  <div className="mt-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
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

      {/* Library Section */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-8">📚 我的书库</h2>
        
        {loading ? (
          <div className="text-purple-300">加载中...</div>
        ) : books.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
            <span className="text-6xl">📭</span>
            <p className="text-purple-300 mt-4">书库是空的，上传第一本书吧！</p>
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
                    <span className="text-xs text-slate-400">
                      {book.source_type === 'pdf' ? '📄 PDF' : book.source_type === 'url' ? '🔗 链接' : '📝 飞书'}
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
            🎯 {selectedBook.title}
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
