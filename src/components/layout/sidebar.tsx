'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Search,
  FileText,
  ClipboardCheck,
  Settings,
  Shield,
  Users,
  Activity,
  FileSearch,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/database'

interface SidebarProps {
  userRole: UserRole
  userName: string
  userEmail: string
}

const analystNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/screening/new', label: 'New Screening', icon: Search },
  { href: '/dashboard/review', label: 'Review Queue', icon: ClipboardCheck },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const adminNavItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/activity', label: 'Activity Feed', icon: Activity },
  { href: '/admin/screenings', label: 'All Screenings', icon: FileSearch },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/audit', label: 'Audit Log', icon: FileText },
]

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const isAdmin = userRole === 'admin' || userRole === 'auditor'
  const navItems = isAdmin ? adminNavItems : analystNavItems

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-slate-900">AMS Tool</span>
            {isAdmin && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}

          {/* Switch to Admin/Dashboard */}
          {userRole === 'admin' && (
            <div className="pt-4 mt-4 border-t border-slate-200">
              <Link
                href={pathname.startsWith('/admin') ? '/dashboard' : '/admin'}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                {pathname.startsWith('/admin') ? (
                  <>
                    <LayoutDashboard className="h-5 w-5" />
                    Switch to Analyst View
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    Switch to Admin Panel
                  </>
                )}
              </Link>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-sm font-medium text-slate-600">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}
