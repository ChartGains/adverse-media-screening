import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users,
  FileSearch,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch statistics
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  const { count: activeUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: totalScreenings } = await supabase
    .from('screening_subjects')
    .select('*', { count: 'exact', head: true })

  const { count: pendingReview } = await supabase
    .from('screening_subjects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'review')

  const { count: completedToday } = await supabase
    .from('screening_subjects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  const { count: flaggedCount } = await supabase
    .from('screening_decisions')
    .select('*', { count: 'exact', head: true })
    .eq('decision', 'flagged')

  // Recent activity - use admin client to bypass RLS for admin view
  const { data: recentActivity } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10) as { data: Array<{
      id: string
      user_email: string | null
      action_type: string
      created_at: string
    }> | null }

  // Recent screenings
  const { data: recentScreenings } = await supabase
    .from('screening_subjects')
    .select(`
      *,
      user_profiles!screening_subjects_submitted_by_fkey (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5) as { data: Array<{
      id: string
      full_name: string
      status: string
      risk_level: string | null
      created_at: string
      user_profiles: { full_name: string } | null
    }> | null }

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers || 0,
      subtitle: `${activeUsers || 0} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/admin/users',
    },
    {
      title: 'Total Screenings',
      value: totalScreenings || 0,
      subtitle: `${completedToday || 0} completed today`,
      icon: FileSearch,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/admin/screenings',
    },
    {
      title: 'Pending Review',
      value: pendingReview || 0,
      subtitle: 'Awaiting analyst review',
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      href: '/admin/screenings?status=review',
    },
    {
      title: 'Flagged Subjects',
      value: flaggedCount || 0,
      subtitle: 'Adverse media confirmed',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/admin/screenings?decision=flagged',
    },
  ]

  return (
    <>
      <Header 
        title="Admin Dashboard" 
        subtitle="System overview and monitoring"
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:border-slate-300 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.title}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                      <p className="text-sm text-slate-500 mt-1">{stat.subtitle}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <Link href="/admin/activity">
                <span className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50"
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full ${
                        activity.action_type.includes('decision') ? 'bg-emerald-500' :
                        activity.action_type.includes('review') ? 'bg-blue-500' :
                        activity.action_type.includes('search') ? 'bg-purple-500' :
                        'bg-slate-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium">{activity.user_email}</span>
                          {' '}
                          <span className="text-slate-500">
                            {activity.action_type.replace(/_/g, ' ')}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatRelativeTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Screenings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Recent Screenings
              </CardTitle>
              <Link href="/admin/screenings">
                <span className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              {recentScreenings && recentScreenings.length > 0 ? (
                <div className="space-y-3">
                  {recentScreenings.map((screening) => (
                    <Link 
                      key={screening.id}
                      href={`/dashboard/screening/${screening.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{screening.full_name}</p>
                        <p className="text-sm text-slate-500">
                          by {(screening.user_profiles as { full_name: string })?.full_name || 'Unknown'}
                          {' • '}
                          {formatRelativeTime(screening.created_at)}
                        </p>
                      </div>
                      <Badge variant={screening.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
                        {screening.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No recent screenings
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
