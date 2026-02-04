'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Globe,
} from 'lucide-react'
import { formatDate, calculateConfidenceColor } from '@/lib/utils'
import { ArticleAnalysis, ReviewAction } from '@/types/database'

interface ArticleCardProps {
  article: ArticleAnalysis
  onAction: (action: ReviewAction, notes?: string) => Promise<void>
  isLoading?: boolean
}

export function ArticleCard({ article, onAction, isLoading }: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = async (action: ReviewAction) => {
    setActionLoading(action)
    try {
      await onAction(action, notes)
      setNotes('')
    } finally {
      setActionLoading(null)
    }
  }

  const confidenceColor = calculateConfidenceColor(article.subject_match_confidence)

  return (
    <Card className={`transition-all ${
      article.match_status === 'matched' 
        ? 'border-red-200 bg-red-50/50' 
        : article.match_status === 'excluded'
        ? 'border-green-200 bg-green-50/50 opacity-60'
        : ''
    }`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900 line-clamp-2">
              {article.article_headline || 'Untitled Article'}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
              {article.publisher && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {article.publisher}
                </span>
              )}
              {article.publication_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(article.publication_date)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={article.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
              {article.risk_level || 'Unknown'}
            </Badge>
            <a 
              href={article.article_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-slate-500" />
            </a>
          </div>
        </div>

        {/* Confidence & Category */}
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Match Confidence:</span>
            <span className={`font-semibold ${confidenceColor}`}>
              {article.subject_match_confidence?.toFixed(0) || 0}%
            </span>
          </div>
          {article.risk_category && (
            <Badge variant="secondary">{article.risk_category}</Badge>
          )}
        </div>

        {/* Summary */}
        <div className="mt-3">
          <p className="text-sm text-slate-700">
            {article.ai_summary || 'No summary available'}
          </p>
        </div>

        {/* Expandable section */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {isExpanded ? 'Show less' : 'Show more details'}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3 pt-3 border-t border-slate-200">
            {/* Match Reasoning */}
            <div>
              <p className="text-sm font-medium text-slate-700">AI Match Reasoning:</p>
              <p className="text-sm text-slate-600 mt-1">
                {article.match_reasoning || 'No reasoning provided'}
              </p>
            </div>

            {/* Key Findings */}
            {article.key_findings && article.key_findings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700">Key Findings:</p>
                <ul className="list-disc list-inside text-sm text-slate-600 mt-1">
                  {article.key_findings.map((finding, i) => (
                    <li key={i}>{finding}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            <div>
              <Textarea
                placeholder="Add review notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {article.match_status !== 'matched' && article.match_status !== 'excluded' && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction('confirm_match')}
                disabled={isLoading || !!actionLoading}
                isLoading={actionLoading === 'confirm_match'}
                className="gap-1"
                title="Confirm this article is about the subject and contains adverse information"
              >
                <AlertTriangle className="h-4 w-4" />
                Confirm Match
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={() => handleAction('exclude')}
                disabled={isLoading || !!actionLoading}
                isLoading={actionLoading === 'exclude'}
                className="gap-1"
                title="This article is NOT about the subject or is not relevant"
              >
                <XCircle className="h-4 w-4" />
                Exclude
              </Button>
              <Button
                size="sm"
                variant="warning"
                onClick={() => handleAction('escalate')}
                disabled={isLoading || !!actionLoading}
                isLoading={actionLoading === 'escalate'}
                className="gap-1"
                title="Uncertain - send to senior reviewer for decision"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              <strong>Confirm:</strong> This is adverse media about this person • 
              <strong> Exclude:</strong> Wrong person or not relevant • 
              <strong> Escalate:</strong> Unsure, needs senior review
            </p>
          </div>
        )}

        {/* Status indicators */}
        {article.match_status === 'matched' && (
          <div className="mt-3 flex items-center gap-2 text-red-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Confirmed as match</span>
          </div>
        )}
        {article.match_status === 'excluded' && (
          <div className="mt-3 flex items-center gap-2 text-green-600">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Excluded - not a match</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
