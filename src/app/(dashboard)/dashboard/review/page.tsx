import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  ClipboardCheck, 
  ArrowRight, 
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface ScreeningWithAnalyses {
  id: string
  full_name: string
  country: string
  status: string
  risk_level: string | null
  created_at: string
  article_analyses: Array<{
    id: string
    risk_level: string | null
    match_status: string
  }> | null
}

export default async function ReviewQueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch review queue
  const { data: reviewQueue } = await supabase
    .from('screening_subjects')
    .select(`
      *,
      article_analyses (
        id,
        risk_level,
        match_status
      )
    `)
    .eq('status', 'review')
    .or(`assigned_to.eq.${user?.id},assigned_to.is.null`)
    .order('created_at', { ascending: true }) as { data: ScreeningWithAnalyses[] | null }

  // Calculate stats
  const stats = {
    pending: reviewQueue?.length || 0,
    highRisk: reviewQueue?.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length || 0,
    mediumRisk: reviewQueue?.filter(s => s.risk_level === 'medium').length || 0,
    lowRisk: reviewQueue?.filter(s => s.risk_level === 'low' || s.risk_level === 'none').length || 0,
  }

  return (
    <>
      <Header 
        title="Review Queue" 
        subtitle="Screenings awaiting human review"
      />
      
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-100">
                <ClipboardCheck className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-slate-500">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
                <p className="text-sm text-slate-500">High Risk</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.mediumRisk}</p>
                <p className="text-sm text-slate-500">Medium Risk</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.lowRisk}</p>
                <p className="text-sm text-slate-500">Low/No Risk</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue List */}
        <Card>
          <CardHeader>
            <CardTitle>Items Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewQueue && reviewQueue.length > 0 ? (
              <div className="space-y-3">
                {reviewQueue.map((screening) => {
                  const matchedArticles = screening.article_analyses?.filter(
                    a => a.match_status === 'matched' || a.match_status === 'pending'
                  ).length || 0
                  const totalArticles = screening.article_analyses?.length || 0

                  return (
                    <Link 
                      key={screening.id}
                      href={`/dashboard/review/${screening.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-slate-900">{screening.full_name}</h3>
                          <Badge variant={screening.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
                            {screening.risk_level || 'Pending'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <span>{screening.country}</span>
                          <span>•</span>
                          <span>{totalArticles} articles found</span>
                          {matchedArticles > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600">{matchedArticles} potential matches</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatRelativeTime(screening.created_at)}</span>
                        </div>
                      </div>
                      <Button variant="ghost" className="gap-2">
                        Review
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                <h3 className="text-xl font-medium text-slate-900">All caught up!</h3>
                <p className="text-slate-500 mt-2">
                  There are no screenings pending review at the moment.
                </p>
                <Link href="/dashboard/screening/new">
                  <Button className="mt-4">
                    Start New Screening
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
