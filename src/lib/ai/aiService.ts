// AI Service - Integrates Claude and OpenAI for content analysis
// Provides fallback logic between providers

import { RiskLevel } from '@/types/database'
import { SEARCH_TERM_CATEGORIES, getCategoryByTerm } from '../search/keywords'

export interface ArticleContent {
  url: string
  title: string
  content: string
  snippet?: string
}

export interface SubjectContext {
  fullName: string
  dateOfBirth: string
  country: string
  aliases?: string[]
  companyAffiliation?: string
}

export interface AnalysisResult {
  riskCategory: string | null
  riskLevel: RiskLevel
  subjectMatchConfidence: number // 0-100
  matchStatus: 'matched' | 'excluded' | 'uncertain'
  matchReasoning: string
  summary: string
  keyFindings: string[]
  entitiesExtracted: {
    people: string[]
    organizations: string[]
    locations: string[]
    dates: string[]
  }
  aiProvider: 'claude' | 'openai'
  processingTimeMs: number
}

// Analysis prompt template
function buildAnalysisPrompt(article: ArticleContent, subject: SubjectContext): string {
  return `You are an expert compliance analyst specializing in adverse media screening. Analyze the following article to determine if it contains adverse media about the subject being screened.

SUBJECT BEING SCREENED:
- Full Name: ${subject.fullName}
- Date of Birth: ${subject.dateOfBirth}
- Country: ${subject.country}
${subject.aliases?.length ? `- Known Aliases: ${subject.aliases.join(', ')}` : ''}
${subject.companyAffiliation ? `- Company Affiliation: ${subject.companyAffiliation}` : ''}

ARTICLE TO ANALYZE:
Title: ${article.title}
URL: ${article.url}
Content:
${article.content.slice(0, 6000)}

ANALYSIS REQUIREMENTS:
1. Determine if this article is about the SAME PERSON as the subject (not just someone with a similar name)
2. If it IS about the subject, classify the adverse media category
3. Assess the risk level based on the severity of the content
4. Extract key information and entities

RISK CATEGORIES (in order of severity):
- Financial Crimes (fraud, embezzlement, money laundering, bribery)
- Violent Crimes (murder, assault, kidnapping)
- Organized Crime (trafficking, cartels, racketeering)
- Terrorism & Security (terrorism, sanctions violations)
- Sexual Offenses (assault, harassment)
- Legal/Criminal Proceedings (arrests, convictions, prosecutions)
- Regulatory Actions (fines, bans, violations)
- Civil/Business Issues (lawsuits, bankruptcy)
- Reputational/Ethical (scandals, controversies)
- Environmental Crimes (pollution, illegal dumping)
- Cyber Crimes (hacking, data breaches)

RESPOND IN THIS EXACT JSON FORMAT:
{
  "subjectMatch": {
    "isMatch": boolean,
    "confidence": number (0-100),
    "reasoning": "explanation of why this is/isn't the same person"
  },
  "adverseMedia": {
    "detected": boolean,
    "category": "category name or null",
    "riskLevel": "none" | "low" | "medium" | "high" | "critical",
    "summary": "brief summary of adverse content if detected",
    "keyFindings": ["finding 1", "finding 2"]
  },
  "entities": {
    "people": ["name1", "name2"],
    "organizations": ["org1", "org2"],
    "locations": ["loc1", "loc2"],
    "dates": ["date1", "date2"]
  }
}

IMPORTANT:
- Be conservative with subject matching - only mark as "isMatch: true" if you are confident it's the same person
- Consider age, location, and context when determining if it's a match
- A name match alone is NOT sufficient - many people share names
- If uncertain, set isMatch to false and explain in reasoning`
}

// Analyze with Claude API
async function analyzeWithClaude(
  article: ArticleContent,
  subject: SubjectContext
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const startTime = Date.now()
  const prompt = buildAnalysisPrompt(article, subject)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const content = data.content[0].text

  // Parse JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse Claude response')
  }

  const parsed = JSON.parse(jsonMatch[0])
  const processingTime = Date.now() - startTime

  return {
    riskCategory: parsed.adverseMedia.category,
    riskLevel: parsed.adverseMedia.riskLevel as RiskLevel,
    subjectMatchConfidence: parsed.subjectMatch.confidence,
    matchStatus: parsed.subjectMatch.isMatch
      ? 'matched'
      : parsed.subjectMatch.confidence > 30
      ? 'uncertain'
      : 'excluded',
    matchReasoning: parsed.subjectMatch.reasoning,
    summary: parsed.adverseMedia.summary || 'No adverse content detected',
    keyFindings: parsed.adverseMedia.keyFindings || [],
    entitiesExtracted: parsed.entities || {
      people: [],
      organizations: [],
      locations: [],
      dates: [],
    },
    aiProvider: 'claude',
    processingTimeMs: processingTime,
  }
}

// Analyze with OpenAI API
async function analyzeWithOpenAI(
  article: ArticleContent,
  subject: SubjectContext
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const startTime = Date.now()
  const prompt = buildAnalysisPrompt(article, subject)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert compliance analyst. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content

  const parsed = JSON.parse(content)
  const processingTime = Date.now() - startTime

  return {
    riskCategory: parsed.adverseMedia.category,
    riskLevel: parsed.adverseMedia.riskLevel as RiskLevel,
    subjectMatchConfidence: parsed.subjectMatch.confidence,
    matchStatus: parsed.subjectMatch.isMatch
      ? 'matched'
      : parsed.subjectMatch.confidence > 30
      ? 'uncertain'
      : 'excluded',
    matchReasoning: parsed.subjectMatch.reasoning,
    summary: parsed.adverseMedia.summary || 'No adverse content detected',
    keyFindings: parsed.adverseMedia.keyFindings || [],
    entitiesExtracted: parsed.entities || {
      people: [],
      organizations: [],
      locations: [],
      dates: [],
    },
    aiProvider: 'openai',
    processingTimeMs: processingTime,
  }
}

// Main analysis function with fallback
export async function analyzeArticle(
  article: ArticleContent,
  subject: SubjectContext
): Promise<AnalysisResult> {
  // Try Claude first
  try {
    return await analyzeWithClaude(article, subject)
  } catch (claudeError) {
    console.error('Claude analysis failed, trying OpenAI:', claudeError)
    
    // Fallback to OpenAI
    try {
      return await analyzeWithOpenAI(article, subject)
    } catch (openaiError) {
      console.error('OpenAI also failed:', openaiError)
      
      // Return a default "uncertain" result
      return {
        riskCategory: null,
        riskLevel: 'none',
        subjectMatchConfidence: 0,
        matchStatus: 'uncertain',
        matchReasoning: 'AI analysis failed - manual review required',
        summary: 'Unable to analyze article content automatically',
        keyFindings: [],
        entitiesExtracted: {
          people: [],
          organizations: [],
          locations: [],
          dates: [],
        },
        aiProvider: 'claude',
        processingTimeMs: 0,
      }
    }
  }
}

// Analyze multiple articles in batch
export async function analyzeArticleBatch(
  articles: ArticleContent[],
  subject: SubjectContext,
  maxConcurrent: number = 2
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = []
  
  // Process in batches to respect rate limits
  for (let i = 0; i < articles.length; i += maxConcurrent) {
    const batch = articles.slice(i, i + maxConcurrent)
    
    const batchResults = await Promise.all(
      batch.map(article => analyzeArticle(article, subject))
    )
    
    results.push(...batchResults)
    
    // Delay between batches
    if (i + maxConcurrent < articles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}

// Determine overall risk level from multiple analyses
export function calculateOverallRisk(analyses: AnalysisResult[]): RiskLevel {
  const matchedAnalyses = analyses.filter(a => a.matchStatus === 'matched')
  
  if (matchedAnalyses.length === 0) {
    return 'none'
  }
  
  const riskPriority: Record<RiskLevel, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    none: 1,
  }
  
  let maxRisk: RiskLevel = 'none'
  
  for (const analysis of matchedAnalyses) {
    if (riskPriority[analysis.riskLevel] > riskPriority[maxRisk]) {
      maxRisk = analysis.riskLevel
    }
  }
  
  return maxRisk
}
