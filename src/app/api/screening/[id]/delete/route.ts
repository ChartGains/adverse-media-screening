import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
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
    const adminClient = createAdminClient()

    // Verify the screening exists and belongs to this user
    const { data: screening, error: fetchError } = await supabase
      .from('screening_subjects')
      .select('id, full_name, status, submitted_by')
      .eq('id', id)
      .single()

    if (fetchError || !screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    // Delete all related data in correct order (child tables first)
    // 1. Reviews (references article_analyses and screening_subjects)
    await adminClient
      .from('reviews')
      .delete()
      .eq('subject_id', id)

    // 2. Screening decisions
    await adminClient
      .from('screening_decisions')
      .delete()
      .eq('subject_id', id)

    // 3. Article analyses (references search_results and screening_subjects)
    await adminClient
      .from('article_analyses')
      .delete()
      .eq('subject_id', id)

    // 4. Search results
    await adminClient
      .from('search_results')
      .delete()
      .eq('subject_id', id)

    // 5. Finally, delete the screening subject itself
    const { error: deleteError } = await adminClient
      .from('screening_subjects')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete screening error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete screening' }, { status: 500 })
    }

    // Log audit event
    await adminClient.rpc('log_audit_event' as never, {
      p_user_id: user.id,
      p_action_type: 'screening_deleted',
      p_entity_type: 'screening_subject',
      p_entity_id: id,
      p_details: { full_name: (screening as { full_name: string }).full_name, status: (screening as { status: string }).status }
    } as never)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete screening error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
