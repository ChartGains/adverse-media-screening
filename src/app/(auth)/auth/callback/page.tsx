'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Shield, AlertCircle } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      // Check for code in query params (PKCE / OAuth flow)
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.push('/dashboard')
          return
        }
        setError('Failed to sign in. Please try again.')
        return
      }

      // Parse hash fragment
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params = new URLSearchParams(hash)

        // Check for error in hash (e.g. expired invite link)
        const hashError = params.get('error')
        const errorDescription = params.get('error_description')
        if (hashError) {
          const message = errorDescription
            ? errorDescription.replace(/\+/g, ' ')
            : 'The invitation link is invalid or has expired.'
          setError(message)
          return
        }

        // Handle valid tokens
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!sessionError) {
            if (type === 'invite' || type === 'recovery' || type === 'magiclink') {
              router.push('/set-password')
            } else {
              router.push('/dashboard')
            }
            return
          }

          console.error('Session error:', sessionError)
          setError('Failed to complete sign in. The link may have expired.')
          return
        }
      }

      // Fallback: listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            const isInvite = window.location.hash.includes('type=invite')
            if (isInvite) {
              router.push('/set-password')
            } else {
              router.push('/dashboard')
            }
          } else if (event === 'PASSWORD_RECOVERY') {
            router.push('/set-password')
          }
        }
      )

      // If nothing to process, redirect after timeout
      if (!window.location.hash) {
        setTimeout(() => {
          setError('No authentication data found. Please request a new invitation.')
        }, 3000)
      }

      return () => {
        subscription.unsubscribe()
      }
    }

    handleCallback()
  }, [searchParams, supabase, router])

  if (error) {
    return (
      <Card className="border-0 shadow-2xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Link Expired
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <p className="text-sm text-center text-slate-500">
            Please contact your administrator to send a new invitation.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-2xl">
      <CardContent className="py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <Spinner size="lg" />
          <p className="text-slate-500 font-medium">Completing sign in...</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 shadow-2xl">
          <CardContent className="py-12">
            <div className="flex flex-col items-center space-y-4">
              <Spinner size="lg" />
              <p className="text-slate-500">Loading...</p>
            </div>
          </CardContent>
        </Card>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
