// Search Service - Integrates SerpAPI and Google Custom Search
// Provides fallback logic between providers

import { SearchQuery, extractDomain } from './queryBuilder'

export interface SearchResult {
  url: string
  title: string
  snippet: string
  position: number
  source: 'serpapi' | 'google_cse'
  domain: string
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
  category: string
  provider: 'serpapi' | 'google_cse'
  totalResults: number
  error?: string
}

// SerpAPI Search
async function searchWithSerpApi(
  query: string,
  numResults: number = 20
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    throw new Error('SERPAPI_KEY not configured')
  }
  
  console.log('Executing SerpAPI search:', query.substring(0, 100) + '...')

  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    num: numResults.toString(),
    engine: 'google',
  })

  const response = await fetch(`https://serpapi.com/search?${params}`)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('SerpAPI response error:', response.status, errorText)
    throw new Error(`SerpAPI error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.error) {
    console.error('SerpAPI returned error:', data.error)
    throw new Error(data.error)
  }

  const organicResults = data.organic_results || []
  console.log(`SerpAPI returned ${organicResults.length} results`)
  
  return organicResults.map((result: Record<string, unknown>, index: number) => ({
    url: result.link as string,
    title: result.title as string || '',
    snippet: result.snippet as string || '',
    position: index + 1,
    source: 'serpapi' as const,
    domain: extractDomain(result.link as string),
  }))
}

// Google Custom Search API
async function searchWithGoogleCSE(
  query: string,
  numResults: number = 20
): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY
  const cx = process.env.GOOGLE_CSE_CX
  
  if (!apiKey || !cx) {
    throw new Error('Google CSE not configured')
  }

  // Google CSE only returns 10 results per request, need multiple calls
  const results: SearchResult[] = []
  const pages = Math.ceil(numResults / 10)

  for (let page = 0; page < pages; page++) {
    const start = page * 10 + 1
    const params = new URLSearchParams({
      key: apiKey,
      cx: cx,
      q: query,
      start: start.toString(),
      num: '10',
    })

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`
    )

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited, return what we have
        break
      }
      throw new Error(`Google CSE error: ${response.status}`)
    }

    const data = await response.json()
    const items = data.items || []

    items.forEach((item: Record<string, unknown>, index: number) => {
      results.push({
        url: item.link as string,
        title: item.title as string || '',
        snippet: item.snippet as string || '',
        position: start + index,
        source: 'google_cse' as const,
        domain: extractDomain(item.link as string),
      })
    })
  }

  return results
}

// Main search function with fallback
export async function executeSearch(
  searchQuery: SearchQuery,
  numResults: number = 20
): Promise<SearchResponse> {
  let results: SearchResult[] = []
  let provider: 'serpapi' | 'google_cse' = 'serpapi'
  let error: string | undefined

  // Try SerpAPI first
  try {
    results = await searchWithSerpApi(searchQuery.query, numResults)
    provider = 'serpapi'
  } catch (serpError) {
    console.error('SerpAPI failed, trying Google CSE:', serpError)
    
    // Fallback to Google CSE
    try {
      results = await searchWithGoogleCSE(searchQuery.query, numResults)
      provider = 'google_cse'
    } catch (googleError) {
      console.error('Google CSE also failed:', googleError)
      error = 'Both search providers failed'
    }
  }

  return {
    results,
    query: searchQuery.query,
    category: searchQuery.category,
    provider,
    totalResults: results.length,
    error,
  }
}

// Execute multiple searches in parallel with rate limiting
export async function executeSearchBatch(
  queries: SearchQuery[],
  maxConcurrent: number = 3,
  resultsPerQuery: number = 20
): Promise<SearchResponse[]> {
  const responses: SearchResponse[] = []
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < queries.length; i += maxConcurrent) {
    const batch = queries.slice(i, i + maxConcurrent)
    
    const batchResponses = await Promise.all(
      batch.map(q => executeSearch(q, resultsPerQuery))
    )
    
    responses.push(...batchResponses)
    
    // Small delay between batches
    if (i + maxConcurrent < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  return responses
}

// Aggregate and deduplicate results from multiple searches
export function aggregateSearchResults(
  responses: SearchResponse[]
): SearchResult[] {
  const seenUrls = new Set<string>()
  const aggregated: SearchResult[] = []

  // Sort by priority (from query category) then by position
  for (const response of responses) {
    for (const result of response.results) {
      // Normalize URL for deduplication
      const normalizedUrl = result.url.toLowerCase().replace(/\/$/, '')
      
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl)
        aggregated.push(result)
      }
    }
  }

  return aggregated
}

// Only filter out social media profiles - keep everything else
// The AI will determine relevance, not domain filtering
const EXCLUDED_DOMAINS = [
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'tiktok.com',
  'pinterest.com',
]

export function filterResults(results: SearchResult[]): SearchResult[] {
  return results.filter(result => {
    const domain = result.domain.toLowerCase()
    return !EXCLUDED_DOMAINS.some(excluded => domain.includes(excluded))
  })
}
