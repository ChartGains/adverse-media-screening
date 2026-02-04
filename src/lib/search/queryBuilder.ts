// Search Query Builder
// Generates search queries based on the original manual adverse media screening approach

export interface SubjectInfo {
  fullName: string
  country?: string | null
  aliases?: string[]
  companyAffiliation?: string | null
}

export interface SearchQuery {
  query: string
  category: string
  priority: number
}

export interface SearchQuerySet {
  queries: SearchQuery[]
  totalExpectedResults: number
}

// The core adverse media keywords - based on the original manual search
const ADVERSE_KEYWORDS = [
  'launder', 'fraud', 'bribe', 'corrupt', 'arrest', 'blackmail', 'breach',
  'convict', 'court', 'case', 'embezz', 'extort', 'felon', 'fined', 'guilty',
  'illegal', 'impris', 'jail', 'kickback', 'litigat', 'mafi', 'murder',
  'prosecut', 'terroris', 'theft', 'unlawful', 'verdict', 'environmental crime'
]

// Generate the main adverse media query (like the manual search)
function buildAdverseMediaQuery(name: string): string {
  const keywordsString = ADVERSE_KEYWORDS.join(' OR ')
  return `"${name}" AND (${keywordsString})`
}

// Generate comprehensive search queries for a subject
export function generateSearchQueries(subject: SubjectInfo): SearchQuerySet {
  const queries: SearchQuery[] = []
  const name = subject.fullName

  // Query 1: Main adverse media query (the original manual approach)
  queries.push({
    query: buildAdverseMediaQuery(name),
    category: 'Adverse Media',
    priority: 1,
  })

  // Query 2: With country context if provided
  if (subject.country) {
    queries.push({
      query: `"${name}" ${subject.country} (crime OR criminal OR arrest OR court OR convicted OR fraud)`,
      category: 'Location Context',
      priority: 2,
    })
  }

  // Query 3: Search for each alias with adverse keywords
  if (subject.aliases && subject.aliases.length > 0) {
    subject.aliases.forEach(alias => {
      if (alias.trim()) {
        queries.push({
          query: buildAdverseMediaQuery(alias.trim()),
          category: `Alias: ${alias}`,
          priority: 2,
        })
      }
    })
  }

  // Query 4: Company association if provided
  if (subject.companyAffiliation) {
    queries.push({
      query: `"${name}" "${subject.companyAffiliation}" (fraud OR investigation OR lawsuit OR scandal)`,
      category: 'Company Association',
      priority: 3,
    })
  }

  return {
    queries: queries.sort((a, b) => a.priority - b.priority),
    totalExpectedResults: queries.length * 20,
  }
}

// Generate the original manual Boolean query format
export function generateLegacyBooleanQuery(name: string): string {
  return buildAdverseMediaQuery(name)
}

// Export keywords for reference
export const SEARCH_TERM_CATEGORIES = [
  {
    id: 'adverse_media',
    name: 'Adverse Media Keywords',
    terms: ADVERSE_KEYWORDS.map(term => ({ term, variations: [] })),
    riskWeight: 5,
  }
]

// Deduplicate URLs from search results
export function deduplicateUrls(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.filter(url => {
    const normalized = normalizeUrl(url)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    urlObj.searchParams.delete('utm_source')
    urlObj.searchParams.delete('utm_medium')
    urlObj.searchParams.delete('utm_campaign')
    urlObj.searchParams.delete('ref')
    urlObj.hostname = urlObj.hostname.replace(/^www\./, '')
    return urlObj.toString().replace(/\/$/, '')
  } catch {
    return url.toLowerCase()
  }
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function isReputableSource(url: string): boolean {
  const domain = extractDomain(url)
  const reputable = [
    'bbc.com', 'bbc.co.uk', 'reuters.com', 'theguardian.com', 'nytimes.com',
    'telegraph.co.uk', 'independent.co.uk', 'dailymail.co.uk', 'mirror.co.uk',
    'express.co.uk', 'sky.com', 'itv.com', 'channel4.com', 'ft.com',
    'bloomberg.com', 'wsj.com', 'washingtonpost.com', 'cnn.com', 'foxnews.com',
    'apnews.com', 'afp.com', 'aljazeera.com', 'dw.com', 'france24.com',
  ]
  return reputable.some(d => domain.includes(d))
}
