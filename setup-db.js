const { Client } = require('pg');

const client = new Client({
  host: 'db.nfjzfyxmtuquptbwqlxa.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Clawster24!',
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- 书籍表
CREATE TABLE IF NOT EXISTS books (
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

-- 章节表
CREATE TABLE IF NOT EXISTS chapters (
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

-- 阅读模式表
CREATE TABLE IF NOT EXISTS reading_modes (
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

-- 主题研究表
CREATE TABLE IF NOT EXISTS topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    mode_id UUID REFERENCES reading_modes(id) ON DELETE CASCADE,
    topic_name TEXT NOT NULL,
    topic_summary TEXT,
    related_chapters INTEGER[],
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 读书笔记表
CREATE TABLE IF NOT EXISTS notes (
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

-- 读书会话表
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    session_type TEXT DEFAULT 'dialogue',
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_modes_book_id ON reading_modes(book_id);
CREATE INDEX IF NOT EXISTS idx_topics_book_id ON topics(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_chapter_id ON notes(chapter_id);

-- RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for books" ON books;
CREATE POLICY "Allow all for books" ON books FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for chapters" ON chapters;
CREATE POLICY "Allow all for chapters" ON chapters FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for reading_modes" ON reading_modes;
CREATE POLICY "Allow all for reading_modes" ON reading_modes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for topics" ON topics;
CREATE POLICY "Allow all for topics" ON topics FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for notes" ON notes;
CREATE POLICY "Allow all for notes" ON notes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for reading_sessions" ON reading_sessions;
CREATE POLICY "Allow all for reading_sessions" ON reading_sessions FOR ALL USING (true);

-- Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for books" ON storage.objects;
CREATE POLICY "Public read access for books" ON storage.objects FOR SELECT USING (bucket_id = 'books');

DROP POLICY IF EXISTS "Public upload access for books" ON storage.objects;
CREATE POLICY "Public upload access for books" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'books');

-- 更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_books_updated_at ON books;
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chapters_updated_at ON chapters;
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reading_modes_updated_at ON reading_modes;
CREATE TRIGGER update_reading_modes_updated_at BEFORE UPDATE ON reading_modes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function run() {
  try {
    console.log('🔄 连接到 Supabase 数据库...');
    await client.connect();
    console.log('✅ 已连接');

    console.log('🔄 执行 SQL 语句...');
    await client.query(sql);
    console.log('✅ 表结构创建成功！');

    // 验证表是否创建成功
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📋 已创建的表：');
    result.rows.forEach(row => console.log('  - ' + row.table_name));

    console.log('\n🎉 数据库配置完成！');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
