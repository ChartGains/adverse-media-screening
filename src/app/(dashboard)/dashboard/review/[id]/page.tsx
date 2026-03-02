'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { ArticleCard } from '@/components/review/ArticleCard'
import { 
  User,
  Calendar,
  MapPin,
  Building2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flag,
} from 'lucide-react'
import { formatDate, getRiskLevelColor } from '@/lib/utils'
import { ScreeningSubject, ArticleAnalysis, ReviewAction, RiskLevel } from '@/types/database'

interface ReviewData {
  screening: ScreeningSubject & {
    article_analyses: ArticleAnalysis[]
  }
}

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  
  const [data, setData] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [decisionNotes, setDecisionNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setIsLoading(true)
    const { data: screening, error } = await supabase
      .from('screening_subjects')
      .select(`
        *,
        article_analyses (*)
      `)
      .eq('id', id)
      .single()

    if (error || !screening) {
      router.push('/dashboard/review')
      return
    }

    setData({ screening: screening as unknown as ReviewData['screening'] })
    setIsLoading(false)
  }

  const handleArticleAction = async (
    articleId: string,
    action: ReviewAction,
    notes?: string
  ) => {
    const response = await fetch('/api/review/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: id,
        articleAnalysisId: articleId,
        action,
        notes,
      }),
    })

    if (response.ok) {
      await loadData()
    }
  }

  const handleDecision = async (decision: 'cleared' | 'flagged' | 'escalated') => {
    setIsSubmitting(true)

    // Calculate final risk level based on reviewed articles (only adverse ones)
    const matchedArticles = data?.screening.article_analyses.filter(
      a => a.match_status === 'matched' && a.risk_level && a.risk_level !== 'none'
    ) || []
    
    let finalRiskLevel: RiskLevel = 'none'
    if (matchedArticles.length > 0) {
      const riskPriority: Record<RiskLevel, number> = {
        critical: 5,
        high: 4,
        medium: 3,
        low: 2,
        none: 1,
      }
      
      for (const article of matchedArticles) {
        if (article.risk_level && riskPriority[article.risk_level] > riskPriority[finalRiskLevel]) {
          finalRiskLevel = article.risk_level
        }
      }
    }

    const response = await fetch('/api/review/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: id,
        decision,
        finalRiskLevel,
        decisionSummary: decisionNotes,
      }),
    })

    setIsSubmitting(false)

    if (response.ok) {
      router.push('/dashboard/review')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data) return null

  const { screening } = data
  // Safety filter: never show non-adverse articles (risk_level 'none') to reviewers
  const adverseArticles = screening.article_analyses.filter(
    a => a.risk_level && a.risk_level !== 'none'
  )
  const pendingArticles = adverseArticles.filter(
    a => a.match_status === 'pending' || a.match_status === 'uncertain'
  )
  const matchedArticles = adverseArticles.filter(
    a => a.match_status === 'matched'
  )
  const excludedArticles = adverseArticles.filter(
    a => a.match_status === 'excluded'
  )

  return (
    <>
      <Header 
        title="Review Screening" 
        subtitle={screening.full_name}
      />
      
      <div className="p-6 space-y-6">
        {/* Back button */}
        <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back to Queue
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Subject Info Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Subject Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Full Name</p>
                  <p className="font-medium">{screening.full_name}</p>
                </div>
                {screening.date_of_birth && screening.date_of_birth !== '1970-01-01' && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Date of Birth</p>
                      <p className="font-medium">{formatDate(screening.date_of_birth)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500">Location</p>
                    <p className="font-medium">{screening.country}</p>
                  </div>
                </div>
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
                        <Badge key={i} variant="secondary" className="text-xs">{alias}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Pending</span>
                  <Badge variant="warning">{pendingArticles.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Confirmed Matches</span>
                  <Badge variant="destructive">{matchedArticles.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Excluded</span>
                  <Badge variant="success">{excludedArticles.length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Decision Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Final Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add decision summary/notes..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="text-sm"
                />
                <div className="space-y-2">
                  <Button
                    className="w-full gap-2"
                    variant="success"
                    onClick={() => handleDecision('cleared')}
                    disabled={isSubmitting || pendingArticles.length > 0}
                    isLoading={isSubmitting}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Clear Subject
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="destructive"
                    onClick={() => handleDecision('flagged')}
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    <Flag className="h-4 w-4" />
                    Flag Subject
                  </Button>
                  <Button
                    className="w-full gap-2"
                    variant="warning"
                    onClick={() => handleDecision('escalated')}
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Escalate
                  </Button>
                </div>
                {pendingArticles.length > 0 && (
                  <p className="text-xs text-amber-600 text-center">
                    Review all {pendingArticles.length} pending articles before clearing
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Articles List */}
          <div className="lg:col-span-3 space-y-4">
            {/* Pending Articles - Needs Human Review */}
            {pendingArticles.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  📋 Needs Your Review ({pendingArticles.length})
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  AI has analyzed these articles. Review each one and decide if it&apos;s about this subject.
                </p>
                <div className="space-y-3">
                  {pendingArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onAction={(action, notes) => handleArticleAction(article.id, action, notes)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Matched Articles - Human Confirmed */}
            {matchedArticles.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-red-700 mb-3 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  ⚠️ Confirmed Adverse Media ({matchedArticles.length})
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  You have confirmed these articles are about this subject and contain adverse information.
                </p>
                <div className="space-y-3">
                  {matchedArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onAction={(action, notes) => handleArticleAction(article.id, action, notes)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Excluded Articles - Dismissed */}
            {excludedArticles.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  ✓ Excluded / Not Relevant ({excludedArticles.length})
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  You have determined these articles are not about this subject or not relevant.
                </p>
                <div className="space-y-3">
                  {excludedArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onAction={(action, notes) => handleArticleAction(article.id, action, notes)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No articles */}
            {adverseArticles.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                  <h3 className="text-xl font-medium text-slate-900">No Articles Found</h3>
                  <p className="text-slate-500 mt-2">
                    No adverse media articles were found for this subject.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
