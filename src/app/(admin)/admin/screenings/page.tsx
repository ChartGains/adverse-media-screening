'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'
import {
  FileSearch,
  Search,
  Filter,
  ExternalLink,
  Download,
} from 'lucide-react'
import { formatDateTime, formatRelativeTime, getStatusColor } from '@/lib/utils'
import { ScreeningSubject, ScreeningStatus, RiskLevel } from '@/types/database'

interface ScreeningWithUser extends ScreeningSubject {
  user_profiles: { full_name: string } | null
}

export default function AdminScreeningsPage() {
  const supabase = createClient()
  const [screenings, setScreenings] = useState<ScreeningWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [riskFilter, setRiskFilter] = useState<string>('')

  useEffect(() => {
    loadScreenings()
  }, [])

  const loadScreenings = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('screening_subjects')
      .select(`
        *,
        user_profiles!screening_subjects_submitted_by_fkey (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    setScreenings((data || []) as ScreeningWithUser[])
    setIsLoading(false)
  }

  const filteredScreenings = screenings.filter(screening => {
    const matchesSearch = 
      screening.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screening.country.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || screening.status === statusFilter
    const matchesRisk = !riskFilter || screening.risk_level === riskFilter
    return matchesSearch && matchesStatus && matchesRisk
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Header 
        title="All Screenings" 
        subtitle={`${screenings.length} total screenings`}
      />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search by name or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="searching">Searching</option>
                <option value="analyzing">Analyzing</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="escalated">Escalated</option>
              </Select>
              <Select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-40"
              >
                <option value="">All Risk Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="none">None</option>
              </Select>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Screenings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Screenings ({filteredScreenings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Subject</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Country</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Risk</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Submitted By</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScreenings.map((screening) => (
                    <tr key={screening.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">{screening.full_name}</p>
                          <p className="text-sm text-slate-500">
                            DOB: {screening.date_of_birth}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {screening.country}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(screening.status)}>
                          {screening.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={screening.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
                          {screening.risk_level || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {screening.user_profiles?.full_name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatRelativeTime(screening.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/dashboard/screening/${screening.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <ExternalLink className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredScreenings.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No screenings found matching your filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
