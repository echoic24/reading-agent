# 📚 全能读书Agent

AI 帮你深度阅读的 SaaS 工具。

## 功能

- 📁 上传 PDF 文件
- 🔗 粘贴网页链接或飞书文档链接
- ⚡ 四种阅读模式：
  - 速读提炼 - 快速了解全书框架
  - 深度解读 - 逐章详细分析
  - 主题研究 - 跨章节整合
  - 对话共读 - 基于内容的问答

## 技术栈

- **前端**: Next.js 14 + React + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **文件存储**: Supabase Storage
- **AI 能力**: clawster (本 agent)
- **集成**: 飞书开放平台

## 快速开始

### 1. 环境配置

复制 `.env.local.example` 为 `.env.local` 并填写配置：

```bash
cp .env.local.example .env.local
```

配置项说明：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `FEISHU_APP_ID` | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret |

### 2. 数据库设置

在 Supabase 中执行 `supabase/schema.sql` 创建必要的表。

### 3. 开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 4. 部署

推送到 GitHub 后，Vercel 会自动部署。

## 项目结构

```
src/
├── app/
│   ├── page.tsx          # 首页
│   ├── layout.tsx       # 布局
│   ├── globals.css      # 全局样式
│   └── api/             # API 路由
├── lib/
│   ├── supabase.ts      # Supabase 客户端
│   └── feishu.ts        # 飞书 API
└── components/          # 组件（待添加）
```

## License

MIT
