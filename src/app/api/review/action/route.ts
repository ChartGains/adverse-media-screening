import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const reviewActionSchema = z.object({
  subjectId: z.string().uuid(),
  articleAnalysisId: z.string().uuid().optional(),
  action: z.enum(['confirm_match', 'exclude', 'escalate', 'clear', 'flag']),
  reasonCode: z.string().optional(),
  notes: z.string().optional(),
  timeSpentSeconds: z.number().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = reviewActionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data
    const adminClient = createAdminClient()

    // Insert review action using admin client to bypass RLS
    const { data: review, error: reviewError } = await adminClient
      .from('reviews')
      .insert({
        subject_id: data.subjectId,
        article_analysis_id: data.articleAnalysisId,
        reviewer_id: user.id,
        action: data.action,
        reason_code: data.reasonCode,
        notes: data.notes,
        time_spent_seconds: data.timeSpentSeconds,
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Review insert error:', reviewError)
      return NextResponse.json({ error: 'Failed to save review', details: reviewError.message }, { status: 500 })
    }

    // If article was reviewed, update the analysis match status
    if (data.articleAnalysisId) {
      const matchStatus = data.action === 'confirm_match' 
        ? 'matched' 
        : data.action === 'exclude' 
        ? 'excluded' 
        : 'uncertain'

      const { error: updateError } = await adminClient
        .from('article_analyses')
        .update({ match_status: matchStatus })
        .eq('id', data.articleAnalysisId)

      if (updateError) {
        console.error('Article update error:', updateError)
      }
    }

    // If escalated, notify the manager
    if (data.action === 'escalate') {
      // Get user's manager
      const { data: userProfile } = await adminClient
        .from('user_profiles')
        .select('manager_id, full_name')
        .eq('id', user.id)
        .single()

      if (userProfile?.manager_id) {
        // Create notification for manager
        await adminClient
          .from('notifications')
          .insert({
            user_id: userProfile.manager_id,
            type: 'escalation',
            title: 'Article Escalated for Review',
            message: `${userProfile.full_name} has escalated an article for your review.`,
            link: `/dashboard/review/${data.subjectId}`,
            metadata: {
              subject_id: data.subjectId,
              article_id: data.articleAnalysisId,
              escalated_by: user.id,
            }
          })
      }
    }

    // Log audit event
    await adminClient.rpc('log_audit_event' as never, {
      p_user_id: user.id,
      p_action_type: `review_${data.action}`,
      p_entity_type: 'review',
      p_entity_id: review?.id,
      p_details: {
        subject_id: data.subjectId,
        article_id: data.articleAnalysisId,
        reason_code: data.reasonCode,
      }
    } as never)

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Review action error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}
