#!/bin/bash
# 自动处理读书Agent待处理书籍
# 每5分钟由cron触发，检查Supabase中状态为processing的书籍并处理

set -e

# Supabase配置
SUPABASE_URL="https://nfjzfyxmtuquptbwqlxa.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5manpmeXhtdHVxdXB0YndxbHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTAyOTEsImV4cCI6MjA5MDg2NjI5MX0.aB6jVdoTnMBYYl980dI4yyDYB3hC9FP98_WLvhTXfPg"

# 获取待处理的书籍
BOOKS=$(curl -s "$SUPABASE_URL/rest/v1/books?status=eq.processing&select=*" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")

# 检查是否有待处理书籍
if [ "$BOOKS" == "[]" ] || [ -z "$BOOKS" ]; then
  echo "$(date): 没有待处理的书籍"
  exit 0
fi

echo "$(date): 发现待处理的书籍"
echo "$BOOKS" | jq .