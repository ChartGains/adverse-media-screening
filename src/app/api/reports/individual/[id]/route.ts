import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { formatDate, formatDateTime } from '@/lib/utils'

// Simple HTML to PDF-like text report (for now)
// In production, you'd use a library like @react-pdf/renderer or puppeteer

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch complete screening data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: screening, error } = await supabase
      .from('screening_subjects')
      .select(`
        *,
        article_analyses (*),
        reviews (*),
        screening_decisions (*)
      `)
      .eq('id', id)
      .single() as { data: any; error: unknown }

    if (error || !screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 })
    }

    const decision = screening.screening_decisions?.[0]
    const matchedArticles = screening.article_analyses?.filter(
      (a: { match_status: string }) => a.match_status === 'matched'
    ) || []

    // Generate report HTML
    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Screening Report - ${screening.full_name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e293b; margin: 0 0 10px 0; }
    .header .subtitle { color: #64748b; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #1e293b; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { }
    .info-label { color: #64748b; font-size: 12px; text-transform: uppercase; }
    .info-value { color: #1e293b; font-size: 14px; margin-top: 4px; }
    .decision-box { padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .decision-cleared { background: #dcfce7; border: 1px solid #86efac; }
    .decision-flagged { background: #fee2e2; border: 1px solid #fca5a5; }
    .decision-escalated { background: #fef3c7; border: 1px solid #fcd34d; }
    .article { padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; }
    .article-title { font-weight: bold; color: #1e293b; }
    .article-meta { color: #64748b; font-size: 12px; margin-top: 5px; }
    .risk-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .risk-critical { background: #dc2626; color: white; }
    .risk-high { background: #f97316; color: white; }
    .risk-medium { background: #eab308; color: black; }
    .risk-low { background: #3b82f6; color: white; }
    .risk-none { background: #22c55e; color: white; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Adverse Media Screening Report</h1>
    <div class="subtitle">Generated ${formatDateTime(new Date().toISOString())}</div>
  </div>

  <div class="section">
    <h2>Subject Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Full Name</div>
        <div class="info-value">${screening.full_name}</div>
      </div>
      ${screening.date_of_birth && screening.date_of_birth !== '1970-01-01' ? `
      <div class="info-item">
        <div class="info-label">Date of Birth</div>
        <div class="info-value">${formatDate(screening.date_of_birth)}</div>
      </div>` : ''}
      <div class="info-item">
        <div class="info-label">Address</div>
        <div class="info-value">${screening.address}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Country</div>
        <div class="info-value">${screening.country}</div>
      </div>
      ${screening.company_affiliation ? `
      <div class="info-item">
        <div class="info-label">Company Affiliation</div>
        <div class="info-value">${screening.company_affiliation}</div>
      </div>
      ` : ''}
      ${screening.aliases?.length ? `
      <div class="info-item">
        <div class="info-label">Aliases</div>
        <div class="info-value">${screening.aliases.join(', ')}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="section">
    <h2>Screening Decision</h2>
    ${decision ? `
    <div class="decision-box decision-${decision.decision}">
      <strong style="font-size: 18px;">
        ${decision.decision === 'cleared' ? '✓ CLEARED' : decision.decision === 'flagged' ? '⚠ FLAGGED' : '⚡ ESCALATED'}
      </strong>
      <p>Final Risk Level: <span class="risk-badge risk-${decision.final_risk_level || 'none'}">${(decision.final_risk_level || 'none').toUpperCase()}</span></p>
      ${decision.decision_summary ? `<p>Summary: ${decision.decision_summary}</p>` : ''}
      <p style="color: #64748b; font-size: 12px;">Decision made: ${formatDateTime(decision.created_at)}</p>
    </div>
    ` : `
    <p style="color: #64748b;">No decision has been made yet.</p>
    `}
  </div>

  <div class="section">
    <h2>Screening Summary</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Screening Status</div>
        <div class="info-value">${screening.status.toUpperCase()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Search Queries Executed</div>
        <div class="info-value">${screening.search_queries_count}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Articles Analyzed</div>
        <div class="info-value">${screening.articles_found_count}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Adverse Media Matches</div>
        <div class="info-value">${matchedArticles.length}</div>
      </div>
    </div>
  </div>

  ${matchedArticles.length > 0 ? `
  <div class="section">
    <h2>Flagged Articles</h2>
    ${matchedArticles.map((article: {
      article_headline?: string
      publisher?: string
      publication_date?: string
      risk_level?: string
      risk_category?: string
      ai_summary?: string
      article_url?: string
    }) => `
    <div class="article">
      <div class="article-title">${article.article_headline || 'Untitled'}</div>
      <div class="article-meta">
        ${article.publisher || 'Unknown source'} • ${article.publication_date ? formatDate(article.publication_date) : 'Unknown date'}
      </div>
      <p><span class="risk-badge risk-${article.risk_level || 'none'}">${(article.risk_level || 'unknown').toUpperCase()}</span> ${article.risk_category || ''}</p>
      ${article.ai_summary ? `<p>${article.ai_summary}</p>` : ''}
      ${article.article_url ? `<p style="color: #64748b; font-size: 12px;">Source: ${article.article_url}</p>` : ''}
    </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    <p>This report was automatically generated by the Adverse Media Screening Tool.</p>
    <p>Report ID: ${screening.id}</p>
    <p>Screening submitted: ${formatDateTime(screening.created_at)}</p>
    ${screening.completed_at ? `<p>Screening completed: ${formatDateTime(screening.completed_at)}</p>` : ''}
  </div>
</body>
</html>
`

    // Return as HTML (in production, convert to PDF)
    return new NextResponse(reportHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="screening_report_${screening.full_name.replace(/\s+/g, '_')}.html"`,
      },
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
