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
  Activity,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { AuditLog } from '@/types/database'

export default function ActivityPage() {
  const supabase = createClient()
  const [activities, setActivities] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('')

  useEffect(() => {
    loadActivities()
    
    // Set up realtime subscription
    const channel = supabase
      .channel('audit_logs_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setActivities(prev => [payload.new as AuditLog, ...prev].slice(0, 100))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadActivities = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    setActivities(data || [])
    setIsLoading(false)
  }

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.action_type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAction = !actionFilter || activity.action_type.includes(actionFilter)
    return matchesSearch && matchesAction
  })

  const getActionColor = (action: string): string => {
    if (action.includes('decision_cleared')) return 'bg-green-100 text-green-700'
    if (action.includes('decision_flagged')) return 'bg-red-100 text-red-700'
    if (action.includes('decision')) return 'bg-emerald-100 text-emerald-700'
    if (action.includes('review')) return 'bg-blue-100 text-blue-700'
    if (action.includes('search')) return 'bg-purple-100 text-purple-700'
    if (action.includes('analysis')) return 'bg-cyan-100 text-cyan-700'
    if (action.includes('screening')) return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-700'
  }

  const formatActionType = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
        title="Activity Feed" 
        subtitle="Real-time view of all user activity"
      />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search by user or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-48"
              >
                <option value="">All Actions</option>
                <option value="screening">Screenings</option>
                <option value="search">Searches</option>
                <option value="analysis">Analyses</option>
                <option value="review">Reviews</option>
                <option value="decision">Decisions</option>
              </Select>
              <Button variant="outline" onClick={loadActivities} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
              <Badge variant="secondary" className="ml-2">{filteredActivities.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className={`mt-1 h-3 w-3 rounded-full ${
                    activity.action_type.includes('decision') ? 'bg-emerald-500' :
                    activity.action_type.includes('review') ? 'bg-blue-500' :
                    activity.action_type.includes('search') ? 'bg-purple-500' :
                    activity.action_type.includes('analysis') ? 'bg-cyan-500' :
                    'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">
                        {activity.user_email || 'System'}
                      </span>
                      <Badge className={getActionColor(activity.action_type)}>
                        {formatActionType(activity.action_type)}
                      </Badge>
                      {activity.user_role && (
                        <Badge variant="outline" className="text-xs">
                          {activity.user_role}
                        </Badge>
                      )}
                    </div>
                    {activity.details && Object.keys(activity.details as object).length > 0 && (
                      <p className="text-sm text-slate-600 mt-1">
                        {JSON.stringify(activity.details)}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDateTime(activity.created_at)} ({formatRelativeTime(activity.created_at)})
                    </p>
                  </div>
                </div>
              ))}

              {filteredActivities.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No activity found matching your filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
