const { neon } = require('@neondatabase/serverless')

async function setup() {
  // Use the connection string from env
  const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_q5xcygQjBv3z@ep-billowing-lab-a1s2uxlv-pooler.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require'
  
  const sql = neon(connectionString)
  
  try {
    console.log('连接 Neon 数据库...')
    
    // 创建 books 表
    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        author TEXT DEFAULT '未知作者',
        source_type TEXT DEFAULT 'pdf',
        file_path TEXT,
        status TEXT DEFAULT 'pending',
        user_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log('✅ books 表创建成功')
    
    // 创建 reading_modes 表
    await sql`
      CREATE TABLE IF NOT EXISTS reading_modes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID REFERENCES books(id) ON DELETE CASCADE,
        mode_type TEXT NOT NULL,
        title TEXT,
        feishu_doc_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log('✅ reading_modes 表创建成功')
    
    console.log('🎉 数据库设置完成！')
  } catch (err) {
    console.error('错误:', err.message)
  }
}

setup()
