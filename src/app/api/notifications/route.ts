import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ notifications: data || [] })
  } catch (error) {
    console.error('Fetch notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, markAllRead } = await request.json()

    if (markAllRead) {
      // Mark all notifications as read
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as never)
        .eq('user_id', user.id)
        .eq('is_read', false)
    } else if (notificationId) {
      // Mark single notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as never)
        .eq('id', notificationId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
