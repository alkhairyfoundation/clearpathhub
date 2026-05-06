import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get('recipientId')
    const senderId = searchParams.get('senderId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unread') === 'true'

    // Build query
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(id, first_name, last_name, avatar_url),
        recipient:profiles(id, first_name, last_name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (recipientId) {
      query = query.eq('recipient_id', recipientId)
    }

    if (senderId) {
      query = query.eq('sender_id', senderId)
    }

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // Apply limit
    query = query.limit(limit)

    // Execute query
    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { recipient_id, subject, content } = await request.json()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id,
        subject,
        content
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}