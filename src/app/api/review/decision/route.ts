import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const decisionSchema = z.object({
  subjectId: z.string().uuid(),
  decision: z.enum(['cleared', 'flagged', 'escalated']),
  finalRiskLevel: z.enum(['none', 'low', 'medium', 'high', 'critical']).optional(),
  decisionSummary: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = decisionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Get counts for the decision record
    const { count: flaggedCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', data.subjectId)
      .in('action', ['confirm_match', 'flag'])

    const { count: totalReviewed } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', data.subjectId)

    // Upsert screening decision (update if one already exists for this subject)
    const { data: decision, error } = await supabase
      .from('screening_decisions')
      .upsert({
        subject_id: data.subjectId,
        decision: data.decision,
        final_risk_level: data.finalRiskLevel,
        decision_summary: data.decisionSummary,
        decided_by: user.id,
        flagged_articles_count: flaggedCount || 0,
        total_articles_reviewed: totalReviewed || 0,
      } as never, {
        onConflict: 'subject_id',
      })
      .select()
      .single() as { data: { id: string } | null; error: { code?: string } | null }

    if (error) {
      throw error
    }

    // Update subject status
    await supabase
      .from('screening_subjects')
      .update({
        status: data.decision === 'escalated' ? 'escalated' : 'completed',
        risk_level: data.finalRiskLevel,
        completed_at: data.decision !== 'escalated' ? new Date().toISOString() : null,
      } as never)
      .eq('id', data.subjectId)

    // Log audit event
    const adminClient = createAdminClient()
    await adminClient.rpc('log_audit_event' as never, {
      p_user_id: user.id,
      p_action_type: `decision_${data.decision}`,
      p_entity_type: 'screening_decision',
      p_entity_id: decision?.id,
      p_details: {
        subject_id: data.subjectId,
        risk_level: data.finalRiskLevel,
        flagged_articles: flaggedCount,
      }
    } as never)

    return NextResponse.json({ success: true, decision })
  } catch (error) {
    console.error('Decision error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
