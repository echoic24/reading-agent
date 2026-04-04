import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  feishu_open_id: string | null
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  file_url: string | null
  file_type: string | null
  file_size: number | null
  source_url: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  book_id: string
  user_id: string
  mode: 'summary' | 'deep_dive' | 'themes' | 'chat'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result_url: string | null
  result_data: any | null
  feishu_doc_url: string | null
  feishu_table_url: string | null
  created_at: string
  updated_at: string
}

// Supabase Database helper functions
export async function createBook(userId: string, bookData: Partial<Book>) {
  const { data, error } = await supabaseAdmin
    .from('books')
    .insert({ user_id: userId, ...bookData })
    .select()
    .single()
  
  if (error) throw error
  return data as Book
}

export async function updateBook(bookId: string, updates: Partial<Book>) {
  const { data, error } = await supabaseAdmin
    .from('books')
    .update(updates)
    .eq('id', bookId)
    .select()
    .single()
  
  if (error) throw error
  return data as Book
}

export async function createJob(userId: string, bookId: string, mode: Job['mode']) {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .insert({ user_id: userId, book_id: bookId, mode })
    .select()
    .single()
  
  if (error) throw error
  return data as Job
}

export async function updateJob(jobId: string, updates: Partial<Job>) {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()
  
  if (error) throw error
  return data as Job
}

export async function getUserBooks(userId: string) {
  const { data, error } = await supabase
    .from('books')
    .select('*, jobs(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as (Book & { jobs: Job[] })[]
}
