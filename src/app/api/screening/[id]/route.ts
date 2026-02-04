import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch screening with related data
    const { data: screening, error } = await supabase
      .from('screening_subjects')
      .select(`
        *,
        search_results (
          id,
          query_used,
          query_category,
          source,
          result_url,
          result_title,
          result_snippet,
          result_position,
          domain,
          created_at
        ),
        article_analyses (
          id,
          article_headline,
          publication_date,
          publisher,
          article_url,
          ai_provider,
          risk_category,
          risk_level,
          subject_match_confidence,
          match_status,
          match_reasoning,
          ai_summary,
          key_findings,
          created_at
        ),
        reviews (
          id,
          action,
          reason_code,
          notes,
          created_at,
          reviewer_id
        ),
        screening_decisions (
          id,
          decision,
          final_risk_level,
          decision_summary,
          decided_by,
          reviewed_by,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ screening })
  } catch (error) {
    console.error('Fetch screening error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { data: screening, error } = await supabase
      .from('screening_subjects')
      .update(body as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ screening })
  } catch (error) {
    console.error('Update screening error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
