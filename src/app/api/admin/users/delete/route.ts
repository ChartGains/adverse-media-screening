import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
})

export async function DELETE(request: NextRequest) {
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
    const validationResult = deleteUserSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { userId } = validationResult.data

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get user info for audit log
    const { data: targetUser } = await adminClient
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    // Delete from auth.users (this will cascade to user_profiles due to foreign key)
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting user from auth:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Log the action
    await adminClient.rpc('log_audit_event', {
      p_user_id: user.id,
      p_action_type: 'user_deleted',
      p_entity_type: 'user_profile',
      p_entity_id: userId,
      p_details: { 
        deleted_email: targetUser?.email,
        deleted_name: targetUser?.full_name,
        deleted_by: user.email 
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
