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
    const status = searchParams.get('status') || 'review'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch screening queue
    const { data: queue, error, count } = await supabase
      .from('screening_subjects')
      .select(`
        *,
        article_analyses (
          id,
          risk_level,
          match_status
        )
      `, { count: 'exact' })
      .eq('status', status)
      .or(`assigned_to.eq.${user.id},assigned_to.is.null`)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      queue, 
      total: count,
      hasMore: count ? offset + limit < count : false
    })
  } catch (error) {
    console.error('Fetch queue error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
