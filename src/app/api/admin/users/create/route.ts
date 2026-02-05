import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2, 'Full name is required'),
  role: z.enum(['analyst', 'senior_analyst', 'admin', 'auditor']),
  department: z.string().optional(),
  manager_id: z.string().uuid().optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createUserSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { email, full_name, role, department, manager_id } = validationResult.data

    // Use admin client to invite the user
    const adminClient = createAdminClient()

    // Invite user by email - they'll receive an email to set their password
    const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          role,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/auth/callback`,
      }
    )

    if (authError) {
      console.error('Error inviting user:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
    }

    // The trigger should auto-create the profile, but let's update it with all fields
    // Wait a moment for the trigger to fire
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({
        full_name,
        role,
        department: department || null,
        manager_id: manager_id || null,
        is_active: true,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Profile might not exist yet, try inserting
      await adminClient
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          role,
          department: department || null,
          manager_id: manager_id || null,
          is_active: true,
        })
    }

    // Log the action
    await adminClient.rpc('log_audit_event', {
      p_user_id: user.id,
      p_action_type: 'user_invited',
      p_entity_type: 'user_profile',
      p_entity_id: authData.user.id,
      p_details: { email, role, invited_by: user.email },
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation email sent successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role,
      },
    })
  } catch (error) {
    console.error('Invite user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
