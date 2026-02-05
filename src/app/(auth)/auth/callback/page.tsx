'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'

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

      // For invite/recovery links, Supabase delivers tokens in the URL hash.
      // The @supabase/ssr client auto-detects hash fragments on init and
      // establishes a session. We listen for the auth state change.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            // Check if this is from an invite — user needs to set password
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

      // If no hash fragment present and no code, wait briefly then redirect
      if (!window.location.hash) {
        setTimeout(() => {
          router.push('/login?error=auth_callback_error')
        }, 2000)
      }

      return () => {
        subscription.unsubscribe()
      }
    }

    handleCallback()
  }, [searchParams, supabase, router])

  if (error) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <a href="/login" className="text-emerald-400 underline">
          Back to Login
        </a>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <Spinner size="lg" />
      <p className="text-slate-400">Completing sign in...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-slate-400">Loading...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
