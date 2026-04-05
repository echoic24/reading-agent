-- 全能读书Agent 数据库 Schema
-- 运行一次即可，以后新项目可以复用此文件

-- =============================================
-- 处理队列表
-- =============================================
CREATE TABLE IF NOT EXISTS public.processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Queue insert" ON public.processing_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Queue select" ON public.processing_queue FOR SELECT USING (true);
CREATE POLICY "Queue delete" ON public.processing_queue FOR DELETE USING (true);
