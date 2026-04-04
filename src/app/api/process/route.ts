import { NextRequest, NextResponse } from 'next/server'
import { createBook, createJob, updateBook, Job } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, author, fileUrl, fileType, sourceUrl, modes } = body
    
    // Create book record
    const book = await createBook(userId, {
      title,
      author,
      file_url: fileUrl,
      file_type: fileType,
      source_url: sourceUrl,
      status: 'processing'
    })
    
    // Create jobs for each mode
    const jobs = await Promise.all(
      modes.map(async (mode: string) => {
        return await createJob(userId, book.id, mode as Job['mode'])
      })
    )
    
    // Update book progress
    await updateBook(book.id, { progress: 10 })
    
    return NextResponse.json({
      success: true,
      book,
      jobs
    })
  } catch (error: any) {
    console.error('Error creating processing job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create processing job' },
      { status: 500 }
    )
  }
}
