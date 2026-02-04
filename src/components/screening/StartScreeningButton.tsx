'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface StartScreeningButtonProps {
  subjectId: string
  currentStatus: string
}

export function StartScreeningButton({ subjectId, currentStatus }: StartScreeningButtonProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState<'idle' | 'searching' | 'analyzing' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<{ queriesExecuted?: number; resultsFound?: number } | null>(null)

  const runScreening = async () => {
    setIsRunning(true)
    setStatus('searching')
    setMessage('Running search queries...')

    try {
      // Step 1: Execute search
      const searchResponse = await fetch('/api/search/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      })

      const searchResult = await searchResponse.json()

      if (!searchResponse.ok) {
        throw new Error(searchResult.error || 'Search failed')
      }

      setResults({
        queriesExecuted: searchResult.queriesExecuted,
        resultsFound: searchResult.resultsFound,
      })
      setMessage(`Found ${searchResult.resultsFound} results from ${searchResult.queriesExecuted} queries`)

      // Step 2: Run AI analysis
      setStatus('analyzing')
      setMessage('Analyzing articles with AI...')

      const analysisResponse = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      })

      const analysisResult = await analysisResponse.json()

      if (!analysisResponse.ok) {
        throw new Error(analysisResult.error || 'Analysis failed')
      }

      setStatus('done')
      setMessage(`Complete! Analyzed ${analysisResult.articlesAnalyzed} articles.`)

      // Refresh the page after a moment
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Screening error:', error)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsRunning(false)
    }
  }

  // Only show for pending status
  if (currentStatus !== 'pending') {
    return null
  }

  return (
    <div className="text-center py-8">
      {status === 'idle' && (
        <>
          <div className="h-16 w-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
            <Play className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Ready to Screen</h3>
          <p className="text-slate-500 mt-1 mb-6">
            Click below to start the adverse media screening process.
          </p>
          <Button 
            onClick={runScreening} 
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Screening
          </Button>
        </>
      )}

      {(status === 'searching' || status === 'analyzing') && (
        <>
          <div className="h-16 w-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
            {status === 'searching' ? 'Searching...' : 'Analyzing...'}
          </h3>
          <p className="text-slate-500 mt-1">{message}</p>
          {results && (
            <p className="text-sm text-emerald-600 mt-2">
              Found {results.resultsFound} articles to analyze
            </p>
          )}
        </>
      )}

      {status === 'done' && (
        <>
          <div className="h-16 w-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Screening Complete!</h3>
          <p className="text-slate-500 mt-1">{message}</p>
          <p className="text-sm text-slate-400 mt-2">Refreshing page...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="h-16 w-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">Error</h3>
          <p className="text-red-600 mt-1">{message}</p>
          <Button 
            onClick={runScreening} 
            variant="outline"
            className="mt-4"
          >
            Try Again
          </Button>
        </>
      )}
    </div>
  )
}
