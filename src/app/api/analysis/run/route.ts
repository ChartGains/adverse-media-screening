import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const MAX_ARTICLES_TO_ANALYZE = 15 // Limit for speed
const PARALLEL_BATCH_SIZE = 5 // Process 5 at a time

interface SearchResultRow {
  id: string
  result_url: string
  result_title: string | null
  result_snippet: string | null
  domain: string | null
  query_category: string | null
}

interface AnalysisResult {
  url: string
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
  riskCategory: string
  matchConfidence: number
  aiSuggestedMatch: 'likely_match' | 'likely_not_match' | 'uncertain' // AI suggestion (not final)
  summary: string
  reasoning: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subjectId } = await request.json()

    if (!subjectId) {
      return NextResponse.json({ error: 'Subject ID required' }, { status: 400 })
    }

    // Fetch the subject
    const { data: subject } = await supabase
      .from('screening_subjects')
      .select('full_name, date_of_birth, country, aliases, company_affiliation')
      .eq('id', subjectId)
      .single() as { data: { full_name: string; date_of_birth: string | null; country: string | null; aliases: string[] | null; company_affiliation: string | null } | null }

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Fetch search results - limit to top results for speed
    const { data: searchResults } = await supabase
      .from('search_results')
      .select('id, result_url, result_title, result_snippet, domain, query_category')
      .eq('subject_id', subjectId)
      .eq('is_duplicate', false)
      .limit(MAX_ARTICLES_TO_ANALYZE) as { data: SearchResultRow[] | null }

    if (!searchResults || searchResults.length === 0) {
      await supabase
        .from('screening_subjects')
        .update({ status: 'review', risk_level: 'none' } as never)
        .eq('id', subjectId)

      return NextResponse.json({
        success: true,
        articlesAnalyzed: 0,
        message: 'No articles to analyze',
      })
    }

    console.log(`Analyzing ${searchResults.length} articles for ${subject.full_name}`)

    // Quick AI analysis using snippets (much faster than fetching full content)
    const analyses = await analyzeArticlesQuick(searchResults, subject)

    // Store results
    const adminClient = createAdminClient()
    
    // Only store articles that are ACTUALLY adverse media (risk_level !== 'none')
    // Non-adverse articles should never be shown to reviewers
    const adverseAnalyses = analyses.filter(a => a.riskLevel !== 'none')

    const analysesToInsert = adverseAnalyses.map(analysis => {
      const searchResult = searchResults.find(sr => sr.result_url === analysis.url)
      return {
        search_result_id: searchResult?.id,
        subject_id: subjectId,
        article_headline: searchResult?.result_title || 'Unknown',
        article_url: analysis.url,
        ai_provider: 'openai',
        risk_category: analysis.riskCategory,
        risk_level: analysis.riskLevel,
        subject_match_confidence: analysis.matchConfidence,
        match_status: 'pending', // ALWAYS pending - human must confirm
        match_reasoning: analysis.reasoning,
        ai_summary: analysis.summary,
      }
    })

    if (analysesToInsert.length > 0) {
      await adminClient
        .from('article_analyses')
        .insert(analysesToInsert as never)
    }

    console.log(`Stored ${adverseAnalyses.length} adverse articles out of ${analyses.length} total analyzed`)

    // Calculate overall risk (only from adverse articles)
    const riskLevels = adverseAnalyses.map(a => a.riskLevel)
    const overallRisk = calculateOverallRisk(riskLevels)

    // Update subject
    await supabase
      .from('screening_subjects')
      .update({ status: 'review', risk_level: overallRisk } as never)
      .eq('id', subjectId)

    // Log audit
    await adminClient.rpc('log_audit_event' as never, {
      p_user_id: user.id,
      p_action_type: 'analysis_completed',
      p_entity_type: 'screening_subject',
      p_entity_id: subjectId,
      p_details: { articles_analyzed: analyses.length, overall_risk: overallRisk }
    } as never)

    return NextResponse.json({
      success: true,
      articlesAnalyzed: analyses.length,
      overallRisk,
      likelyMatches: analyses.filter(a => a.aiSuggestedMatch === 'likely_match').length,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}

async function analyzeArticlesQuick(
  searchResults: SearchResultRow[],
  subject: { full_name: string; date_of_birth: string | null; country: string | null; aliases: string[] | null; company_affiliation: string | null }
): Promise<AnalysisResult[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const results: AnalysisResult[] = []

  // Process in parallel batches
  for (let i = 0; i < searchResults.length; i += PARALLEL_BATCH_SIZE) {
    const batch = searchResults.slice(i, i + PARALLEL_BATCH_SIZE)
    
    const batchResults = await Promise.all(
      batch.map(article => analyzeArticleSnippet(openai, article, subject))
    )
    
    results.push(...batchResults)
  }

  return results
}

async function analyzeArticleSnippet(
  openai: OpenAI,
  article: SearchResultRow,
  subject: { full_name: string; date_of_birth: string | null; country: string | null; aliases: string[] | null; company_affiliation: string | null }
): Promise<AnalysisResult> {
  const prompt = `You are an adverse media screening analyst for a compliance team. Your job is to FLAG anything that COULD be adverse media about the subject. A human reviewer will make the final call — your job is to NOT miss anything.

SUBJECT: ${subject.full_name}
${subject.aliases?.length ? `ALIASES: ${subject.aliases.join(', ')}` : ''}
${subject.country ? `COUNTRY: ${subject.country}` : ''}
${subject.company_affiliation ? `COMPANY: ${subject.company_affiliation}` : ''}

ARTICLE:
Title: ${article.result_title || 'Unknown'}
Source: ${article.domain || 'Unknown'}
Snippet: ${article.result_snippet || 'No content'}
Category: ${article.query_category || 'General'}

RULES:
- If the article mentions ANY negative information (crime, fraud, abuse, misconduct, arrest, conviction, lawsuit, scandal, corruption, harassment, violence, theft, terrorism, sanctions, money laundering, etc.) and the name matches or could plausibly match the subject, mark it as "likely_match" with an appropriate risk level.
- Only mark as "likely_not_match" if the article is CLEARLY about a completely different person (e.g. different profession, different country, different time period that makes it impossible) or contains NO adverse information at all.
- When in doubt, ALWAYS flag it. It is better to flag a false positive than to miss real adverse media.
- Even if you're unsure whether it's the same person, if the content is adverse and the name matches, flag it as "uncertain" with the risk level based on the severity of the content.

Respond in JSON format:
{
  "suggestedMatch": "likely_match" | "likely_not_match" | "uncertain",
  "matchConfidence": 0-100,
  "riskLevel": "none" | "low" | "medium" | "high" | "critical",
  "riskCategory": "string describing the type of risk (e.g., 'fraud', 'corruption', 'sexual abuse', 'criminal conviction')",
  "summary": "one sentence summary of what the article says",
  "reasoning": "brief explanation"
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return {
      url: article.result_url,
      riskLevel: parsed.riskLevel || 'none',
      riskCategory: parsed.riskCategory || 'Unknown',
      matchConfidence: parsed.matchConfidence || 0,
      aiSuggestedMatch: parsed.suggestedMatch || 'uncertain',
      summary: parsed.summary || 'No summary',
      reasoning: parsed.reasoning || 'No reasoning',
    }
  } catch (error) {
    console.error('OpenAI analysis error:', error)
    return {
      url: article.result_url,
      riskLevel: 'none',
      riskCategory: 'Error',
      matchConfidence: 0,
      aiSuggestedMatch: 'uncertain',
      summary: 'Analysis failed',
      reasoning: 'Could not analyze this article',
    }
  }
}

function calculateOverallRisk(riskLevels: string[]): string {
  if (riskLevels.includes('critical')) return 'critical'
  if (riskLevels.includes('high')) return 'high'
  if (riskLevels.filter(r => r === 'medium').length >= 2) return 'high'
  if (riskLevels.includes('medium')) return 'medium'
  if (riskLevels.includes('low')) return 'low'
  return 'none'
}
