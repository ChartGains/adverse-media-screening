import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch completed screenings
  const { data: completedScreenings } = await supabase
    .from('screening_subjects')
    .select(`
      *,
      screening_decisions (*)
    `)
    .eq('status', 'completed')
    .eq('submitted_by', user?.id || '')
    .order('completed_at', { ascending: false })
    .limit(50) as { data: Array<{
      id: string
      full_name: string
      date_of_birth: string
      country: string
      status: string
      risk_level: string | null
      completed_at: string | null
      screening_decisions: Array<{
        decision: string
        final_risk_level: string | null
        decision_summary: string | null
        created_at: string
      }> | null
    }> | null }

  // Fetch batch uploads
  const { data: batchUploads } = await supabase
    .from('batch_uploads')
    .select('*')
    .eq('uploaded_by', user?.id || '')
    .order('created_at', { ascending: false })
    .limit(20) as { data: Array<{
      id: string
      filename: string
      total_records: number | null
      processed_records: number
      failed_records: number
      status: string
      created_at: string
    }> | null }

  return (
    <>
      <Header 
        title="Reports" 
        subtitle="Generate and download screening reports"
      />
      
      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-4">
          <Link href="/dashboard/screening/batch">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Batch Upload
            </Button>
          </Link>
        </div>

        {/* Batch Uploads */}
        {batchUploads && batchUploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Batch Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {batchUploads.map((batch) => (
                  <div 
                    key={batch.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{batch.filename}</p>
                      <p className="text-sm text-slate-500">
                        {batch.processed_records} / {batch.total_records} processed
                        {batch.failed_records > 0 && (
                          <span className="text-red-600 ml-2">
                            ({batch.failed_records} failed)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Uploaded {formatDateTime(batch.created_at)}
                      </p>
                    </div>
                    <Badge className={getStatusColor(batch.status)}>
                      {batch.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Screenings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Completed Screenings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedScreenings && completedScreenings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Subject</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Country</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Decision</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Risk Level</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Completed</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedScreenings.map((screening) => {
                      const decision = screening.screening_decisions?.[0]
                      return (
                        <tr key={screening.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{screening.full_name}</p>
                            <p className="text-sm text-slate-500">DOB: {formatDate(screening.date_of_birth)}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {screening.country}
                          </td>
                          <td className="py-3 px-4">
                            {decision ? (
                              <Badge variant={
                                decision.decision === 'cleared' ? 'success' :
                                decision.decision === 'flagged' ? 'destructive' : 'warning'
                              }>
                                {decision.decision === 'cleared' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {decision.decision === 'flagged' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {decision.decision}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">N/A</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={screening.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
                              {screening.risk_level || 'N/A'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {screening.completed_at ? formatDateTime(screening.completed_at) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/dashboard/screening/${screening.id}`}>
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <ExternalLink className="h-4 w-4" />
                                  View
                                </Button>
                              </Link>
                              <Link href={`/api/reports/individual/${screening.id}`}>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Download className="h-4 w-4" />
                                  PDF
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-medium text-slate-900">No completed screenings</h3>
                <p className="mt-2">Completed screenings will appear here for reporting</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
