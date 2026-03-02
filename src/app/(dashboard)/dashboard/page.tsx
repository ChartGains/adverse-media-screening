import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Search,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { formatRelativeTime, getStatusColor } from '@/lib/utils'
import { ScreeningSubject } from '@/types/database'
import { ScreeningListItem } from '@/components/screening/ScreeningListItem'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's statistics
  const { data: pendingScreenings } = await supabase
    .from('screening_subjects')
    .select('*', { count: 'exact' })
    .or(`submitted_by.eq.${user?.id},assigned_to.eq.${user?.id}`)
    .eq('status', 'review') as { data: ScreeningSubject[] | null }

  const { data: completedToday } = await supabase
    .from('screening_subjects')
    .select('*', { count: 'exact' })
    .or(`submitted_by.eq.${user?.id},assigned_to.eq.${user?.id}`)
    .eq('status', 'completed')
    .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()) as { data: ScreeningSubject[] | null }

  const { data: recentScreenings } = await supabase
    .from('screening_subjects')
    .select('*')
    .or(`submitted_by.eq.${user?.id},assigned_to.eq.${user?.id}`)
    .order('created_at', { ascending: false })
    .limit(5) as { data: ScreeningSubject[] | null }

  const { data: reviewQueue } = await supabase
    .from('screening_subjects')
    .select('*')
    .eq('status', 'review')
    .or(`assigned_to.eq.${user?.id},assigned_to.is.null`)
    .order('created_at', { ascending: true })
    .limit(5) as { data: ScreeningSubject[] | null }

  const stats = [
    {
      title: 'Pending Review',
      value: pendingScreenings?.length || 0,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Completed Today',
      value: completedToday?.length || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Flagged (This Week)',
      value: 3,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Avg. Time (mins)',
      value: '4.2',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ]

  return (
    <>
      <Header 
        title="Dashboard" 
        subtitle="Welcome back! Here's your screening overview."
      />
      
      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-4">
          <Link href="/dashboard/screening/new">
            <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
              <Search className="h-4 w-4" />
              New Screening
            </Button>
          </Link>
          <Link href="/dashboard/screening/batch">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Batch Upload
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review Queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Review Queue</CardTitle>
              <Link href="/dashboard/review">
                <Button variant="ghost" size="sm" className="gap-1 text-emerald-600 hover:text-emerald-700">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {reviewQueue && reviewQueue.length > 0 ? (
                <div className="space-y-3">
                  {reviewQueue.map((screening) => (
                    <ScreeningListItem
                      key={screening.id}
                      screening={screening}
                      href={`/dashboard/review/${screening.id}`}
                      subtitle={`${screening.country} • ${formatRelativeTime(screening.created_at)}`}
                      badgeType="risk"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                  <p>No items pending review</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Screenings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Recent Screenings</CardTitle>
              <Link href="/dashboard/reports">
                <Button variant="ghost" size="sm" className="gap-1 text-emerald-600 hover:text-emerald-700">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentScreenings && recentScreenings.length > 0 ? (
                <div className="space-y-3">
                  {recentScreenings.map((screening) => (
                    <ScreeningListItem
                      key={screening.id}
                      screening={screening}
                      href={`/dashboard/screening/${screening.id}`}
                      subtitle={`${screening.country} • ${formatRelativeTime(screening.created_at)}`}
                      badgeType="status"
                      statusColor={getStatusColor(screening.status)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Search className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p>No screenings yet</p>
                  <Link href="/dashboard/screening/new">
                    <Button variant="link" className="mt-2">Start your first screening</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
