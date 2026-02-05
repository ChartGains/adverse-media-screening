'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // If the URL has hash fragments (from Supabase invite/recovery links),
  // redirect to the client-side callback page which can process them
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      router.replace('/auth/callback' + window.location.hash)
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (data.user) {
        // Fetch user profile to determine redirect
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role, is_active')
          .eq('id', data.user.id)
          .single() as { data: { role: string; is_active: boolean } | null; error: unknown }

        // If profile not found, user might be new - redirect to dashboard
        if (profileError || !profile) {
          console.log('Profile fetch error or not found, redirecting to dashboard')
          router.push('/dashboard')
          router.refresh()
          return
        }

        // Check if account is explicitly deactivated
        if (profile.is_active === false) {
          await supabase.auth.signOut()
          setError('Your account has been deactivated. Please contact an administrator.')
          return
        }

        // Update last active timestamp
        await supabase
          .from('user_profiles')
          .update({ last_active_at: new Date().toISOString() } as never)
          .eq('id', data.user.id)

        // Redirect based on role
        if (profile.role === 'admin' || profile.role === 'auditor') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-center justify-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Adverse Media Screening
          </CardTitle>
          <CardDescription className="text-slate-500 mt-2">
            Sign in to access the compliance screening platform
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" required>Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" required>Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-center text-slate-500">
            Protected system. Unauthorized access is prohibited.
            <br />
            All activity is logged and monitored.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
