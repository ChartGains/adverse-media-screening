import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Parse CSV
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Validate required headers
    const requiredHeaders = ['full_name', 'date_of_birth', 'address', 'country']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('batch_uploads')
      .insert({
        uploaded_by: user.id,
        filename: file.name,
        file_size_bytes: file.size,
        total_records: lines.length - 1,
        status: 'processing',
      } as never)
      .select()
      .single() as { data: { id: string } | null; error: unknown }

    if (batchError || !batch) {
      throw batchError
    }

    // Parse and insert records
    const adminClient = createAdminClient()
    let processed = 0
    let failed = 0
    const errors: { row: number; error: string }[] = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',')
        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || ''
        })

        // Validate required fields
        if (!row.full_name || !row.date_of_birth || !row.address || !row.country) {
          throw new Error('Missing required fields')
        }

        // Parse aliases if present
        const aliases = row.aliases
          ? row.aliases.split(';').map(a => a.trim()).filter(Boolean)
          : null

        // Insert screening subject
        await adminClient
          .from('screening_subjects')
          .insert({
            full_name: row.full_name,
            date_of_birth: row.date_of_birth,
            address: row.address,
            country: row.country,
            aliases,
            company_affiliation: row.company_affiliation || null,
            submitted_by: user.id,
            batch_id: batch.id,
            status: 'pending',
          } as never)

        processed++
      } catch (err) {
        failed++
        errors.push({
          row: i,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // Update batch record
    await supabase
      .from('batch_uploads')
      .update({
        processed_records: processed,
        failed_records: failed,
        status: failed === lines.length - 1 ? 'failed' : 'completed',
        error_log: errors,
        completed_at: new Date().toISOString(),
      } as never)
      .eq('id', batch.id)

    // Log audit event
    await adminClient.rpc('log_audit_event' as never, {
      p_user_id: user.id,
      p_action_type: 'batch_upload',
      p_entity_type: 'batch_upload',
      p_entity_id: batch.id,
      p_details: {
        filename: file.name,
        total_records: lines.length - 1,
        processed,
        failed,
      }
    } as never)

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      totalRecords: lines.length - 1,
      processed,
      failed,
    })
  } catch (error) {
    console.error('Batch upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
