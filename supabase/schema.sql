-- ============================================
-- 全能读书Agent - Supabase 数据库表结构
-- ============================================

-- 1. 书籍表
CREATE TABLE books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'url', 'feishu_doc')),
    source_url TEXT,
    feishu_token TEXT,
    file_path TEXT,
    cover_url TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 章节表
CREATE TABLE chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    key_points TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 阅读模式表
CREATE TABLE reading_modes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    mode_type TEXT NOT NULL CHECK (mode_type IN ('speed_read', 'deep_analysis', 'topic_research', 'dialogue')),
    title TEXT NOT NULL,
    description TEXT,
    feishu_doc_url TEXT,
    content JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 主题研究表
CREATE TABLE topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    mode_id UUID REFERENCES reading_modes(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    topic_summary TEXT,
    related_chapters INTEGER[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 读书笔记表
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    note_type TEXT CHECK (note_type IN ('highlight', 'comment', 'question', 'summary')),
    content TEXT NOT NULL,
    page_number INTEGER,
    position_start INTEGER,
    position_end INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 读书会话表（用于对话共读）
CREATE TABLE reading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    session_type TEXT DEFAULT 'dialogue',
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_reading_modes_book_id ON reading_modes(book_id);
CREATE INDEX idx_topics_book_id ON topics(book_id);
CREATE INDEX idx_notes_book_id ON notes(book_id);
CREATE INDEX idx_notes_chapter_id ON notes(chapter_id);

-- ============================================
-- Row Level Security (RLS) - 行级安全策略
-- ============================================

-- 启用 RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- 公开读取和写入（后续可改为需要认证）
CREATE POLICY "Allow all for books" ON books FOR ALL USING (true);
CREATE POLICY "Allow all for chapters" ON chapters FOR ALL USING (true);
CREATE POLICY "Allow all for reading_modes" ON reading_modes FOR ALL USING (true);
CREATE POLICY "Allow all for topics" ON topics FOR ALL USING (true);
CREATE POLICY "Allow all for notes" ON notes FOR ALL USING (true);
CREATE POLICY "Allow all for reading_sessions" ON reading_sessions FOR ALL USING (true);

-- ============================================
-- Storage Bucket - 文件存储
-- ============================================

-- 创建书籍文件存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

-- 创建存储策略（公开访问书籍文件）
CREATE POLICY "Public read access for books"
ON storage.objects FOR SELECT
USING (bucket_id = 'books');

CREATE POLICY "Public upload access for books"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'books');

-- ============================================
-- 更新时间戳函数
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表添加更新时间触发器
CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_modes_updated_at
    BEFORE UPDATE ON reading_modes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
