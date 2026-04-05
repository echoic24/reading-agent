const { Client } = require('pg')

async function setup() {
  const client = new Client({
    host: 'pgm-bp1aaq58651tk3gs.pg.rds.aliyuncs.com',
    port: 5432,
    user: 'hao',
    password: 'Clawster24!',
    database: 'postgres' // 默认连接 postgres
  })

  try {
    await client.connect()
    console.log('✅ 连接成功！')

    // 创建数据库
    await client.query('CREATE DATABASE reading_agent')
    console.log('✅ 数据库 reading_agent 创建成功')
  } catch (err) {
    if (err.code === '42P04') {
      console.log('📝 数据库 reading_agent 已存在')
    } else {
      console.error('❌ 错误:', err.message)
    }
  }

  // 连接到 reading_agent 数据库
  const db = new Client({
    host: 'pgm-bp1aaq58651tk3gs.pg.rds.aliyuncs.com',
    port: 5432,
    user: 'hao',
    password: 'Clawster24!',
    database: 'reading_agent'
  })

  await db.connect()
  console.log('✅ 连接到 reading_agent 数据库')

  // 创建表
  await db.query(`
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
  `)
  console.log('✅ books 表创建成功')

  await db.query(`
    CREATE TABLE IF NOT EXISTS reading_modes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id UUID REFERENCES books(id) ON DELETE CASCADE,
      mode_type TEXT NOT NULL,
      title TEXT,
      feishu_doc_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('✅ reading_modes 表创建成功')

  await db.end()
  console.log('✅ 设置完成！')
}

setup()
