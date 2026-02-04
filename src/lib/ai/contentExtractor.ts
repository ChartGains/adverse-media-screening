// Content Extractor Service
// Extracts article content from URLs for AI analysis

export interface ExtractedContent {
  url: string
  title: string
  content: string
  publishedDate?: string
  author?: string
  siteName?: string
  success: boolean
  error?: string
}

// Simple content extraction using fetch and HTML parsing
export async function extractContent(url: string): Promise<ExtractedContent> {
  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AdverseMediaScreener/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()

    // Extract content using regex patterns
    const title = extractTitle(html)
    const content = extractMainContent(html)
    const publishedDate = extractPublishedDate(html)
    const author = extractAuthor(html)
    const siteName = extractSiteName(html, url)

    return {
      url,
      title,
      content,
      publishedDate,
      author,
      siteName,
      success: true,
    }
  } catch (error) {
    return {
      url,
      title: '',
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Extract title from HTML
function extractTitle(html: string): string {
  // Try og:title first
  const ogMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/)
  if (ogMatch) return decodeHtmlEntities(ogMatch[1])

  // Try Twitter title
  const twitterMatch = html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"/)
  if (twitterMatch) return decodeHtmlEntities(twitterMatch[1])

  // Try regular title tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (titleMatch) return decodeHtmlEntities(titleMatch[1])

  return ''
}

// Extract main article content
function extractMainContent(html: string): string {
  // Remove script and style tags
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // Try to find article content
  let content = ''

  // Try article tag
  const articleMatch = cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) {
    content = articleMatch[1]
  } else {
    // Try main tag
    const mainMatch = cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch) {
      content = mainMatch[1]
    } else {
      // Try common content div patterns
      const contentMatch = cleanHtml.match(/<div[^>]*class="[^"]*(?:article|content|post|entry|story)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      if (contentMatch) {
        content = contentMatch[1]
      } else {
        // Fall back to body
        const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        if (bodyMatch) {
          content = bodyMatch[1]
        }
      }
    }
  }

  // Extract paragraphs
  const paragraphs: string[] = []
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let match

  while ((match = pRegex.exec(content)) !== null) {
    const text = stripHtmlTags(match[1]).trim()
    if (text.length > 50) {
      paragraphs.push(text)
    }
  }

  // If no paragraphs found, just strip all tags
  if (paragraphs.length === 0) {
    return stripHtmlTags(content)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000)
  }

  return paragraphs.join('\n\n').slice(0, 10000)
}

// Extract published date
function extractPublishedDate(html: string): string | undefined {
  // Try various meta tags
  const patterns = [
    /<meta[^>]*property="article:published_time"[^>]*content="([^"]*)">/i,
    /<meta[^>]*name="date"[^>]*content="([^"]*)">/i,
    /<meta[^>]*name="pubdate"[^>]*content="([^"]*)">/i,
    /<time[^>]*datetime="([^"]*)"[^>]*>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      return match[1].split('T')[0] // Return just the date part
    }
  }

  return undefined
}

// Extract author
function extractAuthor(html: string): string | undefined {
  const patterns = [
    /<meta[^>]*name="author"[^>]*content="([^"]*)">/i,
    /<meta[^>]*property="article:author"[^>]*content="([^"]*)">/i,
    /<a[^>]*rel="author"[^>]*>([^<]*)<\/a>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      return decodeHtmlEntities(match[1])
    }
  }

  return undefined
}

// Extract site name
function extractSiteName(html: string, url: string): string {
  const ogMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)">/i)
  if (ogMatch) {
    return decodeHtmlEntities(ogMatch[1])
  }

  // Fall back to domain name
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return ''
  }
}

// Strip HTML tags
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

// Batch extract content from multiple URLs
export async function extractContentBatch(
  urls: string[],
  maxConcurrent: number = 5
): Promise<ExtractedContent[]> {
  const results: ExtractedContent[] = []

  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent)
    
    const batchResults = await Promise.all(
      batch.map(url => extractContent(url))
    )
    
    results.push(...batchResults)
    
    // Small delay between batches
    if (i + maxConcurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return results
}
