import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Handle OAuth code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle invite/recovery tokens - redirect to set password page
  if (token && type) {
    // For invite tokens, redirect to a page where user can set their password
    // The token will be in the URL hash after Supabase processes it
    if (type === 'invite' || type === 'recovery' || type === 'magiclink') {
      // Verify the token with Supabase
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'invite' | 'recovery' | 'magiclink',
      })
      
      if (!error) {
        // Token verified - user is now logged in, redirect to set password
        return NextResponse.redirect(`${origin}/set-password`)
      } else {
        console.error('Token verification error:', error)
        return NextResponse.redirect(`${origin}/login?error=invalid_token`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
