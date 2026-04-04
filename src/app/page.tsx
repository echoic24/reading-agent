'use client'

import { useState } from 'react'
import { BookOpen, Upload, Sparkles, FileText, Layers, MessageCircle, CheckCircle, Loader, UploadCloud, X } from 'lucide-react'

type Mode = 'summary' | 'deep_dive' | 'themes' | 'chat'

interface ModeOption {
  id: Mode
  title: string
  description: string
  icon: React.ReactNode
}

const modes: ModeOption[] = [
  {
    id: 'summary',
    title: '⚡ 速读提炼',
    description: '快速了解全书框架、核心观点、金句摘录',
    icon: <Sparkles className="w-6 h-6" />
  },
  {
    id: 'deep_dive',
    title: '📖 深度解读',
    description: '逐章详细分析，逻辑脉络梳理，跨文本对话',
    icon: <FileText className="w-6 h-6" />
  },
  {
    id: 'themes',
    title: '🔬 主题研究',
    description: '跨章节主题整合，多书对比，实践指南',
    icon: <Layers className="w-6 h-6" />
  },
  {
    id: 'chat',
    title: '💬 对话共读',
    description: '基于书内容的问答系统，随时提问',
    icon: <MessageCircle className="w-6 h-6" />
  }
]

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [selectedModes, setSelectedModes] = useState<Mode[]>(['summary'])
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setTitle(droppedFile.name.replace('.pdf', ''))
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setTitle(selectedFile.name.replace('.pdf', ''))
    }
  }

  const toggleMode = (mode: Mode) => {
    setSelectedModes(prev => 
      prev.includes(mode) 
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    )
  }

  const handleSubmit = async () => {
    if (!title || selectedModes.length === 0) return
    if (!file && !url) return

    setIsUploading(true)
    
    // Simulate upload and processing
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setProgress(i)
    }
    
    setIsUploading(false)
    setIsProcessing(true)
    setProgress(0)
    
    // Simulate processing
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setProgress(i)
    }
    
    setIsProcessing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">📚 全能读书Agent</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-slate-300 hover:text-white transition">
              我的书库
            </button>
            <button className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-semibold hover:bg-amber-400 transition">
              登录
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🚀 上传书籍，AI帮你深度阅读
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            支持 PDF、网页链接、飞书文档
            <br />
            自动生成速读提炼、深度解读、主题研究、对话共读
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 mb-8">
          {/* File Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer ${
              dragActive 
                ? 'border-amber-400 bg-amber-400/10' 
                : 'border-slate-600 hover:border-slate-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-4">
                <CheckCircle className="w-12 h-12 text-green-400" />
                <div className="text-left">
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-slate-400 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button 
                  onClick={() => { setFile(null); setTitle('') }}
                  className="p-2 hover:bg-slate-700 rounded-full transition"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            ) : (
              <>
                <UploadCloud className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-lg text-slate-300 mb-2">
                  拖拽 PDF 文件到这里，或点击上传
                </p>
                <p className="text-slate-500 text-sm">
                  支持 PDF 文件，最大 50MB
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-4 inline-block px-6 py-2 bg-amber-500 text-slate-900 rounded-lg font-semibold cursor-pointer hover:bg-amber-400 transition"
                >
                  选择文件
                </label>
              </>
            )}
          </div>

          {/* URL Input */}
          <div className="mt-6">
            <label className="block text-slate-300 mb-2 font-medium">
              或输入链接
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://... 或飞书文档链接"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition"
            />
          </div>

          {/* Book Title */}
          <div className="mt-6">
            <label className="block text-slate-300 mb-2 font-medium">
              书名 <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这本书起个名字"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition"
            />
          </div>
        </div>

        {/* Mode Selection */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700/50 mb-8">
          <h3 className="text-xl font-bold text-white mb-6">
            选择输出模式 <span className="text-amber-400">*</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => toggleMode(mode.id)}
                className={`p-6 rounded-xl border-2 text-left transition ${
                  selectedModes.includes(mode.id)
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    selectedModes.includes(mode.id)
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {mode.icon}
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      selectedModes.includes(mode.id) ? 'text-amber-400' : 'text-white'
                    }`}>
                      {mode.title}
                    </h4>
                    <p className="text-slate-400 text-sm mt-1">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={!title || selectedModes.length === 0 || (!file && !url) || isUploading || isProcessing}
            className={`px-12 py-4 rounded-xl font-bold text-lg transition ${
              !title || selectedModes.length === 0 || (!file && !url)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
            }`}
          >
            {isUploading ? (
              <span className="flex items-center gap-3">
                <Loader className="w-6 h-6 animate-spin" />
                上传中...
              </span>
            ) : isProcessing ? (
              <span className="flex items-center gap-3">
                <Loader className="w-6 h-6 animate-spin" />
                AI 处理中...
              </span>
            ) : (
              '开始处理'
            )}
          </button>

          {/* Progress Bar */}
          {(isUploading || isProcessing) && (
            <div className="mt-6 max-w-md mx-auto">
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm mt-2">
                {isUploading ? '上传进度' : '处理进度'}: {progress}%
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 backdrop-blur rounded-xl p-6 border border-slate-700/30">
            <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h4 className="text-white font-bold mb-2">速读提炼</h4>
            <p className="text-slate-400 text-sm">
              5 分钟了解全书核心观点和脉络，快速判断是否值得深入阅读
            </p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur rounded-xl p-6 border border-slate-700/30">
            <div className="w-12 h-12 bg-purple-400/20 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="text-white font-bold mb-2">深度解读</h4>
            <p className="text-slate-400 text-sm">
              逐章详细分析，逻辑梳理，与其他书籍对话，形成系统理解
            </p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur rounded-xl p-6 border border-slate-700/30">
            <div className="w-12 h-12 bg-green-400/20 rounded-lg flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="text-white font-bold mb-2">主题研究</h4>
            <p className="text-slate-400 text-sm">
              跨章节整合主题，发现隐藏联系，形成独特洞见
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>🦞 Powered by clawster | Built with Next.js + Supabase + Feishu</p>
        </div>
      </footer>
    </div>
  )
}
