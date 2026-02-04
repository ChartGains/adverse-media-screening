import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.SERPAPI_KEY

  if (!apiKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'SERPAPI_KEY not configured in environment',
      hint: 'Add SERPAPI_KEY to your .env.local file'
    }, { status: 500 })
  }

  try {
    // Make a simple test search with adverse media query
    const testQuery = '"Vaughan Roberts" fraud OR criminal'
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(testQuery)}&api_key=${apiKey}&num=5&engine=google`

    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      return NextResponse.json({ 
        success: false, 
        error: data.error,
        message: 'SerpAPI returned an error'
      }, { status: 400 })
    }

    const organicResults = data.organic_results || []
    
    return NextResponse.json({
      success: true,
      message: 'SerpAPI is working!',
      query: testQuery,
      resultsFound: organicResults.length,
      results: organicResults.slice(0, 5).map((r: Record<string, string>) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet?.substring(0, 150) + '...'
      }))
    })
  } catch (error) {
    console.error('SerpAPI test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to connect to SerpAPI'
    }, { status: 500 })
  }
}
