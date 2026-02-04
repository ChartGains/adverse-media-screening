import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { generateSearchQueries } from '@/lib/search/queryBuilder'
import { executeSearchBatch, aggregateSearchResults, filterResults } from '@/lib/search/searchService'

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
    const { data: subject, error: subjectError } = await supabase
      .from('screening_subjects')
      .select('*')
      .eq('id', subjectId)
      .single() as { data: { full_name: string; country: string | null; aliases: string[] | null; company_affiliation: string | null } | null; error: unknown }

    if (subjectError || !subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Update status to searching
    await supabase
      .from('screening_subjects')
      .update({ status: 'searching' } as never)
      .eq('id', subjectId)

    // Generate search queries
    const querySet = generateSearchQueries({
      fullName: subject.full_name,
      country: subject.country,
      aliases: subject.aliases || undefined,
      companyAffiliation: subject.company_affiliation || undefined,
    })

    // Execute searches
    const searchResponses = await executeSearchBatch(querySet.queries, 3, 20)

    // Aggregate and filter results
    const allResults = aggregateSearchResults(searchResponses)
    const filteredResults = filterResults(allResults)

    // Store results in database
    const adminClient = createAdminClient()
    
    const resultsToInsert = filteredResults.map(result => ({
      subject_id: subjectId,
      query_used: result.title, // Store query info
      query_category: searchResponses.find(r => 
        r.results.some(res => res.url === result.url)
      )?.category || 'General',
      source: result.source,
      result_url: result.url,
      result_title: result.title,
      result_snippet: result.snippet,
      result_position: result.position,
      domain: result.domain,
    }))

    if (resultsToInsert.length > 0) {
      await adminClient
        .from('search_results')
        .insert(resultsToInsert as never)
    }

    // Update subject with counts
    await supabase
      .from('screening_subjects')
      .update({
        search_queries_count: querySet.queries.length,
        articles_found_count: filteredResults.length,
        status: 'analyzing',
      } as never)
      .eq('id', subjectId)

    // Log audit event
    await adminClient.rpc('log_audit_event' as never, {
      p_user_id: user.id,
      p_action_type: 'search_executed',
      p_entity_type: 'screening_subject',
      p_entity_id: subjectId,
      p_details: {
        queries_count: querySet.queries.length,
        results_count: filteredResults.length,
      }
    } as never)

    return NextResponse.json({
      success: true,
      queriesExecuted: querySet.queries.length,
      resultsFound: filteredResults.length,
      uniqueUrls: filteredResults.length,
    })
  } catch (error) {
    console.error('Search execution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
