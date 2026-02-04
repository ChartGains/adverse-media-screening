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
import {
  FileText,
  Search,
  Download,
  Filter,
  Calendar,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { AuditLog } from '@/types/database'

export default function AuditLogPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setIsLoading(true)
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data } = await query

    setLogs(data || [])
    setIsLoading(false)
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesEntity = !entityFilter || log.entity_type === entityFilter
    return matchesSearch && matchesEntity
  })

  const exportLogs = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details']
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.created_at,
        log.user_email || '',
        log.user_role || '',
        log.action_type,
        log.entity_type,
        log.entity_id || '',
        JSON.stringify(log.details).replace(/,/g, ';'),
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

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
        title="Audit Log" 
        subtitle="Complete system audit trail for compliance"
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
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-48"
              >
                <option value="">All Entity Types</option>
                <option value="screening_subject">Screening Subject</option>
                <option value="review">Review</option>
                <option value="screening_decision">Decision</option>
                <option value="user_profile">User Profile</option>
              </Select>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36"
                  placeholder="From"
                />
                <span className="text-slate-400">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36"
                  placeholder="To"
                />
              </div>
              <Button onClick={loadLogs} variant="secondary">
                Apply Filters
              </Button>
              <Button onClick={exportLogs} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Trail ({filteredLogs.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Timestamp</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">User</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Entity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900">
                          {log.user_email || 'System'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {log.user_role || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">
                          {log.action_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-slate-600">{log.entity_type}</span>
                          {log.entity_id && (
                            <p className="text-xs text-slate-400 font-mono truncate max-w-[100px]">
                              {log.entity_id}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {JSON.stringify(log.details).slice(0, 50)}
                          {JSON.stringify(log.details).length > 50 && '...'}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No audit logs found matching your filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
