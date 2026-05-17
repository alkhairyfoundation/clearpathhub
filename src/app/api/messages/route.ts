import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/neon';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get('recipientId')
    const senderId = searchParams.get('senderId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unread') === 'true'

    // Build query
    let queryStr = `
      SELECT 
        m.*,
        sender.id as sender_id,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.avatar_url as sender_avatar_url,
        recipient.id as recipient_id,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name,
        recipient.avatar_url as recipient_avatar_url
      FROM messages m
      JOIN profiles sender ON m.sender_id = sender.id
      JOIN profiles recipient ON m.recipient_id = recipient.id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];

    // Apply filters
    if (recipientId) {
      conditions.push('m.recipient_id = $' + (params.length + 1));
      params.push(recipientId);
    }

    if (senderId) {
      conditions.push('m.sender_id = $' + (params.length + 1));
      params.push(senderId);
    }

    if (unreadOnly) {
      conditions.push('m.is_read = false');
    }

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' ORDER BY m.created_at DESC';

    // Apply limit
    if (limit > 0) {
      queryStr += ' LIMIT $' + (params.length + 1);
      params.push(limit);
    }

    // Execute query
    const data = await query(queryStr, params);

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { recipient_id, subject, content } = await request.json()
    
    // Validate input
    if (!recipient_id || !subject || !content) {
      return NextResponse.json(
        { success: false, error: 'Recipient ID, subject, and content are required' },
        { status: 400 }
      );
    }

    // Verify recipient exists
    const recipientCheck = await query(
      'SELECT id FROM profiles WHERE id = $1',
      [recipient_id]
    );

    if (recipientCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Insert message
    const result = await query(
      `INSERT INTO messages (sender_id, recipient_id, subject, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        token.id,
        recipient_id,
        subject,
        content
      ]
    );

    // Get sender and recipient details for response
    const messageWithDetails = await query(
      `
      SELECT 
        m.*,
        sender.id as sender_id,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.avatar_url as sender_avatar_url,
        recipient.id as recipient_id,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name,
        recipient.avatar_url as recipient_avatar_url
      FROM messages m
      JOIN profiles sender ON m.sender_id = sender.id
      JOIN profiles recipient ON m.recipient_id = recipient.id
      WHERE m.id = $1
      `,
      [result[0].id]
    );

    return NextResponse.json({ success: true, data: messageWithDetails[0] })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}