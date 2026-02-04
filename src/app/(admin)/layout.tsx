import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { UserRole } from '@/types/database'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: { role: string; full_name: string; email: string } | null }

  if (!profile || !['admin', 'auditor'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar 
        userRole={profile.role as UserRole} 
        userName={profile.full_name}
        userEmail={profile.email}
      />
      <main className="pl-64">
        {children}
      </main>
    </div>
  )
}
