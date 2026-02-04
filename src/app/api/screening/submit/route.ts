import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const screeningSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  aliases: z.array(z.string()).optional(),
  company_affiliation: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = screeningSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Insert the screening subject
    const { data: screening, error } = await supabase
      .from('screening_subjects')
      .insert({
        full_name: data.full_name,
        date_of_birth: data.date_of_birth || null,
        address: data.address || null,
        country: data.country || null,
        aliases: data.aliases?.filter(a => a.trim()) || null,
        company_affiliation: data.company_affiliation || null,
        submitted_by: user.id,
        status: 'pending',
      } as never)
      .select()
      .single() as { data: { id: string } | null; error: unknown }

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create screening' }, { status: 500 })
    }

    // Log audit event
    const adminClient = createAdminClient()
    await adminClient.rpc('log_audit_event' as never, {
      p_user_id: user.id,
      p_action_type: 'screening_submitted',
      p_entity_type: 'screening_subject',
      p_entity_id: screening?.id,
      p_details: { full_name: data.full_name, country: data.country }
    } as never)

    return NextResponse.json({ 
      success: true, 
      screening,
      message: 'Screening submitted successfully' 
    })
  } catch (error) {
    console.error('Screening submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
