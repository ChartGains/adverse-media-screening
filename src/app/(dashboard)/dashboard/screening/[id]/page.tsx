import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  User,
  Calendar,
  MapPin,
  Building2,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils'
import { StartScreeningButton } from '@/components/screening/StartScreeningButton'

export default async function ScreeningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: screening, error } = await supabase
    .from('screening_subjects')
    .select(`
      *,
      article_analyses (
        id,
        article_headline,
        publication_date,
        publisher,
        article_url,
        risk_category,
        risk_level,
        subject_match_confidence,
        match_status,
        ai_summary
      ),
      screening_decisions (
        id,
        decision,
        final_risk_level,
        decision_summary,
        created_at
      )
    `)
    .eq('id', id)
    .single() as { data: {
      id: string
      full_name: string
      date_of_birth: string
      address: string
      country: string
      aliases: string[] | null
      company_affiliation: string | null
      status: string
      risk_level: string | null
      created_at: string
      completed_at: string | null
      article_analyses: Array<{
        id: string
        article_headline: string | null
        publication_date: string | null
        publisher: string | null
        article_url: string | null
        risk_category: string | null
        risk_level: string | null
        subject_match_confidence: number | null
        match_status: string
        ai_summary: string | null
      }> | null
      screening_decisions: Array<{
        id: string
        decision: string
        final_risk_level: string | null
        decision_summary: string | null
        created_at: string
      }> | null
    } | null, error: unknown }

  if (error || !screening) {
    notFound()
  }

  const statusSteps = [
    { key: 'pending', label: 'Submitted' },
    { key: 'searching', label: 'Searching' },
    { key: 'analyzing', label: 'Analyzing' },
    { key: 'review', label: 'Review' },
    { key: 'completed', label: 'Completed' },
  ]

  const currentStepIndex = statusSteps.findIndex(s => s.key === screening.status)

  return (
    <>
      <Header 
        title="Screening Details" 
        subtitle={screening.full_name}
      />
      
      <div className="p-6 space-y-6">
        {/* Back button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Status Progress */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        index <= currentStepIndex
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {index < currentStepIndex ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span className={`mt-2 text-sm ${
                      index <= currentStepIndex ? 'text-slate-900 font-medium' : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`w-24 h-1 mx-2 ${
                        index < currentStepIndex ? 'bg-emerald-600' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject Information */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Subject Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Full Name</p>
                <p className="font-medium">{screening.full_name}</p>
              </div>
              {screening.date_of_birth && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Date of Birth</p>
                    <p className="font-medium">{formatDate(screening.date_of_birth)}</p>
                  </div>
                </div>
              )}
              {(screening.address || screening.country) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Location</p>
                    {screening.address && <p className="font-medium">{screening.address}</p>}
                    {screening.country && <p className="text-sm text-slate-600">{screening.country}</p>}
                  </div>
                </div>
              )}
              {screening.company_affiliation && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Company</p>
                    <p className="font-medium">{screening.company_affiliation}</p>
                  </div>
                </div>
              )}
              {screening.aliases && screening.aliases.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Aliases</p>
                  <div className="flex flex-wrap gap-1">
                    {screening.aliases.map((alias, i) => (
                      <Badge key={i} variant="secondary">{alias}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Submitted</p>
                    <p className="font-medium">{formatDateTime(screening.created_at)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results & Actions */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Screening Results
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={screening.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
                  {screening.risk_level ? `${screening.risk_level.toUpperCase()} RISK` : 'PENDING'}
                </Badge>
                <Badge className={getStatusColor(screening.status)}>
                  {screening.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {screening.status === 'pending' && (
                <StartScreeningButton 
                  subjectId={screening.id} 
                  currentStatus={screening.status} 
                />
              )}

              {(screening.status === 'searching' || screening.status === 'analyzing') && (
                <div className="text-center py-12">
                  <div className="animate-spin">
                    <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">
                    {screening.status === 'searching' ? 'Searching...' : 'Analyzing...'}
                  </h3>
                  <p className="text-slate-500 mt-1">
                    {screening.status === 'searching' 
                      ? 'Running search queries across multiple sources...'
                      : 'AI is analyzing the found articles...'}
                  </p>
                </div>
              )}

              {screening.status === 'review' && (() => {
                const flaggedArticles = screening.article_analyses?.filter(
                  a => a.risk_level && a.risk_level !== 'none'
                ) || []
                const allArticles = screening.article_analyses || []
                const totalAnalyzed = allArticles.length

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-amber-800">Ready for Review</p>
                          <p className="text-sm text-amber-700">
                            {flaggedArticles.length} potential matches found ({totalAnalyzed} total analyzed)
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/review/${screening.id}`}>
                        <Button className="bg-amber-600 hover:bg-amber-700">
                          Start Review
                        </Button>
                      </Link>
                    </div>

                    {flaggedArticles.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-slate-900">Flagged Articles</h4>
                        {flaggedArticles.slice(0, 5).map((article) => (
                          <div key={article.id} className="p-3 border border-slate-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 line-clamp-1">
                                  {article.article_headline || 'Untitled'}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">
                                  {article.ai_summary}
                                </p>
                              </div>
                              <Badge variant={article.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
                                {article.risk_level || 'unknown'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {flaggedArticles.length > 5 && (
                          <p className="text-sm text-slate-500 text-center">
                            + {flaggedArticles.length - 5} more flagged articles
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-green-800 font-medium">No adverse media found</p>
                        <p className="text-sm text-green-700">
                          {totalAnalyzed} articles were analyzed but none contained relevant adverse information about this person.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {screening.status === 'completed' && screening.screening_decisions?.[0] && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    screening.screening_decisions[0].decision === 'cleared'
                      ? 'bg-green-50 border-green-200'
                      : screening.screening_decisions[0].decision === 'flagged'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {screening.screening_decisions[0].decision === 'cleared' ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      )}
                      <div>
                        <p className="font-semibold text-lg">
                          {screening.screening_decisions[0].decision === 'cleared' ? 'Cleared' : 'Flagged'}
                        </p>
                        <p className="text-sm text-slate-600">
                          Decision made on {formatDateTime(screening.screening_decisions[0].created_at)}
                        </p>
                      </div>
                    </div>
                    {screening.screening_decisions[0].decision_summary && (
                      <p className="mt-3 text-slate-700">
                        {screening.screening_decisions[0].decision_summary}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
